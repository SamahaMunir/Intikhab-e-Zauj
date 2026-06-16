import { Db } from 'mongodb';
import { notifyFamilyOnCompletion, notifyChatExpired } from './notifications';

/**
 * Sweep approved proposals whose 48h chat window has elapsed.
 * Both interested → completed (+ family notify). Otherwise → expired (+ notify).
 * Idempotent and self-contained — safe to run on an interval (cron).
 */
export async function sweepExpiredChats(db: Db): Promise<{ completed: number; expired: number }> {
  const now = new Date();
  let completed = 0;
  let expired = 0;

  const due = await db.collection('proposals').find({
    status: 'approved',
    'chat.status': 'open',
    'chat.closesAt': { $lte: now },
  }).toArray();

  for (const p of due) {
    const both = !!(p.mutualInterest?.initiatorInterested && p.mutualInterest?.recipientInterested);
    if (both) {
      await db.collection('proposals').updateOne(
        { _id: p._id },
        { $set: { status: 'completed', completedAt: now, 'chat.status': 'closed', updatedAt: now } }
      );
      await notifyFamilyOnCompletion(db, { ...p, status: 'completed', completedAt: now });
      completed++;
    } else {
      await db.collection('proposals').updateOne(
        { _id: p._id },
        { $set: { status: 'expired', 'chat.status': 'expired', updatedAt: now } }
      );
      await notifyChatExpired(db, { ...p, status: 'expired' });
      expired++;
    }
  }

  if (completed || expired) {
    console.log(`🧹 Proposal sweep: ${completed} completed, ${expired} expired`);
  }
  return { completed, expired };
}

let timer: NodeJS.Timeout | null = null;

/** Start the periodic sweep (default every 5 minutes). Runs once immediately. */
export function startProposalSweeper(db: Db, intervalMs = 5 * 60 * 1000): void {
  if (timer) return;
  const tick = () => { sweepExpiredChats(db).catch(e => console.error('❌ Proposal sweep error:', e)); };
  tick();
  timer = setInterval(tick, intervalMs);
  console.log(`✓ Proposal expiry sweeper started (every ${Math.round(intervalMs / 60000)} min)`);
}

export function stopProposalSweeper(): void {
  if (timer) { clearInterval(timer); timer = null; }
}
