import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const dbName = process.env.DB_NAME || 'family_roster';
const collectionName = process.env.COLLECTION_NAME || 'members';
const isServerless = process.env.VERCEL === '1';

let client;
let db;
let connecting;

export async function connectDB() {
  if (db) return db;
  if (connecting) return connecting;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is missing. Set it in the environment variables.');
  }

  connecting = (async () => {
    client = new MongoClient(uri, {
      maxPoolSize: 20,
      minPoolSize: isServerless ? 0 : 2,
      serverSelectionTimeoutMS: isServerless ? 8000 : 15000,
    });

    await client.connect();
    db = client.db(dbName);
    console.log(`MongoDB connected: ${dbName}.${collectionName}`);
    return db;
  })();

  try {
    return await connecting;
  } catch (error) {
    client = undefined;
    throw error;
  } finally {
    connecting = undefined;
  }
}

export function getDB() {
  if (!db) throw new Error('Database is not connected yet.');
  return db;
}

export function getCollection() {
  return getDB().collection(collectionName);
}

export function getHouseholdsCollection() {
  return getDB().collection(process.env.HOUSEHOLDS_COLLECTION || 'households');
}

export function collectionNames() {
  return {
    members: collectionName,
    households: process.env.HOUSEHOLDS_COLLECTION || 'households',
  };
}

export async function closeDB() {
  if (client) await client.close();
  client = undefined;
  db = undefined;
  connecting = undefined;
}
