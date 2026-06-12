import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartproject';
const client = new MongoClient(uri);

let db: Db;

export async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Successfully connected to MongoDB');
    db = client.db();
    return db;
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    throw err;
  }
}

export { db, client };
