import { Db, ObjectId } from 'mongodb';
import {
  sendFamilyMatchEmail,
  sendProposalReceivedEmail,
  sendProposalApprovedEmail,
  sendProposalRejectedEmail,
  sendProposalDeclinedEmail,
  sendProposalWithdrawnEmail,
  sendChatExpiredEmail,
  type FamilyMatchCandidate,
} from '../utils/email';
import { sendSmsBatch } from '../utils/sms';
import { logAudit } from '../db/auditLogs';

const PARTY_FIELDS = { name: 1, email: 1, phone: 1 };

async function loadParties(db: Db, proposal: any): Promise<{ initiator: any; recipient: any } | null> {
  const [initiator, recipient] = await Promise.all([
    db.collection('profiles').findOne({ _id: proposal.initiatorId }, { projection: PARTY_FIELDS }),
    db.collection('profiles').findOne({ _id: proposal.recipientId }, { projection: PARTY_FIELDS }),
  ]);
  if (!initiator || !recipient) return null;
  return { initiator, recipient };
}

/**
 * Proposal created (staff pre-screen model) → it enters the staff review queue.
 * Per the chosen "dashboard-only" policy we don't email staff; this records an
 * audit entry so the queue arrival is traceable. (Swap in an email to a
 * STAFF_NOTIFY_EMAIL here if that policy changes.)
 */
export async function notifyStaffNewProposal(db: Db, proposal: any): Promise<void> {
  try {
    await logAudit(
      'system', 'system', 'staff',
      'proposal_queued_for_review', 'proposal', proposal._id?.toString() || 'unknown',
      'New proposal awaiting staff review',
      { type: proposal.type, initiatorId: proposal.initiatorId?.toString(), recipientId: proposal.recipientId?.toString() }
    );
    console.log(`🗂️  Proposal ${proposal._id} queued for staff review`);
  } catch (e) {
    console.error('❌ notifyStaffNewProposal:', e instanceof Error ? e.message : e);
  }
}

/**
 * Staff approved (or staff proposal created) → proposal is now visible to the
 * recipient, who must accept/decline. Notify the recipient only.
 */
export async function notifyProposalVisibleToRecipient(db: Db, proposal: any): Promise<void> {
  try {
    const parties = await loadParties(db, proposal);
    if (!parties) return;
    const { initiator, recipient } = parties;
    if (recipient.email) await sendProposalReceivedEmail(recipient.email, recipient.name || 'Applicant', initiator.name || 'a member');
    await sendSmsBatch([recipient.phone], `Intikhab-e-Zauj: You have a new proposal from ${initiator.name || 'a member'}. Open the app to accept or decline.`);
  } catch (e) {
    console.error('❌ notifyProposalVisibleToRecipient:', e instanceof Error ? e.message : e);
  }
}

/** Recipient accepted → chat opens immediately. Notify both participants. */
export async function notifyChatOpened(db: Db, proposal: any): Promise<void> {
  try {
    const parties = await loadParties(db, proposal);
    if (!parties) return;
    const { initiator, recipient } = parties;
    await Promise.all([
      initiator.email ? sendProposalApprovedEmail(initiator.email, initiator.name || 'Applicant', recipient.name || 'your match') : Promise.resolve(false),
      recipient.email ? sendProposalApprovedEmail(recipient.email, recipient.name || 'Applicant', initiator.name || 'your match') : Promise.resolve(false),
    ]);
    await sendSmsBatch([initiator.phone, recipient.phone], `Intikhab-e-Zauj: Your proposal is confirmed. A private chat is open for 48 hours.`);
  } catch (e) {
    console.error('❌ notifyChatOpened:', e instanceof Error ? e.message : e);
  }
}

/** Staff rejected the proposal → notify the initiator. */
export async function notifyProposalRejected(db: Db, proposal: any, reason?: string): Promise<void> {
  try {
    const parties = await loadParties(db, proposal);
    if (!parties) return;
    const { initiator, recipient } = parties;
    if (initiator.email) await sendProposalRejectedEmail(initiator.email, initiator.name || 'Applicant', recipient.name || 'your match', reason);
    await sendSmsBatch([initiator.phone], `Intikhab-e-Zauj: Your proposal was reviewed and not taken forward. Open the app to explore other matches.`);
  } catch (e) {
    console.error('❌ notifyProposalRejected:', e instanceof Error ? e.message : e);
  }
}

/** Recipient declined the proposal → notify the initiator. */
export async function notifyProposalDeclined(db: Db, proposal: any): Promise<void> {
  try {
    const parties = await loadParties(db, proposal);
    if (!parties) return;
    const { initiator, recipient } = parties;
    if (initiator.email) await sendProposalDeclinedEmail(initiator.email, initiator.name || 'Applicant', recipient.name || 'your match');
    await sendSmsBatch([initiator.phone], `Intikhab-e-Zauj: Your proposal was not accepted. Open the app to explore other matches.`);
  } catch (e) {
    console.error('❌ notifyProposalDeclined:', e instanceof Error ? e.message : e);
  }
}

