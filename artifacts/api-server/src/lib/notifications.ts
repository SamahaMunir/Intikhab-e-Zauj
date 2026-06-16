import { Db, ObjectId } from 'mongodb';
import { sendFamilyMatchEmail, type FamilyMatchCandidate } from '../utils/email';
import { sendSmsBatch } from '../utils/sms';
import { logAudit } from '../db/auditLogs';

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
