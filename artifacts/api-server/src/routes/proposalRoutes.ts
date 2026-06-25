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

// A staff-managed profile has no login (entered by staff). Staff acts as its
// proxy — it cannot self-accept a proposal.
const STAFF_SOURCES = ['staff_entry', 'paper', 'whatsapp', 'walkin', 'referral', 'phone'];
function isStaffManaged(p: any): boolean {
  if (p?.registeredBy === 'staff') return true;
  return typeof p?.source === 'string' && STAFF_SOURCES.includes(p.source);
}

interface ApprovalDecision {
  status: 'pending_recipient' | 'chat_active' | 'family_proposal_stage';
  notify: 'recipient' | 'chat' | 'family';
}

/**
 * Once staff approve (or a staff proposal is created), decide the next state by
 * each side's autonomy:
 *   both staff-managed  → family_proposal_stage (no logins to chat → offline)
 *   recipient staff     → chat_active (staff proxies the recipient's consent)
 *   recipient self      → pending_recipient (they must actively accept)
 */
function decidePostApproval(initiator: any, recipient: any): ApprovalDecision {
  const initStaff = isStaffManaged(initiator);
  const recipStaff = isStaffManaged(recipient);
  if (initStaff && recipStaff) return { status: 'family_proposal_stage', notify: 'family' };
  if (recipStaff) return { status: 'chat_active', notify: 'chat' };
  return { status: 'pending_recipient', notify: 'recipient' };
}

/** Apply an approval decision's side effects to a fresh $set (or doc) object. */
function approvalFields(decision: ApprovalDecision, now: Date): Record<string, any> {
  const f: Record<string, any> = { status: decision.status, updatedAt: now };
  if (decision.status === 'chat_active') {
    f['mutualInterest.recipientAccepted'] = true; // staff proxies recipient consent
    f.chat = { status: 'open', openedAt: now, closesAt: new Date(now.getTime() + CHAT_WINDOW_MS), messageCount: 0 };
  } else if (decision.status === 'family_proposal_stage') {
    f['mutualInterest.recipientAccepted'] = true;
    f.familyStageAt = now; // both staff-managed → straight to family/offline stage
  }
  return f;
}

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
  profession: 1, education: 1, photo: 1, height: 1, source: 1, registeredBy: 1,
};

/** Best-effort compatibility score for a proposal — by matchId, else by pair. */
async function lookupCompatibilityScore(db: any, p: any): Promise<number | undefined> {
  let m = p.matchId ? await db.collection('matches').findOne({ _id: p.matchId }) : null;
  if (!m) {
    m = await db.collection('matches').findOne({
      $or: [
        { userId: p.initiatorId, candidateId: p.recipientId },
        { userId: p.recipientId, candidateId: p.initiatorId },
      ],
    });
  }
  return (m?.scoreBreakdown?.total ?? m?.score) as number | undefined;
}

