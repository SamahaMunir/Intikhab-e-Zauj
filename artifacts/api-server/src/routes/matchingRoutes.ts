import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection';
import { createMatchDocument, Match } from '../db/matches-schema';
import {
checkHardFilters,
filterCandidatesByHardFilters,
DEFAULT_HARD_FILTER_CONFIG,
UserProfile,
} from '../lib/hard-filters';
import { computeMatchScore } from '../lib/scoring';
const router = Router();

function getSingleParam(value: string | string[] | undefined): string | undefined {
if (Array.isArray(value)) {
return value[0];
}
return value;
}

function getProfileIdFilter(userId: string) {
  if (ObjectId.isValid(userId)) {
    return { _id: new ObjectId(userId) };
  }

  return { _id: userId as unknown as ObjectId };
}
console.log("MATCHING ROUTES ACTIVE");
/**

POST /api/matches/generate/:userId

Generate all possible matches for a user



Gets all opposite-gender approved users




Applies hard filters




Scores with soft scoring




Saves to database



Returns: { generated: number, matches: [] }
*/
router.post('/generate/:userId', async (req: Request, res: Response) => {
try {
const userId = getSingleParam(req.params.userId);
if (!userId) {
return res.status(400).json({
error: 'userId required',
});
}
const db = await getDatabase();
const profilesCol = db.collection<UserProfile>('profiles');
const matchesCol = db.collection<Match>('matches');
// 1. GET THE USER
const user = await profilesCol.findOne(getProfileIdFilter(userId));
if (!user) {
return res.status(200).json({
success: true,
generated: 0,
matches: [],
warning: 'User not found',
});
}
if (user.profileStatus !== 'approved') {
return res.status(400).json({
error: 'Profile not approved',
message: 'Only approved profiles can have matches generated',
});
}
// 2. GET OPPOSITE-GENDER CANDIDATES
const candidates = await profilesCol
.find({
gender: { $ne: user.gender },
profileStatus: 'approved',
_id: { $ne: user._id },
})
.toArray();
console.log(`\n📊 Generating matches for ${user.name}`);
console.log(`   Total candidates: ${candidates.length}`);
// 3. APPLY HARD FILTERS
const { passed: hardFilterPassed, rejected: hardFilterRejected } =
filterCandidatesByHardFilters(user, candidates, DEFAULT_HARD_FILTER_CONFIG);
console.log(`   After hard filters: ${hardFilterPassed.length} passed`);
console.log(`   Rejected: ${hardFilterRejected.length}`);
// 4. SCORE CANDIDATES & CREATE MATCHES
const matchesToInsert: Match[] = [];
const existingMatches = await matchesCol
.find({ userId: new ObjectId(userId) })
.toArray();
const existingCandidateIds = new Set(
existingMatches.map(m => m.candidateId.toString())
);
for (const candidate of hardFilterPassed) {
// Skip if match already exists
if (!candidate._id || existingCandidateIds.has(candidate._id.toString())) {
continue;
}
// Compute score
const { total, breakdown } = computeMatchScore(user, candidate);
// Only keep matches with score >= 40
if (total < 40) {
continue;
}
// Create match document
const matchDoc = createMatchDocument(
user._id,
candidate._id,
total,
breakdown,
true,
[]
);
matchesToInsert.push(matchDoc);
}
// 5. SAVE MATCHES TO DATABASE
matchesToInsert.sort((a, b) => b.score - a.score);
const topMatches = matchesToInsert.slice(0, 10);

if (topMatches.length > 0) {
  await matchesCol.insertMany(topMatches);
  console.log(`   ✓ Saved ${topMatches.length} matches`);
} else {
  console.log(`   ℹ No matches above score threshold`);
}
return res.json({
success: true,
generated: topMatches.length,
matches: topMatches,
});
} catch (error) {
console.error('❌ Match generation error:', error);
return res.status(500).json({
error: 'Match generation failed',
message: error instanceof Error ? error.message : 'Unknown error',
});
}
});

