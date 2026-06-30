import { MongoClient, type Db } from 'mongodb';

let cachedClient: MongoClient | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  if (cachedClient) {
    return cachedClient;
  }

  // Retry with exponential backoff — a transient DNS/network blip on startup
  // should not crash the process. Capped delay, bounded attempts.
  const maxRetries = parseInt(process.env.DB_CONNECT_RETRIES || '5', 10);
  const baseDelayMs = parseInt(process.env.DB_CONNECT_BASE_DELAY_MS || '1000', 10);
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const client = new MongoClient(uri);
    try {
      await client.connect();
      await client.db('intikhab_dev').command({ ping: 1 });
      console.log(`✓ Connected to MongoDB Atlas (attempt ${attempt}/${maxRetries})`);
      cachedClient = client;
      return client;
    } catch (error) {
      lastError = error;
      await client.close().catch(() => {});
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`✗ MongoDB connect attempt ${attempt}/${maxRetries} failed: ${msg}`);
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), 30000);
        console.log(`  ↻ retrying in ${delay}ms…`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw new Error(
    `MongoDB connection failed after ${maxRetries} attempts: ` +
      (lastError instanceof Error ? lastError.message : String(lastError))
  );
}

export async function getDatabase(): Promise<Db> {
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