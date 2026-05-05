import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { logAudit } from '../db/auditLogs';
import { getDatabase } from '../db/connection';
import { authMiddleware, staffOnlyMiddleware, type AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /api/staff/profiles/:id/approve
 * Approve a user profile (staff only)
 */
router.post(
  '/profiles/:id/approve',
  authMiddleware,
  staffOnlyMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { reason } = req.body;

    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const staffEmail = req.user.email;
    const staffId = req.user.id;
    const staffRole = req.user.role as 'staff' | 'admin';

    console.log(`📝 Approving profile: ${id} by ${staffEmail}`);

    const db = await getDatabase();
    const usersCollection = db.collection('users');

    let query: any = { _id: id };

    if (ObjectId.isValid(id) && id.length === 24) {
      query = { _id: new ObjectId(id) };
    }

    console.log(`🔍 Query: ${JSON.stringify(query)}`);

    const user = await usersCollection.findOne(query);

    if (!user) {
      console.warn(`⚠️  Profile not found: ${id}`);
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    console.log(`✓ Found user: ${user.email || user._id}`);

    const result = await usersCollection.updateOne(
      query,
      {
        $set: {
          profileStatus: 'approved',
          approvedAt: new Date(),
          approvedBy: staffEmail,
        },
      }
    );

    console.log(`✓ Update result:`, result);

    if (result.modifiedCount === 0) {
      console.warn(`⚠️  No documents modified for: ${id}`);
      res.status(400).json({ error: 'Profile was not updated' });
      return;
    }

    await logAudit(
      staffEmail,
      staffId,
      staffRole,
      'approve_profile',
      'profile',
      id,
      reason || 'Profile meets guidelines',
      { user_email: user.email }
    );

    console.log(`✅ Profile approved and logged`);

    res.json({
      success: true,
      message: 'Profile approved',
      modifiedCount: result.modifiedCount,
      profileId: id,
    });

  } catch (error) {
    console.error('❌ Error approving profile:', error);
    res.status(500).json({
      error: 'Failed to approve profile',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  }
);

export default router;