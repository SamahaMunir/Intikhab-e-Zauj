/**
 * One-off migration: old proposal statuses → staff pre-screen model (v3).
 *
 * Policy (chosen): RE-SCREEN. Active in-flight proposals are routed back to
 * staff review under the new model. Terminal states are renamed. Each migrated
 * doc keeps `legacyStatus` so the change is auditable / reversible.
 *
 * Usage:
 *   DATABASE_URL="mongodb://127.0.0.1:27017" node scripts/migrate-proposal-statuses.mjs
 *   add --dry to preview without writing.
 *
 * Safe to re-run: docs already on a new status are skipped.
 */
import { MongoClient } from 'mongodb';

const URI = process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017';
const DB = process.env.DB_NAME || 'intikhab_dev';
const DRY = process.argv.includes('--dry');

// old → new. Active (pre-terminal) user proposals go back to staff review.
const MAP = {
  pending_recipient: 'pending_staff_review', // old: visible to recipient pre-staff → re-screen
  pending_staff:     'pending_staff_review', // old: recipient accepted, awaiting staff → re-screen
  approved:          'chat_active',
  completed:         'family_proposal_stage',
  rejected:          'rejected_by_staff',
  declined:          'declined_by_recipient',
  closed:            'completed',
  // unchanged names (listed for clarity; no-op): withdrawn, expired
};

const run = async () => {
  const client = new MongoClient(URI);
  await client.connect();
  const col = client.db(DB).collection('proposals');

  console.log(`migrate-proposal-statuses${DRY ? ' (DRY RUN)' : ''} → ${DB}.proposals @ ${URI.replace(/\/\/[^@]*@/, '//***@')}\n`);

  let total = 0;
  for (const [oldStatus, newStatus] of Object.entries(MAP)) {
    const filter = { status: oldStatus };
    const count = await col.countDocuments(filter);
    if (!count) { console.log(`  ${oldStatus.padEnd(20)} → ${newStatus.padEnd(22)} : 0`); continue; }
    if (!DRY) {
      // Set legacyStatus only if not already recorded (idempotent re-runs).
      await col.updateMany(filter, [
        { $set: { legacyStatus: { $ifNull: ['$legacyStatus', '$status'] }, status: newStatus, updatedAt: new Date() } },
      ]);
    }
    total += count;
    console.log(`  ${oldStatus.padEnd(20)} → ${newStatus.padEnd(22)} : ${count}${DRY ? ' (would migrate)' : ' migrated'}`);
  }

  // Report anything left on an unrecognised status (manual review).
  const known = [
    ...Object.values(MAP), 'pending_staff_review', 'pending_recipient', 'mutual_interest_confirmed',
    'chat_active', 'family_proposal_stage', 'completed', 'expired', 'rejected_by_staff',
    'declined_by_recipient', 'withdrawn',
  ];
  const stray = await col.distinct('status', { status: { $nin: known } });
  if (stray.length) console.log(`\n⚠ unrecognised statuses still present: ${stray.join(', ')}`);

  console.log(`\n${DRY ? 'Would migrate' : 'Migrated'} ${total} proposal(s).`);
  await client.close();
};

run().catch(e => { console.error('migration failed:', e); process.exit(1); });
