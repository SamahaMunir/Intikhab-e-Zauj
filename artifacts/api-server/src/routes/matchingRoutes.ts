import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection';
import { applyHardFilters } from '../lib/hard-filters';
import { calculateScore } from '../lib/scoring';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

function getId(id: string | string[] | undefined): string | null {
  if (!id) return null;
  if (Array.isArray(id)) return id[0] || null;
  return id;
}

function toObjectId(id: string): ObjectId | null {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

// GET /api/matches?userId=xxx  — NEVER 404s, returns matches (empty if none)
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userIdStr = getId(req.query.userId as string | string[] | undefined);
    console.log(`📥 [NEW CODE] Get matches for: ${userIdStr}`);

    if (!userIdStr) {
      res.status(400).json({ success: false, error: 'userId required' });
      return;
    }

    const oid = toObjectId(userIdStr);
    if (!oid) {
      res.status(400).json({ success: false, error: 'Invalid userId format' });
      return;
    }

    const db = await getDatabase();

    // Query matches by BOTH ObjectId and string (covers either storage type)
    const matches = await db.collection('matches')
      .find({ userId: { $in: [oid, userIdStr] }, status: 'suggested' })
      .sort({ score: -1 })
      .toArray();

    console.log(`✅ Found ${matches.length} matches`);

    const enriched = await Promise.all(
      matches.map(async (m) => {
        const candidate = await db.collection('profiles').findOne(
          { _id: m.candidateId },
          { projection: { name: 1, age: 1, city: 1, education: 1, photo: 1 } }
        );
        return { ...m, candidate };
      })
    );

    res.json({ success: true, total: enriched.length, matches: enriched });
  } catch (error) {
    console.error('❌ Get matches error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

// POST /api/matches/generate/:userId
router.post('/generate/:userId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userIdStr = getId(req.params.userId);
    console.log(`📍 [NEW CODE] Generate matches for: ${userIdStr}`);

    if (!userIdStr) {
      res.status(400).json({ success: false, error: 'userId required' });
      return;
    }

    const oid = toObjectId(userIdStr);
    if (!oid) {
      res.status(400).json({ success: false, error: 'Invalid userId format' });
      return;
    }

    const db = await getDatabase();

    // Find user — try ObjectId first, then string _id
    let user = await db.collection('profiles').findOne({ _id: oid });
    if (!user) {
      user = await db.collection('profiles').findOne({ _id: userIdStr as any });
    }

    if (!user) {
        const count = await db.collection('profiles').countDocuments();
console.log(`❌ Not found. DB="${db.databaseName}" has ${count} profiles`);
      res.status(404).json({ success: false, error: 'Profile not found. Create a profile first.' });
      return;
    }

    console.log(`✅ Found user: ${user.name}`);

    await db.collection('matches').deleteMany({ userId: oid });

    const candidates = await db.collection('profiles')
      .find({ _id: { $ne: user._id }, profileStatus: 'approved', paymentStatus: 'completed' })
      .toArray();

    const records: any[] = [];
    for (const c of candidates) {
      if (applyHardFilters(user, c).passes) {
        records.push({
          userId: oid,
          candidateId: c._id,
          score: calculateScore(user, c),
          hardFiltersPassed: true,
          status: 'suggested',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
      }
    }

    if (records.length > 0) await db.collection('matches').insertMany(records);
    console.log(`✅ Generated ${records.length} matches`);

    res.json({ success: true, generated: records.length, matches: records });
  } catch (error) {
    console.error('❌ Generate error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

// GET /api/matches/debug/:userId
router.get('/debug/:userId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userIdStr = getId(req.params.userId);
    if (!userIdStr) {
      res.status(400).json({ success: false, error: 'userId required' });
      return;
    }
    const oid = toObjectId(userIdStr);
    const db = await getDatabase();

    let user = oid ? await db.collection('profiles').findOne({ _id: oid }) : null;
    if (!user) user = await db.collection('profiles').findOne({ _id: userIdStr as any });

    if (!user) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }

    const candidates = await db.collection('profiles').find({}).toArray();
    const results: any = {
      user: { id: user._id, name: user.name },
      totalCandidates: candidates.length,
      passed: 0,
      rejected: 0,
      rejectionReasons: {},
    };

    for (const c of candidates) {
      const r = applyHardFilters(user, c);
      if (r.passes) results.passed++;
      else {
        results.rejected++;
        for (const rej of r.rejections) {
          results.rejectionReasons[rej.reason] = (results.rejectionReasons[rej.reason] || 0) + 1;
        }
      }
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

export default router;