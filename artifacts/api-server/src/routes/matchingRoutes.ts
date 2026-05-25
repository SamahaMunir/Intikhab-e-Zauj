import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection';
import { applyHardFilters } from '../lib/hard-filters';
import { calculateScore } from '../lib/scoring';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

/**
 * DEBUG: Search for specific profile
 * GET /api/matches/debug-find/:userId
 */
router.get('/debug-find/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userIdParam = getSingleParam(req.params.userId as string | string[]);
    const db = await getDatabase();
    const profilesCol = db.collection('profiles');
    
    console.log(`\n🔍 Searching for: ${userIdParam}`);
    
    // Try as ObjectId
    try {
      const userObjectId = new ObjectId(userIdParam);
      const found = await profilesCol.findOne({ _id: userObjectId });
      if (found) {
        console.log('✅ Found with ObjectId!');
        return res.json({ success: true, found: true, profile: found });
      }
      console.log('❌ Not found with ObjectId');
    } catch (err) {
      console.log('⚠️ Invalid ObjectId format:', err);
    }
    
    // Try as string
    const foundStr = await profilesCol.findOne({ _id: userIdParam });
    if (foundStr) {
      console.log('✅ Found with string ID!');
      return res.json({ success: true, found: true, profile: foundStr });
    }
    
    console.log('❌ Not found as string either');
    
    // List all
    const all = await profilesCol.find({}).toArray();
    res.json({
      success: true,
      found: false,
      totalInDb: all.length,
      profileIds: all.map(p => p._id.toString()),
    });
  } catch (error) {
    console.error('❌ Error searching:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search',
    });
  }
});

/**
 * DEBUG: List all profiles
 * GET /api/matches/debug-profiles
 */
router.get('/debug-profiles', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDatabase();
    const profilesCol = db.collection('profiles');
    
    const allProfiles = await profilesCol.find({}).toArray();
    const count = await profilesCol.countDocuments();
    
    console.log(`📊 Total profiles in DB: ${count}`);
    console.log('Profile IDs:', allProfiles.map(p => ({ _id: p._id.toString(), name: p.name })));
    
    res.json({
      success: true,
      totalCount: count,
      profiles: allProfiles.map(p => ({
        _id: p._id.toString(),
        name: p.name || '(no name)',
        email: p.email || '(no email)',
      })),
    });
  } catch (error) {
    console.error('❌ Error listing profiles:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list profiles',
    });
  }
});

/**
 * Helper: Get single string param (handles string | string[])
 */
function getSingleParam(param: string | string[] | undefined): string | null {
  if (!param) return null;
  if (Array.isArray(param)) return param[0] || null;
  return param;
}

/**
 * GENERATE MATCHES FOR A USER
 * POST /api/matches/generate/:userId
 * 
 * Finds all compatible profiles and creates match records
 */