/**

GET /api/matches

Get all suggested matches for a user

Query params:


userId (required): User's ID




status (optional): 'suggested', 'approved', 'rejected'



Returns: { total: number, matches: [] }
*/
router.get('/', async (req: Request, res: Response) => {
try {
const { userId, status } = req.query;
if (!userId || typeof userId !== 'string') {
return res.status(400).json({
error: 'userId required',
});
}
const db = await getDatabase();
const matchesCol = db.collection<Match>('matches');
const profilesCol = db.collection<UserProfile>('profiles');
// Build query
const query: any = {
$or: [
{ userId: new ObjectId(userId) },
{ candidateId: new ObjectId(userId) },
],
};
// Filter by status if provided
if (status && status !== 'all') {
query.status = status;
} else {
query.status = 'suggested'; // Default to suggested
}
// Get matches
const matches = await matchesCol
.find(query)
.sort({ score: -1 })
.toArray();
// Enrich with candidate details
const enriched = await Promise.all(
  matches.map(async match => {
    // Determine which is the candidate
    const candidateId = match.userId.toString() === userId ? match.candidateId : match.userId;
    const candidate = await profilesCol.findOne({
      _id: typeof candidateId === 'string' ? new ObjectId(candidateId) : candidateId,
    });

    return {
      ...match,
      candidate: candidate
        ? {
            id: candidate._id,
            name: candidate.name,
            age: new Date().getFullYear() - new Date(candidate.dob).getFullYear(),
            city: candidate.city,
            education: candidate.education,
            photo: (candidate as UserProfile & { photo?: string }).photo,
          }
        : null,
    };
  })
);
return res.json({
total: enriched.length,
matches: enriched,
});
} catch (error) {
console.error('❌ Get matches error:', error);
return res.status(500).json({
error: 'Failed to fetch matches',
message: error instanceof Error ? error.message : 'Unknown error',
});
}
});

/**

GET /api/matches/:matchId

Get detailed match information

Returns: Full match object with score breakdown
*/
router.get('/:matchId', async (req: Request, res: Response) => {
try {
const matchId = getSingleParam(req.params.matchId);
if (!matchId) {
return res.status(400).json({
error: 'matchId required',
});
}
const db = await getDatabase();
const matchesCol = db.collection<Match>('matches');
const match = await matchesCol.findOne({
_id: new ObjectId(matchId),
});
if (!match) {
return res.status(404).json({
error: 'Match not found',
});
}
return res.json(match);
} catch (error) {
console.error('❌ Get match error:', error);
return res.status(500).json({
error: 'Failed to fetch match',
});
}
});

/**

PUT /api/staff/matches/:matchId/approve

Staff approves a match

Returns: { success: true, message: '...' }
*/
router.put('/:matchId/approve', async (req: Request, res: Response) => {
try {
const matchId = getSingleParam(req.params.matchId);
if (!matchId) {
return res.status(400).json({
error: 'matchId required',
});
}
const staffId = (req as any).user?.id; // From auth middleware
const db = await getDatabase();
const matchesCol = db.collection<Match>('matches');
const result = await matchesCol.updateOne(
{ _id: new ObjectId(matchId) },
{
$set: {
status: 'approved',
approvedAt: new Date(),
approvedBy: staffId ? new ObjectId(staffId) : undefined,
},
}
);
if (result.matchedCount === 0) {
return res.status(404).json({
error: 'Match not found',
});
}
return res.json({
success: true,
message: 'Match approved',
});
} catch (error) {
console.error('❌ Approve match error:', error);
return res.status(500).json({
error: 'Failed to approve match',
});
}
});

