import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { getMongoClient, getDatabase } from './db/connection';

// Load .env from project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const app = express();

app.get('/health', async (req, res) => {
  try {
    const db = await getDatabase();
    const ping = await db.admin().ping();
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: String(error),
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});