router.post('/generate/:userId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userIdParam = getSingleParam(req.params.userId);
    if (!userIdParam) {
      res.status(400).json({ success: false, error: 'userId is required' });
      return;
    }

    console.log(`\n📍 GENERATE MATCHES for user: ${userIdParam}`);

    // Convert string userId to ObjectId
    let userObjectId: ObjectId;
    try {
      userObjectId = new ObjectId(userIdParam);
    } catch (err) {
      console.error('❌ Invalid ObjectId format:', userIdParam);
      res.status(400).json({
        success: false,
        error: `Invalid user ID format: "${userIdParam}" is not a valid ObjectId`,
      });
      return;
    }

    const db = await getDatabase();
    const profilesCol = db.collection('profiles');
    const matchesCol = db.collection('matches');

    // Find the user
    console.log(`🔍 Searching for user with ObjectId: ${userObjectId.toString()}`);
    let user = await profilesCol.findOne({ _id: userObjectId });
    
    if (!user) {
      console.log(`⚠️  Not found with ObjectId, trying string ID...`);
      user = await profilesCol.findOne({ _id: userIdParam });
    }
    
    if (!user) {
      console.error(`❌ User not found with ID: ${userIdParam}`);
      res.status(404).json({
        success: false,
        error: `User not found`,
      });
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);

    // Clear old matches for this user
    await matchesCol.deleteMany({ userId: userObjectId });
    console.log(`🧹 Cleared old matches for user`);

    // Get all candidate profiles
    const candidates = await profilesCol
      .find({
        _id: { $ne: userObjectId },
        profileStatus: 'approved',
        paymentStatus: 'completed',
      })
      .toArray();

    console.log(`📊 Evaluating ${candidates.length} candidates...`);

    const matchRecords: any[] = [];
    let passedCount = 0;
    let rejectedCount = 0;

    // Evaluate each candidate
    for (const candidate of candidates) {
      // Apply hard filters
      const filterResult = applyHardFilters(user, candidate);

      if (filterResult.passes) {
        // Calculate compatibility score
        const score = calculateScore(user, candidate);

        // Create match record
        const match = {
          userId: userObjectId,
          candidateId: candidate._id,
          score: score,
          hardFiltersPassed: true,
          status: 'suggested',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        };

        matchRecords.push(match);
        passedCount++;
      } else {
        rejectedCount++;
      }
    }

    // Save all matches
    if (matchRecords.length > 0) {
      await matchesCol.insertMany(matchRecords);
    }

    console.log(`✅ Generated ${passedCount} matches`);
    console.log(`❌ Rejected ${rejectedCount} candidates`);

    // Fetch created matches with candidate details
    const createdMatches = await matchesCol
      .find({ userId: userObjectId })
      .sort({ score: -1 })
      .toArray();

    // Enrich with candidate details
    const enrichedMatches = [];
    for (const m of createdMatches) {
      const candidate = await profilesCol.findOne(
        { _id: m.candidateId },
        { projection: { name: 1, age: 1, city: 1, education: 1, photo: 1 } }
      );
      enrichedMatches.push({
        _id: m._id,
        userId: m.userId,
        candidateId: m.candidateId,
        candidate: candidate,
        score: m.score,
        status: m.status,
        createdAt: m.createdAt,
        expiresAt: m.expiresAt,
        hardFiltersPassed: m.hardFiltersPassed,
      });
    }

    res.json({
      success: true,
      generated: passedCount,
      total: enrichedMatches.length,
      matches: enrichedMatches,
    });
  } catch (error) {
    console.error('❌ Error generating matches:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate matches',
    });
  }
});

/**
 * GET MATCHES FOR A USER
 * GET /api/matches?userId=:userId&status=suggested
 * 
 * Returns all active matches for a user with candidate details
 */
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userIdParam = getSingleParam(req.query.userId as string | string[]);
    const statusParam = getSingleParam(req.query.status as string | string[] | undefined);

    if (!userIdParam) {
      res.status(400).json({
        success: false,
        error: 'userId query parameter is required',
      });
      return;
    }

    console.log(`\n📥 Getting matches for userId: ${userIdParam}, status: ${statusParam || 'all'}`);

    // Convert string userId to ObjectId
    let userObjectId: ObjectId;
    try {
      userObjectId = new ObjectId(userIdParam);
    } catch (err) {
      console.error('❌ Invalid ObjectId format:', userIdParam);
      res.status(400).json({
        success: false,
        error: `Invalid user ID format`,
      });
      return;
    }

    const db = await getDatabase();
    const profilesCol = db.collection('profiles');
    const matchesCol = db.collection('matches');

    // Verify user exists
    console.log(`🔍 Searching for user with ObjectId: ${userObjectId.toString()}`);
    
    // Try ObjectId first, then string fallback
    let user = await profilesCol.findOne({ _id: userObjectId });
    
    if (!user) {
      console.log(`⚠️  Not found with ObjectId, trying string ID...`);
      user = await profilesCol.findOne({ _id: userIdParam });
    }
    
    if (!user) {
      console.error(`❌ User not found: ${userIdParam} (ObjectId: ${userObjectId.toString()})`);
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }
    console.log(`✅ Found user: ${user.name}`);

    // Build query
    const query: any = { userId: userObjectId };
    if (statusParam) {
      query.status = statusParam;
    }

    // Get matches
    const matches = await matchesCol
      .find(query)
      .sort({ score: -1 })
      .toArray();

    console.log(`✅ Found ${matches.length} matches`);

    // Enrich with candidate details
    const enrichedMatches = [];
    for (const match of matches) {
      const candidate = await profilesCol.findOne(
        { _id: match.candidateId },
        { projection: { name: 1, age: 1, city: 1, education: 1, photo: 1 } }
      );
      enrichedMatches.push({
        _id: match._id,
        userId: match.userId,
        candidateId: match.candidateId,
        candidate: candidate,
        score: match.score,
        status: match.status,
        createdAt: match.createdAt,
        expiresAt: match.expiresAt,
      });
    }

    res.json({
      success: true,
      total: enrichedMatches.length,
      matches: enrichedMatches,
    });
  } catch (error) {
    console.error('❌ Error fetching matches:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch matches',
    });
  }
});

