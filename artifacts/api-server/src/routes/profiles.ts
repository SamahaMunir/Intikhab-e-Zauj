import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { logAudit } from '../db/auditLogs';
import { getDatabase } from '../db/connection';

const router = Router();

/**
 * POST /api/staff/profiles/:id/approve
 * Approve a user profile (staff only)
 */
router.post('/profiles/:id/approve', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { staffEmail, staffId, staffRole } = req.body;

    // Validate input
    if (!staffEmail) {
      res.status(400).json({ error: 'staffEmail required' });
      return;
    }

    console.log(`📝 Approving profile: ${id} by ${staffEmail}`);

    // Get database
    const db = await getDatabase();
    const usersCollection = db.collection('users');

    // Try to find user by either string ID or ObjectId
    let query: any = { _id: id };
    
    // If it looks like a MongoDB ObjectId (24 hex chars), convert it
    if (ObjectId.isValid(id) && id.length === 24) {
      query = { _id: new ObjectId(id) };
    }

    console.log(`🔍 Query: ${JSON.stringify(query)}`);

    // Find the user first (to verify it exists)
    const user = await usersCollection.findOne(query);
    
    if (!user) {
      console.warn(`⚠️  Profile not found: ${id}`);
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    console.log(`✓ Found user: ${user.email || user._id}`);

    // Update profile status
    const result = await usersCollection.updateOne(
      query,
      { 
        $set: { 
          profileStatus: 'approved', 
          approvedAt: new Date(),
          approvedBy: staffEmail
        } 
      }
    );

    console.log(`✓ Update result:`, result);

    if (result.modifiedCount === 0) {
      console.warn(`⚠️  No documents modified for: ${id}`);
      res.status(400).json({ error: 'Profile was not updated' });
      return;
    }

    // LOG THIS ACTION ← Audit logging
    await logAudit(
      staffEmail,
      staffId || 'unknown',
      (staffRole as any) || 'staff',
      'approve_profile',
      'profile',
      id,
      'Profile meets guidelines',
      { user_email: user.email }
    );

    console.log(`✅ Profile approved and logged`);

    res.json({ 
      success: true, 
      message: 'Profile approved',
      modifiedCount: result.modifiedCount,
      profileId: id
    });
    return;

  } catch (error) {
    console.error('❌ Error approving profile:', error);
    res.status(500).json({ 
      error: 'Failed to approve profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;