/**
 * One-time patch: replace all external photo URLs in seed profiles
 * with inline SVG data URIs — no network dependency, no CORS issues.
 *
 * Run: node patch-photos.mjs
 */

import { webcrypto } from 'crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local first (takes priority), then .env
for (const file of ['.env.local', '.env']) {
  try {
    const env = readFileSync(join(__dirname, file), 'utf8');
    for (const line of env.split('\n')) {
      const [k, ...vs] = line.split('=');
      const key = k?.trim();
      if (key && vs.length && !process.env[key]) {
        process.env[key] = vs.join('=').trim().replace(/^"|"$/g, '');
      }
    }
  } catch {}
}

// Strip any invalid query params (e.g. ?Intikhab-e-Zauj=Cluster0) from URI
const rawUri    = process.env.DATABASE_URL || 'mongodb://localhost:27017';
const MONGO_URI = rawUri.replace(/\?.*$/, '');  // remove query string
const DB_NAME   = 'intikhab_dev';

function generateSeedPhoto(name, gender) {
  const parts    = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const bg       = gender === 'female' ? '#BE185D' : '#1D4ED8';
  const ring     = gender === 'female' ? '#F9A8D4' : '#93C5FD';
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">',
    `<circle cx="60" cy="60" r="60" fill="${bg}"/>`,
    `<circle cx="60" cy="60" r="56" fill="none" stroke="${ring}" stroke-width="2" opacity="0.4"/>`,
    `<text x="60" y="76" text-anchor="middle" font-size="40" font-family="Arial,Helvetica,sans-serif" font-weight="700" fill="white" letter-spacing="2">${initials}</text>`,
    '</svg>',
  ].join('');
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  console.log('Connected to MongoDB');

  const db       = client.db(DB_NAME);
  const profiles = db.collection('profiles');

  // Match any profile with an external URL that isn't Cloudinary or already a data URI
  // Diagnostic
  const total  = await profiles.countDocuments({});
  const withPhoto = await profiles.countDocuments({ photo: { $exists: true } });
  const withData  = await profiles.countDocuments({ photo: /^data:/ });
  const withHttp  = await profiles.countDocuments({ photo: /^https?:/ });
  console.log(`  total=${total}  withPhoto=${withPhoto}  dataURI=${withData}  http=${withHttp}`);

  const cursor = profiles.find({ photo: /^https?:/ });
  let updated  = 0;
  let skipped  = 0;

  for await (const doc of cursor) {
    const photo = doc.photo || '';
    // Skip already-patched (data URI) and Cloudinary (user-uploaded)
    if (photo.startsWith('data:') || photo.includes('cloudinary.com')) {
      skipped++;
      continue;
    }
    const newPhoto = generateSeedPhoto(doc.name || 'U N', doc.gender || 'male');
    await profiles.updateOne({ _id: doc._id }, { $set: { photo: newPhoto } });
    console.log(`  ✓ ${doc.name} (${doc.gender}) → SVG data URI`);
    updated++;
  }

  console.log(`\n✅ Done. Updated: ${updated}  Skipped: ${skipped}`);
  await client.close();
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
