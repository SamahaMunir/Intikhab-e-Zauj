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
  notifyStaffNewProposal,
  notifyProposalVisibleToRecipient,
  notifyChatOpened,
  notifyProposalRejected,
  notifyProposalDeclined,
  notifyProposalWithdrawn,
  notifyChatExpired,
} from '../lib/notifications';
import { applyHardFilters } from '../lib/matching';

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
const ACTIVE_STATUSES = ['pending_staff_review', 'pending_recipient', 'mutual_interest_confirmed', 'chat_active', 'family_proposal_stage'];

// Statuses a proposal can be in BEFORE it is ever forwarded to the recipient.
// The recipient must never see these (pre-screen — they never saw it).
const HIDDEN_FROM_RECIPIENT = ['pending_staff_review', 'rejected_by_staff'];

/**
 * Block contact-info sharing in chat — the platform is staff-mediated, so direct
 * phone/email/social handles defeat the supervision model. Best-effort guard.
 */
function detectContactInfo(text: string): string | null {
  const t = text.toLowerCase();
  // Email
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) return 'email address';
  // Phone: 7+ digits, allowing spaces/dashes/dots/parens between them
  const digits = (text.match(/\d/g) || []).length;
  if (digits >= 7 && /(\+?\d[\d\s().-]{6,}\d)/.test(text)) return 'phone number';
  // URLs / social handles
  if (/https?:\/\/|www\.|\b\S+\.(com|net|org|pk|io)\b/i.test(text)) return 'web link';
  if (/(whats\s?app|whatsapp|telegram|insta(gram)?|facebook|\bfb\b|snapchat|@[a-z0-9_]{3,})/i.test(t)) return 'social contact';
  return null;
}

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
  const isInitiator = p.createdBy?.toString() === uid || p.initiatorId?.toString() === uid;
  const isRecipient = p.recipientId?.toString() === uid;
  // Pre-screen visibility rule: a recipient must never see a proposal that was
  // not forwarded to them (still in staff review, or rejected by staff before
  // forwarding). Initiator always sees their own.
  if (isRecipient && !isInitiator && HIDDEN_FROM_RECIPIENT.includes(p.status)) return false;
  return isInitiator || isRecipient;
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
 * Lazily settle a chat_active proposal whose 48h window has elapsed.
 * Both-interested → family_proposal_stage; otherwise → expired. (Both-interested
 * normally transitions immediately on the 2nd "interested" click; this is the
 * safety net.) Persists + returns the up-to-date proposal doc.
 */
