/**
 * One-off migration: consolidate the `staff` collection INTO `profiles`.
 *
 * After this, staff/admin users live in the shared `profiles` collection
 * (role ∈ ['staff','admin']) — a single source of truth for all users. The code
 * in src/db/staff.ts already reads/writes staff via `profiles`; this script moves
 * the existing rows so logins keep working.
 *
 * SAFE: additive only. Each staff doc is copied with its ORIGINAL _id preserved
 * (so issued tokens / audit references stay valid). The `staff` collection is NOT
 * dropped — keep it as a backup, drop it manually once you've verified.
 *
 * Usage (run from artifacts/api-server):
 *   node scripts/migrate-staff-to-profiles.mjs --dry   # preview, no writes
 *   node scripts/migrate-staff-to-profiles.mjs         # apply
 *
 * Reads DATABASE_URL from .env / .env.local automatically. Idempotent: a staff
 * email already present in profiles is skipped.
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
  const staffCol = db.collection('staff');
  const profilesCol = db.collection('profiles');

  console.log(`migrate-staff-to-profiles${DRY ? ' (DRY RUN)' : ''} → ${DB}\n`);

  const staffDocs = await staffCol.find({}).toArray();
  console.log(`Found ${staffDocs.length} doc(s) in 'staff'.`);

  let migrated = 0;
  let skipped = 0;
  let conflicts = 0;

  for (const doc of staffDocs) {
    const existing = await profilesCol.findOne({ email: doc.email });
    if (existing) {
      skipped++;
      console.log(`  skip  ${doc.email} — already in profiles (role: ${existing.role || 'n/a'})`);
      continue;
    }

    const newDoc = {
      ...doc, // preserves _id, password, status, inviteToken, etc.
      role: doc.role || 'staff',
      source: doc.source || 'staff_entry',
      registeredBy: 'staff',
      // helpful defaults so a staff row is well-formed in the shared collection
      emailVerified: doc.emailVerified ?? true,
      active: doc.active ?? (doc.status === 'active'),
      migratedFrom: 'staff',
      migratedAt: new Date(),
    };

    if (DRY) {
      migrated++;
      console.log(`  would migrate  ${doc.email} (role: ${newDoc.role}, _id preserved)`);
      continue;
    }

    try {
      await profilesCol.insertOne(newDoc);
      migrated++;
      console.log(`  migrated  ${doc.email} (role: ${newDoc.role})`);
    } catch (e) {
      conflicts++;
      console.error(`  CONFLICT  ${doc.email} — ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log(
    `\n${DRY ? 'Would migrate' : 'Migrated'}: ${migrated} | skipped (already present): ${skipped}` +
      (conflicts ? ` | conflicts: ${conflicts}` : '')
  );
  if (!DRY) {
    console.log(
      "\nVerify staff login + Staff list, then (optionally) drop the old collection:\n" +
        `  db.staff.renameCollection('staff_backup')   // or drop once confident`
    );
  }
  await client.close();
};

run().catch((e) => { console.error('migration failed:', e); process.exit(1); });
