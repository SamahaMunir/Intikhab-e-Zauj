/**
 * One-off cleanup: delete matches that pair a staff/admin ACCOUNT with anyone.
 *
 * After staff were consolidated into the `profiles` collection, older match
 * generation mistook staff accounts (registeredBy:'staff', source:'staff_entry')
 * for matchable people and created bogus matches. The code now excludes
 * role ∈ ['staff','admin']; this removes the already-generated bad rows.
 *
 * Usage (from artifacts/api-server):
 *   node scripts/cleanup-staff-account-matches.mjs --dry   # preview
 *   node scripts/cleanup-staff-account-matches.mjs         # apply
 * Reads DATABASE_URL from .env / .env.local automatically.
 */
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const URI = process.env.DATABASE_URL;
const DB = process.env.DB_NAME || 'intikhab_dev';
const DRY = process.argv.includes('--dry');

if (!URI) {
  console.error('✗ DATABASE_URL not set (check .env.local). Aborting.');
  process.exit(1);
}

const run = async () => {
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db(DB);

  console.log(`cleanup-staff-account-matches${DRY ? ' (DRY RUN)' : ''} → ${DB}\n`);

  const staff = await db.collection('profiles')
    .find({ role: { $in: ['staff', 'admin'] } }, { projection: { _id: 1 } })
    .toArray();
  const ids = staff.map((s) => s._id);
  console.log(`Staff/admin accounts: ${ids.length}`);

  if (!ids.length) {
    console.log('Nothing to do.');
    await client.close();
    return;
  }

  const filter = { $or: [{ userId: { $in: ids } }, { candidateId: { $in: ids } }] };
  const count = await db.collection('matches').countDocuments(filter);
  console.log(`Matches involving a staff/admin account: ${count}`);

  if (!DRY && count) {
    const r = await db.collection('matches').deleteMany(filter);
    console.log(`Deleted ${r.deletedCount} match(es).`);
  } else if (DRY) {
    console.log('(dry run — nothing deleted)');
  }

  await client.close();
};

run().catch((e) => { console.error('cleanup failed:', e); process.exit(1); });