async function settleExpiry(db: any, p: any): Promise<any> {
  if (p.status !== 'chat_active' || p.chat?.status !== 'open') return p;
  const closesAt = p.chat?.closesAt ? new Date(p.chat.closesAt) : null;
  if (!closesAt || closesAt.getTime() > Date.now()) return p;

  const now = new Date();
  const bothInterested = !!(p.mutualInterest?.initiatorInterested && p.mutualInterest?.recipientInterested);
  const next = bothInterested
    ? { status: 'family_proposal_stage', completedAt: now, 'chat.status': 'closed', updatedAt: now }
    : { status: 'expired', 'chat.status': 'expired', updatedAt: now };

  await db.collection('proposals').updateOne({ _id: p._id }, { $set: next });
  const updated = {
    ...p,
    status: next.status,
    completedAt: (next as any).completedAt ?? p.completedAt,
    chat: { ...p.chat, status: next['chat.status'] },
    updatedAt: now,
  };
  // Window elapsed: both interested → family stage (notify families); else expired → notify both
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

    // Hard-filter gate — a proposal may only be sent for a pair that passes the
    // mandatory matching constraints (opposite gender, age/height bounds, etc.).
    const hf = applyHardFilters(initiator, recipient);
    if (!hf.passes) {
      res.status(400).json({
        success: false,
        error: 'Pair does not pass hard filters',
        rejections: hf.rejections.map(r => r.reason),
      });
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
    const created = { ...doc, _id: result.insertedId };

    // Staff pre-screen model (never throws):
    //  USER_PROPOSAL → pending_staff_review: it enters the staff queue (dashboard).
    //  STAFF_PROPOSAL → pending_recipient: already vetted, so notify the recipient.
    if (doc.status === 'pending_recipient') await notifyProposalVisibleToRecipient(db, created);
    else await notifyStaffNewProposal(db, created);

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
      // Pre-screen rule: a recipient only sees proposals that were forwarded to them.
      const recipientVisible = { recipientId: { $in: ids }, status: { $nin: HIDDEN_FROM_RECIPIENT } };
      if (roleFilter === 'initiator') query = { initiatorId: { $in: ids } };
      else if (roleFilter === 'recipient') query = recipientVisible;
      else query = { $or: [{ initiatorId: { $in: ids } }, recipientVisible, { createdBy: { $in: ids } }] };
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
 * Recipient (or staff on their behalf) responds to a staff-approved proposal.
 *   accept  → chat_active — chat opens immediately for 48h (no 2nd staff review)
 *   decline → declined_by_recipient
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
    const nextStatus = action === 'accept' ? 'chat_active' : 'declined_by_recipient';
    const update: any = action === 'accept'
      ? {
          $set: {
            status: 'chat_active',
            'mutualInterest.recipientAccepted': true,
            // Recipient accepted → chat opens immediately (no second staff review)
            chat: { status: 'open', openedAt: now, closesAt: new Date(now.getTime() + CHAT_WINDOW_MS), messageCount: 0 },
            respondedAt: now,
            updatedAt: now,
          },
        }
      : { $set: { status: 'declined_by_recipient', respondedAt: now, updatedAt: now } };

    await db.collection('proposals').updateOne({ _id: oid }, update);

    // accept → chat opens, notify both; decline → tell the initiator (never throws)
    if (action === 'accept') await notifyChatOpened(db, p);
    else await notifyProposalDeclined(db, p);

    await logAudit(
      req.user!.email, req.user!.id, req.user!.role as any,
      action === 'accept' ? 'accept_proposal' : 'decline_proposal',
      'proposal', oid.toString(), `Recipient ${action}ed`, {}
    );

    res.json({ success: true, message: `Proposal ${action}ed`, status: nextStatus });
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
    if (!['pending_staff_review', 'pending_recipient'].includes(p.status)) {
      res.status(409).json({ success: false, error: `Cannot withdraw a proposal in status '${p.status}'` });
      return;
    }

    const now = new Date();
    await db.collection('proposals').updateOne({ _id: oid }, { $set: { status: 'withdrawn', withdrawnAt: now, updatedAt: now } });

    // Initiator withdrew → tell the recipient (never throws)
    await notifyProposalWithdrawn(db, p);

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
    if (p.status !== 'chat_active') {
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
      set.status = 'family_proposal_stage';
      set.completedAt = now;
      set['chat.status'] = 'closed';
    }

    await db.collection('proposals').updateOne({ _id: oid }, { $set: set });

    // Both interested → family stage: email applicants + SMS families (idempotent, never throws)
    if (bothInterested) {
      await notifyFamilyOnCompletion(db, {
        ...p,
        status: 'family_proposal_stage',
        completedAt: now,
        mutualInterest: { ...p.mutualInterest, initiatorInterested, recipientInterested },
      });
    }

    await logAudit(
      req.user!.email, req.user!.id, req.user!.role as any,
      bothInterested ? 'family_proposal_stage' : 'interest_proposal',
      'proposal', oid.toString(), `${side} interested`, { bothInterested }
    );

    res.json({
      success: true,
      message: bothInterested ? 'Both interested — family proposal stage' : `${side} interested`,
      status: bothInterested ? 'family_proposal_stage' : 'chat_active',
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
    // Staff-mediated platform — block direct contact-info exchange in chat.
    const contact = detectContactInfo(text);
    if (contact) {
      res.status(400).json({ success: false, error: `For your safety, sharing a ${contact} in chat isn't allowed. Staff will coordinate contact details.` });
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
    if (p.status !== 'chat_active' || p.chat?.status !== 'open' || !closesAt || closesAt.getTime() <= Date.now()) {
      res.status(409).json({ success: false, error: 'Chat is not open for this proposal' });
      return;
    }

    // Sender is the account: applicant → profile ObjectId; staff → id may be a
    // non-ObjectId string. Store whichever form it is.
    const senderId = toObjectId(req.user!.id) || req.user!.id;

    const msg = createMessageDocument(oid, senderId, req.user!.role as any, text);
    const result = await db.collection('messages').insertOne(msg);

    await db.collection('proposals').updateOne(
      { _id: oid },
      { $inc: { 'chat.messageCount': 1 }, $set: { updatedAt: new Date() } }
    );

    res.status(201).json({
      success: true,
      message: { ...msg, _id: result.insertedId.toString(), proposalId: oid.toString(), senderId: senderId.toString() },
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
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
    const skip = (page - 1) * limit;

    const db = await getDatabase();
    const query: any = status ? { status } : {};

    const total = await db.collection('proposals').countDocuments(query);
    const raw = await db.collection('proposals')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    const proposals = await Promise.all(raw.map((p) => enrichProposal(db, p)));

    res.json({
      success: true,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      proposals,
    });
  } catch (error) {
    console.error('❌ Staff list proposals error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

/**
 * PATCH /api/staff/proposals/:id/review  { action: 'approve' | 'reject', reason }
 * Staff pre-screen a pending_staff_review proposal (before the recipient sees it).
 *   approve → pending_recipient — proposal becomes visible to the recipient (no chat yet)
 *   reject  → rejected_by_staff — only the sender is notified; recipient never saw it
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
    if (p.status !== 'pending_staff_review') {
      res.status(409).json({ success: false, error: `Only pending_staff_review proposals can be reviewed (current: '${p.status}')` });
      return;
    }

    const now = new Date();
    const staffOid = toObjectId(req.user!.id);

    let update: any;
    if (act === 'approve') {
      // Approve makes it visible to the recipient — chat does NOT open here; it
      // opens when the recipient accepts.
      update = {
        $set: {
          status: 'pending_recipient',
          reviewedBy: staffOid || undefined,
          reviewedAt: now,
          reviewReason: reason || 'Approved',
          staffReview: { status: 'approved', reviewedBy: staffOid || undefined, reviewedAt: now, notes: reason || 'Approved' },
          updatedAt: now,
        },
      };
    } else {
      update = {
        $set: {
          status: 'rejected_by_staff',
          reviewedBy: staffOid || undefined,
          reviewedAt: now,
          reviewReason: reason,
          staffReview: { status: 'rejected', reviewedBy: staffOid || undefined, reviewedAt: now, notes: reason },
          updatedAt: now,
        },
      };
    }

    await db.collection('proposals').updateOne({ _id: oid }, update);

    // Approved → now visible: notify recipient. Rejected → notify sender only. (never throws)
    if (act === 'approve') await notifyProposalVisibleToRecipient(db, p);
    else await notifyProposalRejected(db, p, reason);

    await logAudit(
      req.user!.email, req.user!.id, req.user!.role as any,
      act === 'approve' ? 'approve_proposal' : 'reject_proposal',
      'proposal', oid.toString(), reason || (act === 'approve' ? 'Approved' : 'Rejected'), {}
    );

    res.json({ success: true, message: `Proposal ${act}d`, status: act === 'approve' ? 'pending_recipient' : 'rejected_by_staff' });
  } catch (error) {
    console.error('❌ Review proposal error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});