/**

PUT /api/staff/matches/:matchId/reject

Staff rejects a match with reason

Body: { reason: string }
Returns: { success: true, message: '...' }
*/
router.put('/:matchId/reject', async (req: Request, res: Response) => {
try {
const matchId = getSingleParam(req.params.matchId);
if (!matchId) {
return res.status(400).json({
error: 'matchId required',
});
}
const { reason } = req.body;
const staffId = (req as any).user?.id;
const db = await getDatabase();
const matchesCol = db.collection<Match>('matches');
const result = await matchesCol.updateOne(
{ _id: new ObjectId(matchId) },
{
$set: {
status: 'rejected',
rejectionReason: reason || 'No reason provided',
rejectedAt: new Date(),
rejectedBy: staffId ? new ObjectId(staffId) : undefined,
},
}
);
if (result.matchedCount === 0) {
return res.status(404).json({
error: 'Match not found',
});
}
return res.json({
success: true,
message: 'Match rejected',
});
} catch (error) {
console.error('❌ Reject match error:', error);
return res.status(500).json({
error: 'Failed to reject match',
});
}
});

/**

POST /api/staff/matches/generate-all

Generate matches for ALL approved users

Returns: { generated: number, users: number }
*/
router.post('/generate-all', async (req: Request, res: Response) => {
try {
const db = await getDatabase();
const profilesCol = db.collection<UserProfile>('profiles');
// Get all approved users
const approvedUsers = await profilesCol
.find({ profileStatus: 'approved' })
.toArray();
console.log(`\n🔄 Bulk match generation for ${approvedUsers.length} users`);
let totalGenerated = 0;
const userResults: any[] = [];
// Generate matches for each user
for (const user of approvedUsers) {
// Create a fake request/response for generate endpoint
const mockReq = {
params: { userId: user._id.toString() },
};
const mockRes = {
json: (data: any) => {
if (data.success) {
totalGenerated += data.generated || 0;
userResults.push({
userId: user._id,
name: user.name,
generated: data.generated || 0,
});
}
},
status: () => mockRes,
};
// Call generate endpoint logic
await (router.stack.find(
r => r.route?.path === '/generate/:userId' && (r.route as any)?.methods?.post
) as any)?.handle?.({ ...mockReq, user }, mockRes);
}
console.log(`✓ Generated ${totalGenerated} matches for ${userResults.length} users`);
return res.json({
success: true,
generated: totalGenerated,
users: userResults.length,
details: userResults,
});
} catch (error) {
console.error('❌ Bulk generation error:', error);
return res.status(500).json({
error: 'Bulk generation failed',
});
}
});

/**

GET /api/staff/matches/debug/:userId

DEBUG: Show why candidates pass/fail hard filters

Returns: Statistics about filter failures
*/
router.get('/debug/:userId', async (req: Request, res: Response) => {
try {
const userId = getSingleParam(req.params.userId);
if (!userId) {
return res.status(400).json({
error: 'userId required',
});
}
const db = await getDatabase();
const profilesCol = db.collection<UserProfile>('profiles');
// Get user
const user = await profilesCol.findOne(getProfileIdFilter(userId));
if (!user) {
return res.status(200).json({
user: null,
totalCandidates: 0,
passed: 0,
rejected: 0,
passRate: '0.0%',
rejectionReasons: {},
sampleFailures: [],
warning: 'User not found',
});
}
// Get candidates
const candidates = await profilesCol
.find({
gender: { $ne: user.gender },
profileStatus: 'approved',
_id: { $ne: user._id },
})
.toArray();
// Analyze hard filters
const { passed, rejected } = filterCandidatesByHardFilters(
user,
candidates,
DEFAULT_HARD_FILTER_CONFIG
);
// Count rejection reasons
const reasonCounts: Record<string, number> = {};
for (const { reasons } of rejected) {
for (const reason of reasons) {
const key = reason.split(':')[0].trim();
reasonCounts[key] = (reasonCounts[key] || 0) + 1;
}
}
return res.json({
user: { id: user._id, name: user.name },
totalCandidates: candidates.length,
passed: passed.length,
rejected: rejected.length,
passRate: `${((passed.length / candidates.length) * 100).toFixed(1)}%`,
rejectionReasons: reasonCounts,
sampleFailures: rejected.slice(0, 5).map(r => ({
name: r.candidate.name,
reasons: r.reasons,
})),
});
} catch (error) {
console.error('❌ Debug error:', error);
return res.status(500).json({
error: 'Debug failed',
});
}
});

export default router;