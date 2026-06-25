/**
 * Clean up stale family-stage history + migrate completedAt semantics.
 *  1. Delete orphaned proposals (a profile was deleted) and E2E test rows.
 *  2. For surviving family_proposal_stage docs, move the (mis-set) completedAt
 *     into familyStageAt — completedAt now means "staff concluded as completed".
 * Usage: DATABASE_URL=... node scripts/cleanup-family-stage.mjs [--dry]
 */
import { MongoClient } from 'mongodb';
const URI = process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017';
const DB = process.env.DB_NAME || 'intikhab_dev';
const DRY = process.argv.includes('--dry');

const run = async () => {
  const c = new MongoClient(URI); await c.connect();
  const db = c.db(DB);
  const props = db.collection('proposals');
  const prof = db.collection('profiles');
  console.log(`cleanup-family-stage${DRY ? ' (DRY)' : ''} → ${DB}\n`);

  const all = await props.find({}).toArray();
  const orphanIds = [];
  for (const p of all) {
    const [i, r] = await Promise.all([
      p.initiatorId ? prof.findOne({ _id: p.initiatorId }, { projection: { _id: 1 } }) : null,
      p.recipientId ? prof.findOne({ _id: p.recipientId }, { projection: { _id: 1 } }) : null,
    ]);
    const orphan = !i || !r;
    const e2e = p.message === 'E2E test proposal';
    if (orphan || e2e) orphanIds.push(p._id);
  }
  console.log(`  orphaned / E2E proposals to delete: ${orphanIds.length}`);

  const fsToMigrate = await props.countDocuments({
    status: 'family_proposal_stage',
    completedAt: { $exists: true },
    familyStageAt: { $exists: false },
    _id: { $nin: orphanIds },
  });
  console.log(`  family-stage docs to migrate completedAt→familyStageAt: ${fsToMigrate}`);

  if (!DRY) {
    if (orphanIds.length) await props.deleteMany({ _id: { $in: orphanIds } });
    // rename completedAt → familyStageAt for active family-stage docs
    const toFix = await props.find({
      status: 'family_proposal_stage', completedAt: { $exists: true }, familyStageAt: { $exists: false },
    }).toArray();
    for (const p of toFix) {
      await props.updateOne({ _id: p._id }, { $set: { familyStageAt: p.completedAt }, $unset: { completedAt: '' } });
    }
    console.log(`\n  deleted ${orphanIds.length}, migrated ${toFix.length}.`);
  }
  await c.close();
};
run().catch(e => { console.error(e); process.exit(1); });
