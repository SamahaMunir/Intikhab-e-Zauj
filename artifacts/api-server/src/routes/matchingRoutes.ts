import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection';
import { applyHardFilters } from '../lib/hard-filters';
import { calculateScore } from '../lib/scoring';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Helper to extract string from userId (handles string | string[])
function getUserId(id: string | string[] | undefined): string | null {
  if (!id) return null;
  if (Array.isArray(id)) return id[0] || null;
  return id;
}

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userIdStr = getUserId(req.query.userId as string | string[] | undefined);
    if (!userIdStr) {
      res.status(400).json({ success: false, error: 'userId required' });
      return;
    }

    const db = await getDatabase();
    const userObjectId = new ObjectId(userIdStr);
    const user = await db.collection('profiles').findOne({ _id: userObjectId });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const matches = await db.collection('matches')
      .find({ userId: userObjectId, status: 'suggested' })
      .sort({ score: -1 })
      .toArray();

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
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.post('/generate/:userId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userIdStr = getUserId(req.params.userId);
    if (!userIdStr) {
      res.status(400).json({ success: false, error: 'userId required' });
      return;
    }

    const db = await getDatabase();
    const userObjectId = new ObjectId(userIdStr);
    const user = await db.collection('profiles').findOne({ _id: userObjectId });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    await db.collection('matches').deleteMany({ userId: userObjectId });

    const candidates = await db.collection('profiles')
      .find({
        _id: { $ne: userObjectId },
        profileStatus: 'approved',
        paymentStatus: 'completed',
      })
      .toArray();

    const matchRecords: any[] = [];
    for (const candidate of candidates) {
      const filterResult = applyHardFilters(user, candidate);
      if (filterResult.passes) {
        matchRecords.push({
          userId: userObjectId,
          candidateId: candidate._id,
          score: calculateScore(user, candidate),
          hardFiltersPassed: true,
          status: 'suggested',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
      }
    }

    if (matchRecords.length > 0) {
      await db.collection('matches').insertMany(matchRecords);
    }

    const created = await db.collection('matches')
      .find({ userId: userObjectId })
      .sort({ score: -1 })
      .toArray();

    res.json({ success: true, generated: matchRecords.length, matches: created });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/debug/:userId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userIdStr = getUserId(req.params.userId);
    if (!userIdStr) {
      res.status(400).json({ success: false, error: 'userId required' });
      return;
    }

    const db = await getDatabase();
    const userObjectId = new ObjectId(userIdStr);
    const user = await db.collection('profiles').findOne({ _id: userObjectId });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
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

    for (const candidate of candidates) {
      const filterResult = applyHardFilters(user, candidate);
      if (filterResult.passes) {
        results.passed++;
      } else {
        results.rejected++;
        for (const rejection of filterResult.rejections) {
          results.rejectionReasons[rejection.reason] = (results.rejectionReasons[rejection.reason] || 0) + 1;
        }
      }
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

export default router;