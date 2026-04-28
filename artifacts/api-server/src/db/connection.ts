import { MongoClient, type Db } from "mongodb";
import { logger } from "../lib/logger";

const MONGODB_URI = process.env["MONGODB_URI"] ?? "";
const DB_NAME = process.env["MONGODB_DB_NAME"] ?? "intikhab_dev";

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;

export async function connectToDatabase(): Promise<Db> {
  if (isConnected && db) {
    return db;
  }

  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI environment variable is required but was not provided.",
    );
  }

  client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10,
  });

  await client.connect();
  db = client.db(DB_NAME);
  isConnected = true;

  logger.info({ database: DB_NAME }, "Connected to MongoDB");

  return db;
}

export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    isConnected = false;
    logger.info("MongoDB connection closed");
  }
}

export function getDatabaseStatus(): boolean {
  return isConnected;
}

export async function pingDatabase(): Promise<boolean> {
  try {
    if (!client) {
      return false;
    }
    await client.db("admin").command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
