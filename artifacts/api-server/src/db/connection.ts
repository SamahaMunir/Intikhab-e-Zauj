import { MongoClient } from 'mongodb';

let cachedClient: MongoClient | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.DATABASE_URL;
  
  if (!uri) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  if (cachedClient) {
    return cachedClient;
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✓ Connected to MongoDB Atlas');
    cachedClient = client;
    return client;
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error);
    throw error;
  }
}

export async function getDatabase() {
  const client = await getMongoClient();
  return client.db('intikhab_dev');
}

export async function closeMongoClient() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    console.log('✓ MongoDB connection closed');
  }
}