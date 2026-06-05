import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection';
import { applyHardFilters } from '../lib/hard-filters';
import { calculateScore } from '../lib/scoring';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// ── Profile type classification ───────────────────────────────────────────────
// Staff profiles are created by staff via data-entry form.
// User profiles are created by self-registration or seed data.
const STAFF_SOURCES = ['staff_entry', 'paper', 'whatsapp', 'walkin', 'referral', 'phone'];

function getProfileType(profile: any): 'staff' | 'user' {
  return STAFF_SOURCES.includes(profile?.source) ? 'staff' : 'user';
}

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

    // Profile completion gate — incomplete profiles cannot retrieve matches
    const requestingUser = await db.collection('profiles').findOne(
      { _id: oid },
      { projection: { profileCompletion: 1, gender: 1 } }
    );
    if (requestingUser && (requestingUser.profileCompletion || 0) < 100) {
      res.json({ success: true, total: 0, matches: [], locked: true, reason: 'profile_incomplete' });
      return;
    }

    // Query matches by BOTH ObjectId and string (covers either storage type)
    const rawMatches = await db.collection('matches')
      .find({ userId: { $in: [oid, userIdStr] }, status: 'suggested' })
      .sort({ score: -1 })
      .toArray();

    // Deduplicate at query level: keep only the highest-score record per candidateId
    const bestByCandidate = new Map<string, any>();
    for (const m of rawMatches) {
      const cid = m.candidateId?.toString();
      if (!cid) continue;
      const existing = bestByCandidate.get(cid);
      if (!existing || m.score > existing.score) {
        bestByCandidate.set(cid, m);
      }
    }
    const matches = Array.from(bestByCandidate.values()).sort((a, b) => b.score - a.score);

    console.log(`✅ Found ${rawMatches.length} raw → ${matches.length} deduplicated matches`);

    const enriched = await Promise.all(
      matches.map(async (m) => {
        const candidate = await db.collection('profiles').findOne(
          { _id: m.candidateId },
          { projection: { name: 1, age: 1, dob: 1, city: 1, profession: 1, caste: 1, gender: 1, education: 1, photo: 1, height: 1, houseStatus: 1 } }
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

    const { genderHint } = req.body as { genderHint?: string };

    // ── COMPLETION GATE ───────────────────────────────────────────────────────
    // Matching is locked until profile is 100% complete (photo, all required fields)
    if ((user.profileCompletion || 0) < 100) {
      res.status(403).json({
        success: false,
        error: 'profile_incomplete',
        message: 'Complete your profile before accessing match recommendations.',
        profileCompletion: user.profileCompletion || 0,
      });
      return;
    }

    console.log(`✅ Found user: ${user.name} | DB gender=${user.gender} | genderHint=${genderHint || 'none'}`);

    // ── GENDER REPAIR ─────────────────────────────────────────────────────────
    // If DB gender is missing/invalid but frontend sent a valid hint, repair it.
    // This fixes profiles corrupted by the old wizard bug (defaulted everything to 'male').
    const validHint = genderHint === 'male' || genderHint === 'female';
    const dbGenderValid = user.gender === 'male' || user.gender === 'female';

    if (validHint && (!dbGenderValid || user.gender !== genderHint)) {
      console.log(`🔧 Repairing gender: DB="${user.gender}" → correct="${genderHint}"`);
      await db.collection('profiles').updateOne(
        { _id: user._id },
        { $set: { gender: genderHint, updatedAt: new Date() } }
      );
      user.gender = genderHint; // use repaired value for this request
    }

    // Guard: gender must be resolved before matching
    if (user.gender !== 'male' && user.gender !== 'female') {
      res.status(400).json({
        success: false,
        error: 'Gender not set on profile. Complete the profile wizard (Step 1) and select your gender.',
      });
      return;
    }

    console.log(`🎯 Matching as: ${user.gender} — will find ${user.gender === 'male' ? 'female' : 'male'} candidates`);

    // Clear ALL existing match records for this user (both ObjectId and string userId)
    await db.collection('matches').deleteMany({ $or: [{ userId: oid }, { userId: userIdStr }] });

    // Fetch opposite-gender approved profiles only — DB-level filter, not just hard-filter
    // Includes all sources: seed profiles + staff-created + user-registered (once approved)
    const oppositeGender = user.gender === 'male' ? 'female' : 'male';
    console.log(`🔍 Querying candidates: gender=${oppositeGender}, profileStatus=approved, paymentStatus=completed`);

    const candidates = await db.collection('profiles')
      .find({
        _id: { $ne: user._id },
        gender: oppositeGender,               // ← DB-level gender filter, not just hard-filter
        profileStatus: 'approved',
        paymentStatus: 'completed',
      })
      .toArray();

    console.log(`🔍 ${candidates.length} candidates found (seed + real users). Applying hard filters...`);
    let passed = 0;
    let rejected = 0;
    for (const c of candidates) {
      const result = applyHardFilters(user, c);
      if (result.passes) {
        passed++;
      } else {
        rejected++;
        console.log(`  ❌ ${c.name || c.email}: ${result.rejections.map(r => r.reason).join(', ')}`);
      }
    }
    console.log(`  ✅ ${passed} pass | ❌ ${rejected} rejected by hard filters`);

    const records: any[] = [];
    for (const c of candidates) {
      if (applyHardFilters(user, c).passes) {
        const scoreObj = calculateScore(user, c);
        records.push({
          userId: oid,
          candidateId: c._id,
          score: scoreObj.total,
          scoreBreakdown: scoreObj,
          leftProfileType: getProfileType(user),
          rightProfileType: getProfileType(c),
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

// POST /api/staff/matches/generate-all-staff
// Generates matches for ALL staff-created profiles without requiring user login.
// Staff profiles have no account so they can't call generate/:userId themselves.
router.post('/generate-all-staff', async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDatabase();

    // Auto-approve any existing staff profiles that were created before this fix
    // (old create-user set profileStatus: 'pending', profileCompletion: 60/75)
    const patched = await db.collection('profiles').updateMany(
      {
        source: { $in: STAFF_SOURCES },
        $or: [
          { profileStatus: { $ne: 'approved' } },
          { profileCompletion: { $lt: 100 } },
          { paymentStatus: { $ne: 'completed' } },
        ],
      },
      {
        $set: {
          profileStatus:     'approved',
          profileCompletion: 100,
          paymentStatus:     'completed',
          updatedAt: new Date(),
        },
      }
    );
    if (patched.modifiedCount > 0) {
      console.log(`🔧 Auto-approved ${patched.modifiedCount} legacy staff profiles`);
    }

    // Fetch all approved, completed staff profiles
    const staffProfiles = await db.collection('profiles')
      .find({
        source: { $in: STAFF_SOURCES },
        profileStatus: 'approved',
        profileCompletion: { $gte: 100 },
      })
      .toArray();

    console.log(`🔧 generate-all-staff: found ${staffProfiles.length} staff profiles`);

    let totalGenerated = 0;

    for (const staffProfile of staffProfiles) {
      const oppositeGender = staffProfile.gender === 'male' ? 'female' : 'male';

      // All approved+completed opposite-gender profiles (both staff and user)
      const candidates = await db.collection('profiles')
        .find({
          _id: { $ne: staffProfile._id },
          gender: oppositeGender,
          profileStatus: 'approved',
          paymentStatus: 'completed',
        })
        .toArray();

      // Remove old suggested matches for this staff profile only
      await db.collection('matches').deleteMany({
        userId: staffProfile._id,
        status: 'suggested',
      });

      const bulkOps: any[] = [];
      for (const c of candidates) {
        if (applyHardFilters(staffProfile, c).passes) {
          const scoreObj = calculateScore(staffProfile, c);
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          bulkOps.push({
            updateOne: {
              filter: { userId: staffProfile._id, candidateId: c._id },
              update: {
                $set: {
                  score:             scoreObj.total,
                  scoreBreakdown:    scoreObj,
                  leftProfileType:   'staff',
                  rightProfileType:  getProfileType(c),
                  hardFiltersPassed: true,
                  updatedAt:         new Date(),
                  expiresAt,
                },
                $setOnInsert: {
                  status:    'suggested',
                  createdAt: new Date(),
                },
              },
              upsert: true,
            },
          });
        }
      }

      if (bulkOps.length > 0) {
        await db.collection('matches').bulkWrite(bulkOps, { ordered: false });
        totalGenerated += bulkOps.length;
      }
      console.log(`  ${staffProfile.name} (${staffProfile.gender}) → ${bulkOps.length} matches`);
    }

    res.json({
      success: true,
      staffProfilesProcessed: staffProfiles.length,
      matchesGenerated: totalGenerated,
    });
  } catch (error) {
    console.error('❌ generate-all-staff error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

// GET /api/staff/matches/staff-view
// Staff-specific match view: only Staff↔Staff and Staff↔User (excludes User↔User).
// Returns enriched matches with leftProfileType + rightProfileType.
router.get('/staff-view', async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDatabase();

    const allMatches = await db.collection('matches')
      .find({ status: { $in: ['suggested', 'approved', 'rejected'] } })
      .sort({ score: -1 })
      .limit(500)
      .toArray();

    const enriched = await Promise.all(
      allMatches.map(async (m) => {
        const [userDoc, candidateDoc] = await Promise.all([
          db.collection('profiles').findOne(
            { _id: m.userId },
            { projection: { name: 1, age: 1, city: 1, gender: 1, caste: 1, photo: 1, source: 1 } }
          ),
          db.collection('profiles').findOne(
            { _id: m.candidateId },
            { projection: { name: 1, age: 1, city: 1, profession: 1, caste: 1, gender: 1, photo: 1, source: 1 } }
          ),
        ]);

        const leftType  = (m.leftProfileType  as string | undefined) || getProfileType(userDoc);
        const rightType = (m.rightProfileType as string | undefined) || getProfileType(candidateDoc);

        return { ...m, user: userDoc, candidate: candidateDoc, leftProfileType: leftType, rightProfileType: rightType };
      })
    );

    // Filter: exclude pure User↔User; deduplicate bidirectional pairs (keep highest score)
    const seen = new Set<string>();
    const staffRelevant: typeof enriched = [];
    for (const m of enriched) {
      if (m.leftProfileType !== 'staff' && m.rightProfileType !== 'staff') continue;
      const id1 = (m as any).userId?.toString() || '';
      const id2 = (m as any).candidateId?.toString() || '';
      const key = [id1, id2].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      staffRelevant.push(m);
    }

    res.json({ success: true, total: staffRelevant.length, matches: staffRelevant });
  } catch (error) {
    console.error('❌ staff-view error:', error);
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

// GET /api/matches/all — staff sees every match across all users
router.get('/all', async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDatabase();
    const matches = await db.collection('matches')
      .find({ status: { $in: ['suggested', 'approved', 'rejected'] } })
      .sort({ score: -1 })
      .limit(200)
      .toArray();

    const enriched = await Promise.all(
      matches.map(async (m) => {
        const user = await db.collection('profiles').findOne(
          { _id: m.userId },
          { projection: { name: 1, age: 1, city: 1, gender: 1, caste: 1 } }
        );
        const candidate = await db.collection('profiles').findOne(
          { _id: m.candidateId },
          { projection: { name: 1, age: 1, city: 1, profession: 1, caste: 1, gender: 1, photo: 1 } }
        );
        return { ...m, user, candidate };
      })
    );

    res.json({ success: true, total: enriched.length, matches: enriched });
  } catch (error) {
    console.error('❌ Get all matches error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

// PATCH /api/matches/:matchId/status — staff approves or rejects a match
router.patch('/:matchId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const matchIdStr = getId(req.params.matchId as string | string[] | undefined);
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      res.status(400).json({ success: false, error: 'Status must be approved or rejected' });
      return;
    }

    const oid = toObjectId(matchIdStr || '');
    if (!oid) {
      res.status(400).json({ success: false, error: 'Invalid matchId' });
      return;
    }

    const db = await getDatabase();
    await db.collection('matches').updateOne(
      { _id: oid },
      { $set: { status, updatedAt: new Date() } }
    );

    res.json({ success: true, message: `Match ${status}` });
  } catch (error) {
    console.error('❌ Update match status error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

export default router;