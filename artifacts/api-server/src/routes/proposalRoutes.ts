import express, { Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection';
import { logAudit } from '../db/auditLogs';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import {
  createProposalDocument,
  CHAT_WINDOW_MS,
  type ProposalType,
  type Proposal,
} from '../db/proposals-schema';
import { createMessageDocument, MAX_MESSAGE_LEN } from '../db/messages-schema';
import {
  notifyFamilyOnCompletion,
  notifyProposalCreated,
  notifyProposalApproved,
  notifyChatExpired,
} from '../lib/notifications';

// ── helpers ───────────────────────────────────────────────────────────────────
function getId(id: string | string[] | undefined): string | null {
  if (!id) return null;
  if (Array.isArray(id)) return id[0] || null;
  return id;
}

function toObjectId(id: string | null): ObjectId | null {
  if (!id) return null;
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

// Non-terminal statuses — an active proposal already exists between a pair
const ACTIVE_STATUSES = ['pending_recipient', 'pending_staff', 'approved'];

const PROFILE_PROJECTION = {
  name: 1, age: 1, dob: 1, city: 1, gender: 1, caste: 1,
  profession: 1, education: 1, photo: 1, height: 1, source: 1,
};

async function enrichProposal(db: any, p: any) {
  const [initiator, recipient] = await Promise.all([
    db.collection('profiles').findOne({ _id: p.initiatorId }, { projection: PROFILE_PROJECTION }),
    db.collection('profiles').findOne({ _id: p.recipientId }, { projection: PROFILE_PROJECTION }),
  ]);
  return { ...p, initiator, recipient };
}

/** Is this account a participant (initiator/recipient/creator) or staff? */
function canAccess(req: AuthRequest, p: Proposal): boolean {
  const role = req.user?.role;
  if (role === 'staff' || role === 'admin') return true;
  const uid = req.user?.id;
  if (!uid) return false;
  return (
    p.createdBy?.toString() === uid ||
    p.initiatorId?.toString() === uid ||
    p.recipientId?.toString() === uid
  );
}

/** Which side of the proposal is this account? null if not a direct participant. */
function participantSide(req: AuthRequest, p: any): 'initiator' | 'recipient' | null {
  const uid = req.user?.id;
  if (!uid) return null;
  if (p.initiatorId?.toString() === uid) return 'initiator';
  if (p.recipientId?.toString() === uid) return 'recipient';
  return null;
}

/**
 * Lazily settle an approved proposal whose 48h chat window has elapsed.
 * Both-interested → completed; otherwise → expired. Persists + returns the
 * up-to-date proposal doc.
 */
async function settleExpiry(db: any, p: any): Promise<any> {
  if (p.status !== 'approved' || p.chat?.status !== 'open') return p;
  const closesAt = p.chat?.closesAt ? new Date(p.chat.closesAt) : null;
  if (!closesAt || closesAt.getTime() > Date.now()) return p;

  const now = new Date();
  const bothInterested = !!(p.mutualInterest?.initiatorInterested && p.mutualInterest?.recipientInterested);
  const next = bothInterested
    ? { status: 'completed', completedAt: now, 'chat.status': 'closed', updatedAt: now }
    : { status: 'expired', 'chat.status': 'expired', updatedAt: now };

  await db.collection('proposals').updateOne({ _id: p._id }, { $set: next });
  const updated = {
    ...p,
    status: next.status,
    completedAt: (next as any).completedAt ?? p.completedAt,
    chat: { ...p.chat, status: next['chat.status'] },
    updatedAt: now,
  };
  // Window elapsed: completed (both interested) → notify families; else expired → notify both
  if (bothInterested) await notifyFamilyOnCompletion(db, updated);
  else await notifyChatExpired(db, updated);
  return updated;
}

// ════════════════════════════════════════════════════════════════════════════
// USER ROUTER — mounted at /api/proposals (authMiddleware)
// ════════════════════════════════════════════════════════════════════════════
export const userProposalRouter = express.Router();

/**
 * POST /api/proposals
 * Create a proposal.
 *   USER_PROPOSAL  → status pending_recipient (recipient must accept).
 *   STAFF_PROPOSAL → status approved, chat open 48h (skips accept + review).
 */
userProposalRouter.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, matchId, initiatorId, recipientId, message, matchNotes, compatibilityReason, notes, justification, questionResponses } = req.body || {};

    if (type !== 'USER_PROPOSAL' && type !== 'STAFF_PROPOSAL') {
      res.status(400).json({ success: false, error: 'type must be USER_PROPOSAL or STAFF_PROPOSAL' });
      return;
    }

    // Only staff/admin may create STAFF_PROPOSAL (internal pairing)
    const role = req.user!.role;
    if (type === 'STAFF_PROPOSAL' && role !== 'staff' && role !== 'admin') {
      res.status(403).json({ success: false, error: 'Only staff can create a staff proposal' });
      return;
    }

    const initOid = toObjectId(getId(initiatorId));
    const recipOid = toObjectId(getId(recipientId));
    if (!initOid || !recipOid) {
      res.status(400).json({ success: false, error: 'Valid initiatorId and recipientId required' });
      return;
    }
    if (initOid.equals(recipOid)) {
      res.status(400).json({ success: false, error: 'initiator and recipient must differ' });
      return;
    }

    const db = await getDatabase();
    const profiles = db.collection('profiles');

    const [initiator, recipient] = await Promise.all([
      profiles.findOne({ _id: initOid }),
      profiles.findOne({ _id: recipOid }),
    ]);
    if (!initiator || !recipient) {
      res.status(404).json({ success: false, error: 'initiator or recipient profile not found' });
      return;
    }

    // Block duplicate active proposal between the same two profiles (either direction)
    const existing = await db.collection('proposals').findOne({
      status: { $in: ACTIVE_STATUSES },
      $or: [
        { initiatorId: initOid, recipientId: recipOid },
        { initiatorId: recipOid, recipientId: initOid },
      ],
    });
    if (existing) {
      res.status(409).json({ success: false, error: 'An active proposal already exists between these profiles', proposalId: existing._id.toString() });
      return;
    }

    const doc = createProposalDocument({
      type: type as ProposalType,
      matchId: toObjectId(getId(matchId)) || undefined,
      initiatorId: initOid,
      recipientId: recipOid,
      createdBy: toObjectId(req.user!.id) || initOid,
      createdByRole: role as 'applicant' | 'staff' | 'admin',
      message, matchNotes, compatibilityReason, notes, justification,
      questionResponses: Array.isArray(questionResponses) ? questionResponses : undefined,
    });

    const result = await db.collection('proposals').insertOne(doc);

    // Notify recipient (USER_PROPOSAL needs their acceptance) — never throws
    await notifyProposalCreated(db, { ...doc, _id: result.insertedId });

    await logAudit(
      req.user!.email, req.user!.id, (role as any),
      'create_proposal', 'proposal', result.insertedId.toString(),
      type === 'STAFF_PROPOSAL' ? (justification || 'Staff pairing') : (message || 'User proposal'),
      { type, initiatorId: initOid.toString(), recipientId: recipOid.toString(), status: doc.status }
    );

    res.status(201).json({ success: true, proposalId: result.insertedId.toString(), proposal: { ...doc, _id: result.insertedId } });
  } catch (error) {
    console.error('❌ Create proposal error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

/**
 * GET /api/proposals?role=initiator|recipient|all
 * List proposals the current account participates in.
 */
userProposalRouter.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const uid = req.user!.id;
    const oid = toObjectId(uid);
    const roleFilter = (getId(req.query.role as string | string[] | undefined) || 'all').toLowerCase();

    const db = await getDatabase();

    let query: any;
    const isStaff = req.user!.role === 'staff' || req.user!.role === 'admin';
    if (isStaff && roleFilter === 'all') {
      query = {}; // staff "all" = every proposal
    } else {
      const ids = oid ? [oid, uid] : [uid];
      if (roleFilter === 'initiator') query = { initiatorId: { $in: ids } };
      else if (roleFilter === 'recipient') query = { recipientId: { $in: ids } };
      else query = { $or: [{ initiatorId: { $in: ids } }, { recipientId: { $in: ids } }, { createdBy: { $in: ids } }] };
    }

    const raw = await db.collection('proposals').find(query).sort({ createdAt: -1 }).limit(200).toArray();
    const proposals = await Promise.all(raw.map((p) => enrichProposal(db, p)));

    res.json({ success: true, total: proposals.length, proposals });
  } catch (error) {
    console.error('❌ List proposals error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

/** GET /api/proposals/:id */
userProposalRouter.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const oid = toObjectId(getId(req.params.id));
    if (!oid) {
      res.status(400).json({ success: false, error: 'Invalid proposal id' });
      return;
    }
    const db = await getDatabase();
    const p = await db.collection('proposals').findOne({ _id: oid });
    if (!p) {
      res.status(404).json({ success: false, error: 'Proposal not found' });
      return;
    }
    if (!canAccess(req, p as any)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }
    const settled = await settleExpiry(db, p);
    res.json({ success: true, proposal: await enrichProposal(db, settled) });
  } catch (error) {
    console.error('❌ Get proposal error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

/**
 * PATCH /api/proposals/:id/respond  { action: 'accept' | 'decline' }
 * Recipient (or staff on their behalf) responds to a pending_recipient proposal.
 *   accept  → pending_staff, recipientAccepted=true
 *   decline → declined
 */
userProposalRouter.patch('/:id/respond', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const oid = toObjectId(getId(req.params.id));
    const action = String((req.body || {}).action || '').toLowerCase();
    if (!oid) {
      res.status(400).json({ success: false, error: 'Invalid proposal id' });
      return;
    }
    if (action !== 'accept' && action !== 'decline') {
      res.status(400).json({ success: false, error: "action must be 'accept' or 'decline'" });
      return;
    }

    const db = await getDatabase();
    const p = await db.collection('proposals').findOne({ _id: oid });
    if (!p) {
      res.status(404).json({ success: false, error: 'Proposal not found' });
      return;
    }
    if (!canAccess(req, p as any)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }
    if (p.status !== 'pending_recipient') {
      res.status(409).json({ success: false, error: `Cannot respond to a proposal in status '${p.status}'` });
      return;
    }

    const now = new Date();
    const update: any = action === 'accept'
      ? { $set: { status: 'pending_staff', 'mutualInterest.recipientAccepted': true, respondedAt: now, updatedAt: now } }
      : { $set: { status: 'declined', respondedAt: now, updatedAt: now } };

    await db.collection('proposals').updateOne({ _id: oid }, update);

    await logAudit(
      req.user!.email, req.user!.id, req.user!.role as any,
      action === 'accept' ? 'accept_proposal' : 'decline_proposal',
      'proposal', oid.toString(), `Recipient ${action}ed`, {}
    );

    res.json({ success: true, message: `Proposal ${action}ed`, status: action === 'accept' ? 'pending_staff' : 'declined' });
  } catch (error) {
    console.error('❌ Respond proposal error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

/**
 * PATCH /api/proposals/:id/withdraw
 * Initiator (or staff) withdraws a proposal that hasn't been approved yet.
 */
userProposalRouter.patch('/:id/withdraw', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const oid = toObjectId(getId(req.params.id));
    if (!oid) {
      res.status(400).json({ success: false, error: 'Invalid proposal id' });
      return;
    }
    const db = await getDatabase();
    const p = await db.collection('proposals').findOne({ _id: oid });
    if (!p) {
      res.status(404).json({ success: false, error: 'Proposal not found' });
      return;
    }
    if (!canAccess(req, p as any)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }
    if (!['pending_recipient', 'pending_staff'].includes(p.status)) {
      res.status(409).json({ success: false, error: `Cannot withdraw a proposal in status '${p.status}'` });
      return;
    }

    const now = new Date();
    await db.collection('proposals').updateOne({ _id: oid }, { $set: { status: 'withdrawn', withdrawnAt: now, updatedAt: now } });

    await logAudit(
      req.user!.email, req.user!.id, req.user!.role as any,
      'withdraw_proposal', 'proposal', oid.toString(), 'Initiator withdrew', {}
    );

    res.json({ success: true, message: 'Proposal withdrawn', status: 'withdrawn' });
  } catch (error) {
    console.error('❌ Withdraw proposal error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

/**
 * PATCH /api/proposals/:id/interest  { side?: 'initiator' | 'recipient' }
 * Mark a side as interested after chatting. When both sides are interested the
 * proposal moves to `completed` (family stage). `side` is required only when a
 * staff member acts on behalf of a participant.
 */
const handleInterest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const oid = toObjectId(getId(req.params.id));
    if (!oid) {
      res.status(400).json({ success: false, error: 'Invalid proposal id' });
      return;
    }
    const db = await getDatabase();
    let p: any = await db.collection('proposals').findOne({ _id: oid });
    if (!p) {
      res.status(404).json({ success: false, error: 'Proposal not found' });
      return;
    }
    if (!canAccess(req, p as any)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    p = await settleExpiry(db, p);
    if (p.status !== 'approved') {
      res.status(409).json({ success: false, error: `Cannot register interest on a proposal in status '${p.status}'` });
      return;
    }

    // Resolve which side is expressing interest
    let side = participantSide(req, p);
    if (!side) {
      const isStaff = req.user!.role === 'staff' || req.user!.role === 'admin';
      const bodySide = String((req.body || {}).side || '').toLowerCase();
      if (isStaff && (bodySide === 'initiator' || bodySide === 'recipient')) {
        side = bodySide as 'initiator' | 'recipient';
      } else {
        res.status(400).json({ success: false, error: "side required ('initiator' or 'recipient')" });
        return;
      }
    }

    const now = new Date();
    const initiatorInterested = side === 'initiator' ? true : !!p.mutualInterest?.initiatorInterested;
    const recipientInterested = side === 'recipient' ? true : !!p.mutualInterest?.recipientInterested;
    const bothInterested = initiatorInterested && recipientInterested;

    const set: any = {
      [`mutualInterest.${side}Interested`]: true,
      updatedAt: now,
    };
    if (bothInterested) {
      set.status = 'completed';
      set.completedAt = now;
      set['chat.status'] = 'closed';
    }

    await db.collection('proposals').updateOne({ _id: oid }, { $set: set });

    // Both interested → mutual match: email applicants + SMS families (idempotent, never throws)
    if (bothInterested) {
      await notifyFamilyOnCompletion(db, {
        ...p,
        status: 'completed',
        completedAt: now,
        mutualInterest: { ...p.mutualInterest, initiatorInterested, recipientInterested },
      });
    }

    await logAudit(
      req.user!.email, req.user!.id, req.user!.role as any,
      bothInterested ? 'complete_proposal' : 'interest_proposal',
      'proposal', oid.toString(), `${side} interested`, { bothInterested }
    );

    res.json({
      success: true,
      message: bothInterested ? 'Both interested — proposal completed' : `${side} interested`,
      status: bothInterested ? 'completed' : 'approved',
      mutualInterest: { ...p.mutualInterest, initiatorInterested, recipientInterested },
    });
  } catch (error) {
    console.error('❌ Interest proposal error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
};

// Mutual-interest flag (spec name) + /interest alias — same handler.
userProposalRouter.patch('/:id/interest', authMiddleware, handleInterest);
userProposalRouter.patch('/:id/mutual-interest', authMiddleware, handleInterest);

/**
 * GET /api/proposals/:id/messages
 * Fetch the chat thread for a proposal (participants + staff).
 */
userProposalRouter.get('/:id/messages', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const oid = toObjectId(getId(req.params.id));
    if (!oid) {
      res.status(400).json({ success: false, error: 'Invalid proposal id' });
      return;
    }
    const db = await getDatabase();
    const p = await db.collection('proposals').findOne({ _id: oid });
    if (!p) {
      res.status(404).json({ success: false, error: 'Proposal not found' });
      return;
    }
    if (!canAccess(req, p as any)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }
    const settled = await settleExpiry(db, p);
    const messages = await db.collection('messages').find({ proposalId: oid }).sort({ createdAt: 1 }).toArray();
    res.json({
      success: true,
      total: messages.length,
      chat: settled.chat,
      messages: messages.map((m: any) => ({ ...m, _id: m._id.toString(), proposalId: m.proposalId.toString(), senderId: m.senderId.toString() })),
    });
  } catch (error) {
    console.error('❌ Get messages error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

/**
 * POST /api/proposals/:id/messages  { text }
 * Send a chat message. Allowed only while the proposal is `approved` and inside
 * its 48h window.
 */
userProposalRouter.post('/:id/messages', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const oid = toObjectId(getId(req.params.id));
    if (!oid) {
      res.status(400).json({ success: false, error: 'Invalid proposal id' });
      return;
    }
    const text = String((req.body || {}).text || '').trim();
    if (!text) {
      res.status(400).json({ success: false, error: 'text required' });
      return;
    }
    if (text.length > MAX_MESSAGE_LEN) {
      res.status(400).json({ success: false, error: `text exceeds ${MAX_MESSAGE_LEN} characters` });
      return;
    }

    const db = await getDatabase();
    let p: any = await db.collection('proposals').findOne({ _id: oid });
    if (!p) {
      res.status(404).json({ success: false, error: 'Proposal not found' });
      return;
    }
    if (!canAccess(req, p as any)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    p = await settleExpiry(db, p);
    const closesAt = p.chat?.closesAt ? new Date(p.chat.closesAt) : null;
    if (p.status !== 'approved' || p.chat?.status !== 'open' || !closesAt || closesAt.getTime() <= Date.now()) {
      res.status(409).json({ success: false, error: 'Chat is not open for this proposal' });
      return;
    }

    const senderOid = toObjectId(req.user!.id);
    if (!senderOid) {
      res.status(400).json({ success: false, error: 'Invalid sender id' });
      return;
    }

    const msg = createMessageDocument(oid, senderOid, req.user!.role as any, text);
    const result = await db.collection('messages').insertOne(msg);

    await db.collection('proposals').updateOne(
      { _id: oid },
      { $inc: { 'chat.messageCount': 1 }, $set: { updatedAt: new Date() } }
    );

    res.status(201).json({
      success: true,
      message: { ...msg, _id: result.insertedId.toString(), proposalId: oid.toString(), senderId: senderOid.toString() },
    });
  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// STAFF ROUTER — mounted at /api/staff/proposals (authMiddleware + staffOnly)
// ════════════════════════════════════════════════════════════════════════════
export const staffProposalRouter = express.Router();

/** GET /api/staff/proposals?status=pending_staff */
staffProposalRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = getId(req.query.status as string | string[] | undefined);
    const db = await getDatabase();
    const query: any = status ? { status } : {};
    const raw = await db.collection('proposals').find(query).sort({ createdAt: -1 }).limit(300).toArray();
    const proposals = await Promise.all(raw.map((p) => enrichProposal(db, p)));
    res.json({ success: true, total: proposals.length, proposals });
  } catch (error) {
    console.error('❌ Staff list proposals error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

/**
 * PATCH /api/staff/proposals/:id/review  { action: 'approve' | 'reject', reason }
 * Staff reviews a pending_staff proposal.
 *   approve → approved, chat opens 48h
 *   reject  → rejected
 */
staffProposalRouter.patch('/:id/review', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const oid = toObjectId(getId(req.params.id));
    const { action, reason } = req.body || {};
    const act = String(action || '').toLowerCase();
    if (!oid) {
      res.status(400).json({ success: false, error: 'Invalid proposal id' });
      return;
    }
    if (act !== 'approve' && act !== 'reject') {
      res.status(400).json({ success: false, error: "action must be 'approve' or 'reject'" });
      return;
    }
    if (act === 'reject' && !reason) {
      res.status(400).json({ success: false, error: 'reason required to reject' });
      return;
    }

    const db = await getDatabase();
    const p = await db.collection('proposals').findOne({ _id: oid });
    if (!p) {
      res.status(404).json({ success: false, error: 'Proposal not found' });
      return;
    }
    if (p.status !== 'pending_staff') {
      res.status(409).json({ success: false, error: `Only pending_staff proposals can be reviewed (current: '${p.status}')` });
      return;
    }

    const now = new Date();
    const staffOid = toObjectId(req.user!.id);

    let update: any;
    if (act === 'approve') {
      update = {
        $set: {
          status: 'approved',
          reviewedBy: staffOid || undefined,
          reviewedAt: now,
          reviewReason: reason || 'Approved',
          staffReview: { status: 'approved', reviewedBy: staffOid || undefined, reviewedAt: now, notes: reason || 'Approved' },
          chat: { status: 'open', openedAt: now, closesAt: new Date(now.getTime() + CHAT_WINDOW_MS), messageCount: 0 },
          updatedAt: now,
        },
      };
    } else {
      update = {
        $set: {
          status: 'rejected',
          reviewedBy: staffOid || undefined,
          reviewedAt: now,
          reviewReason: reason,
          staffReview: { status: 'rejected', reviewedBy: staffOid || undefined, reviewedAt: now, notes: reason },
          updatedAt: now,
        },
      };
    }

    await db.collection('proposals').updateOne({ _id: oid }, update);

    // Approved → chat opens: notify both participants (never throws)
    if (act === 'approve') await notifyProposalApproved(db, p);

    await logAudit(
      req.user!.email, req.user!.id, req.user!.role as any,
      act === 'approve' ? 'approve_proposal' : 'reject_proposal',
      'proposal', oid.toString(), reason || (act === 'approve' ? 'Approved' : 'Rejected'), {}
    );

    res.json({ success: true, message: `Proposal ${act}d`, status: act === 'approve' ? 'approved' : 'rejected' });
  } catch (error) {
    console.error('❌ Review proposal error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});