async function enrichProposal(db: any, p: any) {
  const [initiator, recipient, compatibilityScore] = await Promise.all([
    db.collection('profiles').findOne({ _id: p.initiatorId }, { projection: PROFILE_PROJECTION }),
    db.collection('profiles').findOne({ _id: p.recipientId }, { projection: PROFILE_PROJECTION }),
    lookupCompatibilityScore(db, p),
  ]);
  // A proposal is orphaned if either profile was deleted — stale history that
  // should not surface in the staff queues.
  const orphaned = !initiator || !recipient;
  return { ...p, initiator, recipient, compatibilityScore, orphaned };
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
    ? { status: 'family_proposal_stage', familyStageAt: now, 'chat.status': 'closed', updatedAt: now }
    : { status: 'expired', 'chat.status': 'expired', updatedAt: now };

  await db.collection('proposals').updateOne({ _id: p._id }, { $set: next });
  const updated = {
    ...p,
    status: next.status,
    familyStageAt: (next as any).familyStageAt ?? p.familyStageAt,
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

    let initOid = toObjectId(getId(initiatorId));
    let recipOid = toObjectId(getId(recipientId));
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

    let [initiator, recipient] = await Promise.all([
      profiles.findOne({ _id: initOid }),
      profiles.findOne({ _id: recipOid }),
    ]);
    if (!initiator || !recipient) {
      res.status(404).json({ success: false, error: 'initiator or recipient profile not found' });
      return;
    }

    // Direction normalization (staff-mediated pairing): when staff pair a
    // staff-managed (no-login) profile with a real applicant, the applicant is
    // the one who must consent, so they must be the RECIPIENT. The staff-managed
    // side becomes the initiator (staff proxies it). This makes the proposal land
    // in the applicant's "Received" tab instead of vanishing into a no-login
    // recipient. Only swap when exactly one side is staff-managed.
    if (type === 'STAFF_PROPOSAL' && isStaffManaged(initiator) !== isStaffManaged(recipient) && !isStaffManaged(initiator)) {
      [initOid, recipOid] = [recipOid, initOid];
      [initiator, recipient] = [recipient, initiator];
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

    // STAFF_PROPOSAL is already vetted (no staff-review stage). Resolve its post-
    // approval state by each side's autonomy (staff-managed sides are proxied).
    let createNotify: ApprovalDecision['notify'] = 'recipient';
    if (type === 'STAFF_PROPOSAL') {
      const decision = decidePostApproval(initiator, recipient);
      const f = approvalFields(decision, new Date());
      doc.status = decision.status as any;
      if (f['mutualInterest.recipientAccepted']) doc.mutualInterest.recipientAccepted = true;
      if (f.chat) doc.chat = f.chat;
      if (f.completedAt) (doc as any).completedAt = f.completedAt;
      createNotify = decision.notify;
    }

    const result = await db.collection('proposals').insertOne(doc);
    const created = { ...doc, _id: result.insertedId };

    // Notify per outcome (never throws):
    //  USER_PROPOSAL → pending_staff_review → staff queue.
    //  STAFF_PROPOSAL → recipient | chat opened | family stage, per decision.
    if (doc.status === 'pending_staff_review') await notifyStaffNewProposal(db, created);
    else if (createNotify === 'chat') await notifyChatOpened(db, created);
    else if (createNotify === 'family') await notifyFamilyOnCompletion(db, created);
    else await notifyProposalVisibleToRecipient(db, created);

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

    // Interest is explicit per side. A staff-managed side has no login, so a staff
    // member confirms it on their behalf (an audited proxy action) — never inferred
    // silently, so there is a clear consent trail.
    const actedAsParticipant = !!participantSide(req, p);
    const proxiedByStaff = !actedAsParticipant; // staff confirmed on behalf of `side`

    const initiatorInterested = side === 'initiator' ? true : !!p.mutualInterest?.initiatorInterested;
    const recipientInterested = side === 'recipient' ? true : !!p.mutualInterest?.recipientInterested;
    const bothInterested = initiatorInterested && recipientInterested;

    const set: any = {
      [`mutualInterest.${side}Interested`]: true,
      updatedAt: now,
    };
    if (proxiedByStaff) {
      set[`mutualInterest.${side}ConfirmedBy`] = req.user!.id; // who proxied this consent
      set[`mutualInterest.${side}ConfirmedAt`] = now;
    }
    if (bothInterested) {
      set.status = 'family_proposal_stage';
      set.familyStageAt = now;
      set['chat.status'] = 'closed';
    }

    await db.collection('proposals').updateOne({ _id: oid }, { $set: set });

    // Both interested → family stage: email applicants + SMS families (idempotent, never throws)
    if (bothInterested) {
      await notifyFamilyOnCompletion(db, {
        ...p,
        status: 'family_proposal_stage',
        familyStageAt: now,
        mutualInterest: { ...p.mutualInterest, initiatorInterested, recipientInterested },
      });
    }

    await logAudit(
      req.user!.email, req.user!.id, req.user!.role as any,
      bothInterested ? 'family_proposal_stage' : 'interest_proposal',
      'proposal', oid.toString(),
      proxiedByStaff ? `Staff confirmed interest on behalf of ${side}` : `${side} interested`,
      { bothInterested, side, proxiedByStaff }
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
    // Drop orphaned proposals (a profile was deleted) — stale history, not actionable.
    const enriched = await Promise.all(raw.map((p) => enrichProposal(db, p)));
    const proposals = enriched.filter((p) => !p.orphaned);

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
    let approveDecision: ApprovalDecision | null = null;
    if (act === 'approve') {
      // Resolve the post-approval state by each side's autonomy: a staff-managed
      // recipient is proxied (chat opens now / both-staff → family stage); a
      // self-registered recipient must still actively accept (pending_recipient).
      const [initiatorP, recipientP] = await Promise.all([
        db.collection('profiles').findOne({ _id: p.initiatorId }, { projection: { registeredBy: 1, source: 1 } }),
        db.collection('profiles').findOne({ _id: p.recipientId }, { projection: { registeredBy: 1, source: 1 } }),
      ]);
      approveDecision = decidePostApproval(initiatorP, recipientP);
      update = {
        $set: {
          ...approvalFields(approveDecision, now),
          reviewedBy: staffOid || undefined,
          reviewedAt: now,
          reviewReason: reason || 'Approved',
          staffReview: { status: 'approved', reviewedBy: staffOid || undefined, reviewedAt: now, notes: reason || 'Approved' },
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

    // Notify per outcome (never throws). Approve routes by decision:
    //   recipient → now visible; chat → opened (both); family → families notified.
    if (act === 'approve' && approveDecision) {
      if (approveDecision.notify === 'chat') await notifyChatOpened(db, p);
      else if (approveDecision.notify === 'family') await notifyFamilyOnCompletion(db, { ...p, ...update.$set });
      else await notifyProposalVisibleToRecipient(db, p);
    } else if (act === 'reject') {
      await notifyProposalRejected(db, p, reason);
    }

    await logAudit(
      req.user!.email, req.user!.id, req.user!.role as any,
      act === 'approve' ? 'approve_proposal' : 'reject_proposal',
      'proposal', oid.toString(), reason || (act === 'approve' ? 'Approved' : 'Rejected'), {}
    );

    res.json({
      success: true,
      message: `Proposal ${act}d`,
      status: act === 'approve' ? (approveDecision?.status || 'pending_recipient') : 'rejected_by_staff',
    });
  } catch (error) {
    console.error('❌ Review proposal error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

/**
 * PATCH /api/staff/proposals/:id/conclude  { outcome: 'completed' | 'not_proceeded', note? }
 * Close out a family-stage proposal once the offline family process finishes —
 * the terminal step the pipeline previously lacked.
 *   completed     → status 'completed'  (success; permanently off the suggestion list)
 *   not_proceeded → status 'withdrawn'  (didn't proceed; the pair may be suggested again)
 */
staffProposalRouter.patch('/:id/conclude', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const oid = toObjectId(getId(req.params.id));
    const outcome = String((req.body || {}).outcome || '').toLowerCase();
    const note = (req.body || {}).note as string | undefined;
    if (!oid) {
      res.status(400).json({ success: false, error: 'Invalid proposal id' });
      return;
    }
    if (outcome !== 'completed' && outcome !== 'not_proceeded') {
      res.status(400).json({ success: false, error: "outcome must be 'completed' or 'not_proceeded'" });
      return;
    }

    const db = await getDatabase();
    const p = await db.collection('proposals').findOne({ _id: oid });
    if (!p) {
      res.status(404).json({ success: false, error: 'Proposal not found' });
      return;
    }
    if (p.status !== 'family_proposal_stage') {
      res.status(409).json({ success: false, error: `Only a family-stage proposal can be concluded (current: '${p.status}')` });
      return;
    }

    const now = new Date();
    const set: any = { updatedAt: now };
    if (outcome === 'completed') {
      set.status = 'completed';
      set.completedAt = now;
    } else {
      set.status = 'withdrawn';
      set.withdrawnAt = now;
    }
    if (note) set.conclusionNote = note;

    await db.collection('proposals').updateOne({ _id: oid }, { $set: set });

    await logAudit(
      req.user!.email, req.user!.id, req.user!.role as any,
      outcome === 'completed' ? 'complete_proposal' : 'close_proposal',
      'proposal', oid.toString(), note || (outcome === 'completed' ? 'Marked completed' : 'Closed — did not proceed'),
      { outcome }
    );

    res.json({ success: true, message: `Proposal ${set.status}`, status: set.status });
  } catch (error) {
    console.error('❌ Conclude proposal error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});
