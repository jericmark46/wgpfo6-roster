import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'family_roster';
const collectionName = process.env.COLLECTION_NAME || 'members';

if (!uri) {
  throw new Error('MONGODB_URI is missing. Check the backend .env file.');
}

let client;
let db;

export async function connectDB() {
  if (db) return db;

  client = new MongoClient(uri, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 15000,
  });

  await client.connect();
  db = client.db(dbName);
  console.log(`MongoDB connected: ${dbName}.${collectionName}`);
  return db;
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
}
