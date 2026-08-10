/**
 * One-off cleanup: remove TEST profiles created during development, plus their
 * matches / proposals / messages / counselling. Leaves the real CSV-imported
 * data (enteredBy:'import-script') and all staff/admin accounts untouched.
 *
 * "Test profile" = a profile that is NOT from the CSV import AND is not a
 * staff/admin account (i.e. a self-registration or manual test entry made while
 * building the site, before launch).
 *
 * SAFE BY DEFAULT: dry-run unless you pass --delete.
 *
 * Usage (from artifacts/api-server):
 *   node scripts/cleanup-test-profiles.mjs            # preview (dry run)
 *   node scripts/cleanup-test-profiles.mjs --delete   # actually delete
 * Reads DATABASE_URL from .env / .env.local automatically.
 */
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const URI = process.env.DATABASE_URL;
const DB = process.env.DB_NAME || 'intikhab_dev';
const APPLY = process.argv.includes('--delete');

if (!URI) {
  console.error('✗ DATABASE_URL not set (check .env.local). Aborting.');
  process.exit(1);
}

const run = async () => {
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db(DB);

  console.log(`cleanup-test-profiles${APPLY ? ' (DELETE)' : ' (DRY RUN)'} → ${DB}\n`);

  // Test profiles: not imported from a CSV, and not a staff/admin account.
  const filter = {
    enteredBy: { $ne: 'import-script' },
    role: { $nin: ['staff', 'admin'] },
  };

  const profiles = await db.collection('profiles')
    .find(filter, { projection: { name: 1, email: 1, gender: 1, source: 1, enteredBy: 1, createdAt: 1 } })
    .sort({ createdAt: 1 })
    .toArray();

  console.log(`Test profiles found: ${profiles.length}`);
  for (const p of profiles) {
    const when = p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : '—';
    console.log(`  • ${p.name || '(no name)'}  <${p.email || 'no-email'}>  [${p.gender || '?'}]  src=${p.source || '?'} entered=${p.enteredBy || '?'}  ${when}`);
  }

  if (!profiles.length) {
    console.log('\nNothing to do.');
    await client.close();
    return;
  }

  const ids = profiles.map((p) => p._id);
  const pairFilter = { $or: [{ userId: { $in: ids } }, { candidateId: { $in: ids } }] };
  const propFilter = { $or: [{ initiatorId: { $in: ids } }, { recipientId: { $in: ids } }] };

  const matches = await db.collection('matches').countDocuments(pairFilter);
  const proposals = await db.collection('proposals').find(propFilter, { projection: { _id: 1 } }).toArray();
  const propIds = proposals.map((p) => p._id);
  const messages = propIds.length
    ? await db.collection('messages').countDocuments({ proposalId: { $in: propIds } })
    : 0;
  const counselling = await db.collection('counselling').countDocuments({ profileId: { $in: ids } });

  console.log(`\nCascade — related records that will also be removed:`);
  console.log(`  matches:     ${matches}`);
  console.log(`  proposals:   ${proposals.length}`);
  console.log(`  messages:    ${messages}`);
  console.log(`  counselling: ${counselling}`);

  if (!APPLY) {
    console.log('\n(dry run — nothing deleted. Re-run with --delete to apply.)');
    await client.close();
    return;
  }

  if (matches) await db.collection('matches').deleteMany(pairFilter);
  if (messages) await db.collection('messages').deleteMany({ proposalId: { $in: propIds } });
  if (propIds.length) await db.collection('proposals').deleteMany({ _id: { $in: propIds } });
  if (counselling) await db.collection('counselling').deleteMany({ profileId: { $in: ids } });
  const r = await db.collection('profiles').deleteMany({ _id: { $in: ids } });

  console.log(`\n✓ Deleted ${r.deletedCount} test profile(s) and their related records.`);
  await client.close();
};

run().catch((e) => { console.error('cleanup failed:', e); process.exit(1); });
