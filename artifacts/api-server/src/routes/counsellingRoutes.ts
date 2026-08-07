import express, { Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection';
import { logAudit } from '../db/auditLogs';
import { type AuthRequest } from '../middleware/auth';

/**
 * Pre/Post-marriage counselling requests (a service Falah-e-Khandan provides).
 *
 * Flow: an applicant submits a request (type + topic) → it lands in the staff
 * queue as `pending` → staff assign a counsellor, schedule it, and mark it
 * completed. Applicants can cancel their own pending requests.
 *
 * Collection: `counselling`
 *   { userId, userName, userEmail, userPhone, type, topic, status,
 *     counsellor?, scheduledAt?, staffNotes?, createdAt, updatedAt }
 */

const TYPES = ['pre_marriage', 'post_marriage'] as const;
const STATUSES = ['pending', 'scheduled', 'completed', 'cancelled'] as const;

function toObjectId(id: string | string[] | undefined): ObjectId | null {
  const s = Array.isArray(id) ? id[0] : id;
  if (!s) return null;
  try { return new ObjectId(s); } catch { return null; }
}

const shape = (c: any) => ({
  _id: c._id.toString(),
  userId: c.userId?.toString?.() ?? c.userId,
  userName: c.userName,
  userEmail: c.userEmail,
  userPhone: c.userPhone,
  type: c.type,
  topic: c.topic,
  status: c.status,
  counsellor: c.counsellor || null,
  scheduledAt: c.scheduledAt || null,
  staffNotes: c.staffNotes || null,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

// ── Applicant router (mounted at /api/counselling, authMiddleware) ─────────────
export const userCounsellingRouter = express.Router();

/** POST /api/counselling — submit a new request. */
userCounsellingRouter.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
    const type = String((req.body || {}).type || '').trim();
    const topic = String((req.body || {}).topic || '').trim();
    if (!TYPES.includes(type as any)) { res.status(400).json({ success: false, error: 'Invalid counselling type' }); return; }
    if (topic.length < 3) { res.status(400).json({ success: false, error: 'Please describe your topic / concern' }); return; }

    const db = await getDatabase();
    const profile = await db.collection('profiles').findOne({ _id: new ObjectId(req.user.id) });

    const now = new Date();
    const doc = {
      _id: new ObjectId(),
      userId: new ObjectId(req.user.id),
      userName: profile?.name || req.user.email,
      userEmail: profile?.email || req.user.email,
      userPhone: profile?.phone || '',
      type,
      topic,
      status: 'pending' as const,
      counsellor: null,
      scheduledAt: null,
      staffNotes: null,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection('counselling').insertOne(doc);
    res.status(201).json({ success: true, request: shape(doc) });
  } catch (error) {
    console.error('❌ Counselling create error:', error);
    res.status(500).json({ success: false, error: 'Could not submit request' });
  }
});

/** GET /api/counselling/mine — the logged-in applicant's requests. */
userCounsellingRouter.get('/mine', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
    res.set('Cache-Control', 'no-store, max-age=0');
    const db = await getDatabase();
    const rows = await db.collection('counselling')
      .find({ userId: new ObjectId(req.user.id) })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ success: true, requests: rows.map(shape) });
  } catch (error) {
    console.error('❌ Counselling list (mine) error:', error);
    res.status(500).json({ success: false, error: 'Could not load requests' });
  }
});

/** PATCH /api/counselling/:id/cancel — applicant cancels their own pending request. */
userCounsellingRouter.patch('/:id/cancel', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
    const oid = toObjectId(req.params.id);
    if (!oid) { res.status(400).json({ success: false, error: 'Invalid id' }); return; }
    const db = await getDatabase();
    const c = await db.collection('counselling').findOne({ _id: oid });
    if (!c) { res.status(404).json({ success: false, error: 'Request not found' }); return; }
    if (c.userId.toString() !== req.user.id) { res.status(403).json({ success: false, error: 'Forbidden' }); return; }
    if (!['pending', 'scheduled'].includes(c.status)) {
      res.status(409).json({ success: false, error: `Cannot cancel a ${c.status} request` }); return;
    }
    await db.collection('counselling').updateOne({ _id: oid }, { $set: { status: 'cancelled', updatedAt: new Date() } });
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Counselling cancel error:', error);
    res.status(500).json({ success: false, error: 'Could not cancel request' });
  }
});

// ── Staff router (mounted at /api/staff/counselling, auth + staffOnly) ─────────
export const staffCounsellingRouter = express.Router();

/** GET /api/staff/counselling?status= — all requests (optionally filtered). */
staffCounsellingRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.set('Cache-Control', 'no-store, max-age=0');
    const status = req.query.status as string | undefined;
    const query: any = {};
    if (status && STATUSES.includes(status as any)) query.status = status;
    const db = await getDatabase();
    const rows = await db.collection('counselling').find(query).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, requests: rows.map(shape) });
  } catch (error) {
    console.error('❌ Staff counselling list error:', error);
    res.status(500).json({ success: false, error: 'Could not load requests' });
  }
});

/** PATCH /api/staff/counselling/:id — assign counsellor / schedule / set status / notes. */
staffCounsellingRouter.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const oid = toObjectId(req.params.id);
    if (!oid) { res.status(400).json({ success: false, error: 'Invalid id' }); return; }
    const { status, counsellor, scheduledAt, staffNotes } = req.body || {};

    const set: any = { updatedAt: new Date() };
    if (status !== undefined) {
      if (!STATUSES.includes(status)) { res.status(400).json({ success: false, error: 'Invalid status' }); return; }
      set.status = status;
    }
    if (counsellor !== undefined) set.counsellor = String(counsellor).trim() || null;
    if (staffNotes !== undefined) set.staffNotes = String(staffNotes).trim() || null;
    if (scheduledAt !== undefined) {
      if (scheduledAt === null || scheduledAt === '') set.scheduledAt = null;
      else {
        const d = new Date(scheduledAt);
        if (isNaN(d.getTime())) { res.status(400).json({ success: false, error: 'Invalid scheduledAt' }); return; }
        set.scheduledAt = d;
      }
    }

    const db = await getDatabase();
    const result = await db.collection('counselling').findOneAndUpdate(
      { _id: oid }, { $set: set }, { returnDocument: 'after' }
    );
    const updated = (result as any)?.value ?? result;
    if (!updated) { res.status(404).json({ success: false, error: 'Request not found' }); return; }

    await logAudit(
      req.user!.email, req.user!.id, req.user!.role as any,
      'counselling_updated', 'counselling', oid.toString(),
      `Updated counselling request (${Object.keys(set).filter(k => k !== 'updatedAt').join(', ')})`,
      set
    );
    res.json({ success: true, request: shape(updated) });
  } catch (error) {
    console.error('❌ Staff counselling update error:', error);
    res.status(500).json({ success: false, error: 'Could not update request' });
  }
});