/**
 * GET SINGLE MATCH
 * GET /api/matches/:matchId
 */
router.get('/:matchId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const matchIdParam = getSingleParam(req.params.matchId as string | string[]);
    if (!matchIdParam) {
      res.status(400).json({ success: false, error: 'matchId is required' });
      return;
    }

    let matchObjectId: ObjectId;
    try {
      matchObjectId = new ObjectId(matchIdParam);
    } catch (err) {
      res.status(400).json({
        success: false,
        error: 'Invalid match ID format',
      });
      return;
    }

    const db = await getDatabase();
    const matchesCol = db.collection('matches');
    const profilesCol = db.collection('profiles');

    const match = await matchesCol.findOne({ _id: matchObjectId });

    if (!match) {
      res.status(404).json({
        success: false,
        error: 'Match not found',
      });
      return;
    }

    // Enrich with candidate details
    const candidate = await profilesCol.findOne(
      { _id: match.candidateId },
      { projection: { name: 1, age: 1, city: 1, education: 1, photo: 1 } }
    );

    res.json({
      success: true,
      match: {
        ...match,
        candidate,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching match:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch match',
    });
  }
});

/**
 * DEBUG - See why candidates pass/fail filters
 * GET /api/matches/debug/:userId
 * 
 * Shows detailed breakdown of hard filter evaluation
 */
router.get('/debug/:userId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userIdParam = getSingleParam(req.params.userId as string | string[]);
    if (!userIdParam) {
      res.status(400).json({ success: false, error: 'userId is required' });
      return;
    }

    console.log(`\n🔍 DEBUG filters for user: ${userIdParam}`);

    // Convert string userId to ObjectId
    let userObjectId: ObjectId;
    try {
      userObjectId = new ObjectId(userIdParam);
    } catch (err) {
      res.status(400).json({
        success: false,
        error: `Invalid user ID format`,
      });
      return;
    }

    const db = await getDatabase();
    const profilesCol = db.collection('profiles');

    // Find user
    const user = await profilesCol.findOne({ _id: userObjectId });
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Get all candidates
    const candidates = await profilesCol
      .find({
        _id: { $ne: userObjectId },
      })
      .toArray();

    const results: any = {
      user: {
        id: user._id,
        name: user.name,
      },
      totalCandidates: candidates.length,
      passed: 0,
      rejected: 0,
      rejectionReasons: {} as Record<string, number>,
      details: [],
    };

    // Evaluate each
    for (const candidate of candidates) {
      const filterResult = applyHardFilters(user, candidate);

      if (filterResult.passes) {
        results.passed++;
      } else {
        results.rejected++;

        // Track rejection reasons
        for (const rejection of filterResult.rejections) {
          const key = rejection.reason;
          results.rejectionReasons[key] = (results.rejectionReasons[key] || 0) + 1;
        }

        // Add detailed entry
        results.details.push({
          candidate: candidate.name,
          rejections: filterResult.rejections.map((r: any) => ({
            reason: r.reason,
            detail: r.detail,
          })),
        });
      }
    }

    res.json(results);
  } catch (error) {
    console.error('❌ Error in debug endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Debug failed',
    });
  }
});

export default router;