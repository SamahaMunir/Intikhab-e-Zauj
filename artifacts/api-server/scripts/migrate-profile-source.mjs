/**
 * One-off migration: backfill `registeredBy` on existing profiles, and switch
 * staff-created profiles to paymentStatus 'waived' (collected offline).
 *
 * Rule:
 *   profile.source ∈ STAFF_SOURCES  → registeredBy='staff', paymentStatus='waived'
 *   otherwise                       → registeredBy='self'  (payment untouched)
 *
 * Usage:
 *   DATABASE_URL="mongodb://127.0.0.1:27017" node scripts/migrate-profile-source.mjs [--dry]
 * Idempotent: only writes where the field is missing/incorrect.
 */
import { MongoClient } from 'mongodb';

const URI = process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017';
const DB = process.env.DB_NAME || 'intikhab_dev';
const DRY = process.argv.includes('--dry');
const STAFF_SOURCES = ['staff_entry', 'paper', 'whatsapp', 'walkin', 'referral', 'phone'];

const run = async () => {
  const client = new MongoClient(URI);
  await client.connect();
  const col = client.db(DB).collection('profiles');
  console.log(`migrate-profile-source${DRY ? ' (DRY RUN)' : ''} → ${DB}.profiles\n`);

  const staffFilter = { source: { $in: STAFF_SOURCES }, $or: [{ registeredBy: { $ne: 'staff' } }, { paymentStatus: { $ne: 'waived' } }] };
  const selfFilter = { source: { $nin: STAFF_SOURCES }, registeredBy: { $exists: false } };

  const staffCount = await col.countDocuments(staffFilter);
  const selfCount = await col.countDocuments(selfFilter);

  if (!DRY) {
    await col.updateMany(staffFilter, { $set: { registeredBy: 'staff', paymentStatus: 'waived', updatedAt: new Date() } });
    await col.updateMany(selfFilter, { $set: { registeredBy: 'self', updatedAt: new Date() } });
  }

  console.log(`  staff-created → registeredBy='staff', paymentStatus='waived' : ${staffCount}${DRY ? ' (would update)' : ' updated'}`);
  console.log(`  self-registered → registeredBy='self'                        : ${selfCount}${DRY ? ' (would update)' : ' updated'}`);
  console.log(`\n${DRY ? 'Would update' : 'Updated'} ${staffCount + selfCount} profile(s).`);
  await client.close();
};

run().catch(e => { console.error('migration failed:', e); process.exit(1); });
