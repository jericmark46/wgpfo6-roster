import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const APPEND = process.argv.includes('--append');
const BATCH_SIZE = 10000;
const DATA_FILE = path.join(__dirname, 'data', 'members.ndjson');
const COLLECTION = process.env.COLLECTION_NAME || 'members';
const HOUSEHOLDS = process.env.HOUSEHOLDS_COLLECTION || 'households';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function insertBatch(collection, batch) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await collection.insertMany(batch, { ordered: false });
      return;
    } catch (error) {
      if (error.code !== 16500 && (error.code !== 112 || !error.writeErrors?.length)) {
        throw error;
      }
      if (attempt === 5) throw error;
      console.warn(`Retrying batch after transient write error (attempt ${attempt})...`);
      await sleep(1000 * attempt);
    }
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing from backend/.env');

  const client = new MongoClient(uri, { maxPoolSize: 20 });
  await client.connect();

  const db = client.db(process.env.DB_NAME || 'family_roster');
  const members = db.collection(COLLECTION);
  const households = db.collection(HOUSEHOLDS);

  if (!APPEND) {
    console.log('Dropping existing collections for a clean import...');
    await Promise.all([
      members.drop().catch(() => {}),
      households.drop().catch(() => {}),
    ]);
  }

  const householdMap = new Map();
  const lineReader = createInterface({
    input: createReadStream(DATA_FILE, { encoding: 'utf8', highWaterMark: 1 << 20 }),
    crlfDelay: Infinity,
  });

  let batch = [];
  let inserted = 0;
  const startedAt = Date.now();

  for await (const line of lineReader) {
    if (!line.trim()) continue;

    const row = JSON.parse(line);
    batch.push({
      ...row,
      birthdate: row.birthdate ? new Date(`${row.birthdate}T00:00:00.000Z`) : null,
      full_name: [row.first_name, row.middle_name, row.last_name, row.ext_name]
        .filter(Boolean)
        .join(' '),
    });

    const existing = householdMap.get(row.hh_id);
    if (existing) {
      existing.member_count += 1;
    } else {
      householdMap.set(row.hh_id, {
        hh_id: row.hh_id,
        member_count: 1,
        province: row.province,
        municipality: row.municipality,
        barangay: row.barangay,
      });
    }

    if (batch.length >= BATCH_SIZE) {
      await insertBatch(members, batch);
      inserted += batch.length;
      batch = [];
      if (inserted % 100000 === 0) {
        const rate = Math.round(inserted / ((Date.now() - startedAt) / 1000));
        console.log(`Inserted ${inserted.toLocaleString()} members (${rate.toLocaleString()}/s)`);
      }
    }
  }

  if (batch.length) {
    await insertBatch(members, batch);
    inserted += batch.length;
  }

  console.log(`Inserted ${inserted.toLocaleString()} members total.`);

  const householdDocs = [...householdMap.values()];
  for (let i = 0; i < householdDocs.length; i += BATCH_SIZE) {
    await insertBatch(households, householdDocs.slice(i, i + BATCH_SIZE));
  }
  console.log(`Inserted ${householdDocs.length.toLocaleString()} households.`);

  console.log('Creating indexes...');
  await Promise.all([
    members.createIndex({ hh_id: 1 }, { name: 'hh_id_1' }),
    members.createIndex({ first_name: 1 }, { name: 'first_name_1' }),
    members.createIndex({ middle_name: 1 }, { name: 'middle_name_1' }),
    members.createIndex({ last_name: 1 }, { name: 'last_name_1' }),
    members.createIndex({ province: 1 }, { name: 'province_1' }),
    members.createIndex({ municipality: 1 }, { name: 'municipality_1' }),
    members.createIndex({ barangay: 1 }, { name: 'barangay_1' }),
    members.createIndex(
      {
        first_name: 'text',
        middle_name: 'text',
        last_name: 'text',
        province: 'text',
        municipality: 'text',
        barangay: 'text',
        hh_id: 'text',
        full_name: 'text',
      },
      { name: 'roster_text', language: 'none' },
    ),
    households.createIndex({ hh_id: 1 }, { name: 'hh_id_1', unique: true }),
    households.createIndex(
      { province: 1, municipality: 1, barangay: 1 },
      { name: 'location_1' },
    ),
  ]);

  console.log('Indexes ready.');
  console.log(`Import finished in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  await client.close();
}

main().catch((error) => {
  console.error('Import failed:', error);
  process.exit(1);
});