/** Initiator withdrew the proposal → notify the recipient. */
export async function notifyProposalWithdrawn(db: Db, proposal: any): Promise<void> {
  try {
    if (proposal.type !== 'USER_PROPOSAL') return; // staff proposals have no pending recipient
    const parties = await loadParties(db, proposal);
    if (!parties) return;
    const { initiator, recipient } = parties;
    if (recipient.email) await sendProposalWithdrawnEmail(recipient.email, recipient.name || 'Applicant', initiator.name || 'a member');
    await sendSmsBatch([recipient.phone], `Intikhab-e-Zauj: A proposal sent to you has been withdrawn. No action needed.`);
  } catch (e) {
    console.error('❌ notifyProposalWithdrawn:', e instanceof Error ? e.message : e);
  }
}

/** Chat window expired without mutual interest. Notify both participants. */
export async function notifyChatExpired(db: Db, proposal: any): Promise<void> {
  try {
    const parties = await loadParties(db, proposal);
    if (!parties) return;
    const { initiator, recipient } = parties;
    await Promise.all([
      initiator.email ? sendChatExpiredEmail(initiator.email, initiator.name || 'Applicant', recipient.name || 'your match') : Promise.resolve(false),
      recipient.email ? sendChatExpiredEmail(recipient.email, recipient.name || 'Applicant', initiator.name || 'your match') : Promise.resolve(false),
    ]);
    await sendSmsBatch([initiator.phone, recipient.phone], `Intikhab-e-Zauj: Your 48-hour chat window has closed. Contact staff to continue.`);
  } catch (e) {
    console.error('❌ notifyChatExpired:', e instanceof Error ? e.message : e);
  }
}

const CANDIDATE_FIELDS = {
  name: 1, age: 1, city: 1, caste: 1, profession: 1, education: 1,
  phone: 1, email: 1, fatherName: 1, fatherMobile: 1, motherMobile: 1,
};

function toCandidate(p: any): FamilyMatchCandidate {
  return {
    name: p?.name, age: p?.age, city: p?.city, caste: p?.caste,
    profession: p?.profession, education: p?.education,
    phone: p?.phone, email: p?.email,
    fatherName: p?.fatherName, fatherMobile: p?.fatherMobile, motherMobile: p?.motherMobile,
  };
}

/** Best-effort lookup of the match score for a pair (either direction). */
async function findPairScore(db: Db, a: ObjectId, b: ObjectId): Promise<number | undefined> {
  const m = await db.collection('matches').findOne({
    $or: [
      { userId: a, candidateId: b },
      { userId: b, candidateId: a },
    ],
  });
  if (!m) return undefined;
  return (m.scoreBreakdown?.total ?? m.score) as number | undefined;
}

/**
 * Notify both applicants (email) and their families (SMS) once a proposal is
 * mutually completed. Idempotent — guarded by proposal.familyEmail.sent.
 * Never throws; logs and aggregates results.
 */
export async function notifyFamilyOnCompletion(db: Db, proposal: any): Promise<void> {
  try {
    if (!proposal || proposal.familyEmail?.sent) return;

    const initId = proposal.initiatorId as ObjectId;
    const recId = proposal.recipientId as ObjectId;

    const [initiator, recipient] = await Promise.all([
      db.collection('profiles').findOne({ _id: initId }, { projection: CANDIDATE_FIELDS }),
      db.collection('profiles').findOne({ _id: recId }, { projection: CANDIDATE_FIELDS }),
    ]);
    if (!initiator || !recipient) {
      console.warn('⚠️ notifyFamilyOnCompletion: missing profile(s), skipping');
      return;
    }

    const score = await findPairScore(db, initId, recId);
    const staffNotes = proposal.notes || proposal.matchNotes || proposal.justification || undefined;
    const compatibilityReason = proposal.compatibilityReason || undefined;
    const matchMeta = { score, staffNotes, compatibilityReason };

    // Email each applicant about the OTHER party
    const emailResults = await Promise.all([
      initiator.email
        ? sendFamilyMatchEmail(initiator.email, initiator.name || 'Applicant', toCandidate(recipient), matchMeta)
        : Promise.resolve(false),
      recipient.email
        ? sendFamilyMatchEmail(recipient.email, recipient.name || 'Applicant', toCandidate(initiator), matchMeta)
        : Promise.resolve(false),
    ]);

    // SMS family mobiles of BOTH sides (de-duped inside the batch)
    const smsMessage =
      `Intikhab-e-Zauj: A mutual match has been confirmed for ` +
      `${initiator.name || 'your family member'} & ${recipient.name || 'their match'}. ` +
      `Our staff will contact you with the details. (Staff-facilitated match)`;
    const smsResults = await sendSmsBatch(
      [initiator.fatherMobile, initiator.motherMobile, recipient.fatherMobile, recipient.motherMobile],
      smsMessage
    );

    const now = new Date();
    await db.collection('proposals').updateOne(
      { _id: proposal._id },
      { $set: { 'familyEmail.sent': true, 'familyEmail.sentAt': now, updatedAt: now } }
    );

    const emailsSent = emailResults.filter(Boolean).length;
    const smsSent = smsResults.filter(r => r.sent).length;
    console.log(`📨 Family notify for proposal ${proposal._id}: ${emailsSent} email(s), ${smsSent}/${smsResults.length} SMS`);

    await logAudit(
      'system', 'system', 'staff',
      'notify_family', 'proposal', proposal._id.toString(),
      'Mutual match — family notified',
      { emailsSent, smsAttempted: smsResults.length, smsSent, score: score ?? null }
    );
  } catch (error) {
    // Notification failure must never break the proposal flow
    console.error('❌ notifyFamilyOnCompletion error:', error instanceof Error ? error.message : error);
  }
}
