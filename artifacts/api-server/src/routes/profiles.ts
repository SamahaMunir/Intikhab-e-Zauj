import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { logAudit } from '../db/auditLogs';
import { getDatabase } from '../db/connection';
import { authMiddleware, staffOnlyMiddleware, type AuthRequest } from '../middleware/auth';
import { sendProfileApprovalEmail, sendProfileRejectionEmail } from '../utils/email';

const router = Router();

/**
 * GET /api/staff/profiles
 * Fetch all profiles (staff only)
 * ✅ UNIFIED: Uses 'profiles' collection
 */
router.get(
  '/',
  authMiddleware,
  staffOnlyMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const status = req.query.status as string | undefined;

      const db = await getDatabase();
      // ✅ FIX: Use 'profiles' collection
      const profilesCollection = db.collection('profiles');

      let query: any = { role: 'applicant' };
      if (status) {
        query.profileStatus = status;
      }

      console.log(`📊 Fetching profiles with query:`, query);

      const profiles = await profilesCollection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      console.log(`✅ Found ${profiles.length} applicant profiles`);

      res.json({
        success: true,
        count: profiles.length,
        data: profiles.map(p => ({
          _id: p._id.toString(),
          name: p.name,
          email: p.email,
          phone: p.phone,
          gender: p.gender,
          dob: p.dob,
          city: p.city,
          education: p.education,
          profession: p.profession,
          income: p.income,
          caste: p.caste,
          height: p.height,
          houseStatus: p.houseStatus,
          bio: p.bio,
          photo: p.photo,
          profileStatus: p.profileStatus,
          profileCompletion: p.profileCompletion,
          paymentStatus: p.paymentStatus,
          notes: p.notes,
          source: p.source,
          enteredBy: p.enteredBy,
          enteredAt: p.enteredAt,
          createdAt: p.createdAt,
          approvedAt: p.approvedAt,
          approvedBy: p.approvedBy,
          rejectedAt: p.rejectedAt,
          rejectedBy: p.rejectedBy,
          rejectionReason: p.rejectionReason,
        })),
      });
    } catch (error) {
      console.error('❌ Error fetching profiles:', error);
      res.status(500).json({
        error: 'Failed to fetch profiles',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/staff/profiles/:id
 * Fetch a single profile by ID (staff only)
 */
router.get(
  '/:id',
  authMiddleware,
  staffOnlyMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid profile ID' });
        return;
      }
      const db = await getDatabase();
      const profile = await db.collection('profiles').findOne(
        { _id: new ObjectId(id) },
        { projection: { password: 0, verificationToken: 0 } }
      );
      if (!profile) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }
      res.json({ success: true, profile: { ...profile, _id: profile._id.toString() } });
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }
);

/**
 * POST /api/staff/profiles/:id/approve
 * Approve a user profile (staff only)
 * ✅ UNIFIED: Uses 'profiles' collection
 */
router.post(
  '/:id/approve',
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
      // ✅ FIX: Use 'profiles' collection
      const profilesCollection = db.collection('profiles');

      let query: any = { _id: id };

      if (ObjectId.isValid(id) && id.length === 24) {
        query = { _id: new ObjectId(id) };
      }

      console.log(`🔍 Query: ${JSON.stringify(query)}`);

      const profile = await profilesCollection.findOne(query);

      if (!profile) {
        console.warn(`⚠️  Profile not found: ${id}`);
        res.status(404).json({ error: 'Profile not found' });
        return;
      }

      console.log(`✓ Found profile: ${profile.email || profile._id}`);

      const result = await profilesCollection.updateOne(
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

      // 📧 Send approval email
      let emailSent = false;
      try {
        emailSent = await sendProfileApprovalEmail(profile.email, profile.name);
        console.log(`✅ Approval email sent: ${emailSent}`);
      } catch (emailError) {
        console.error('⚠️ Failed to send approval email:', emailError);
      }

      await logAudit(
        staffEmail,
        staffId,
        staffRole,
        'approve_profile',
        'profile',
        id,
        reason || 'Profile meets guidelines',
        { profile_email: profile.email, emailSent }
      );

      console.log(`✅ Profile approved and logged`);

      res.json({
        success: true,
        message: 'Profile approved',
        modifiedCount: result.modifiedCount,
        profileId: id,
        emailSent,
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

/**
 * POST /api/staff/profiles/:id/reject
 * Reject a user profile (staff only)
 * ✅ UNIFIED: Uses 'profiles' collection
 */
router.post(
  '/:id/reject',
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

      if (!reason) {
        res.status(400).json({ error: 'Rejection reason is required' });
        return;
      }

      const staffEmail = req.user.email;
      const staffId = req.user.id;
      const staffRole = req.user.role as 'staff' | 'admin';

      console.log(`📝 Rejecting profile: ${id} by ${staffEmail}`);

      const db = await getDatabase();
      // ✅ FIX: Use 'profiles' collection
      const profilesCollection = db.collection('profiles');

      let query: any = { _id: id };

      if (ObjectId.isValid(id) && id.length === 24) {
        query = { _id: new ObjectId(id) };
      }

      console.log(`🔍 Query: ${JSON.stringify(query)}`);

      const profile = await profilesCollection.findOne(query);

      if (!profile) {
        console.warn(`⚠️  Profile not found: ${id}`);
        res.status(404).json({ error: 'Profile not found' });
        return;
      }

      console.log(`✓ Found profile: ${profile.email || profile._id}`);

      // 📧 Send rejection email BEFORE deleting the record (needs profile data)
      let emailSent = false;
      try {
        emailSent = await sendProfileRejectionEmail(profile.email, profile.name, reason);
        console.log(`✅ Rejection email sent: ${emailSent}`);
      } catch (emailError) {
        console.error('⚠️ Failed to send rejection email:', emailError);
      }

      // 📝 Audit log (retains the rejection record even though the profile is removed)
      await logAudit(
        staffEmail,
        staffId,
        staffRole,
        'reject_profile',
        'profile',
        id,
        `Profile rejected & deleted: ${reason}`,
        { profile_email: profile.email, profile_name: profile.name, emailSent }
      );

      // 🗑️ Rejected profiles are deleted automatically — no rejected records kept
      const result = await profilesCollection.deleteOne(query);

      console.log(`✓ Delete result:`, result);

      if (result.deletedCount === 0) {
        console.warn(`⚠️  No documents deleted for: ${id}`);
        res.status(400).json({ error: 'Profile was not deleted' });
        return;
      }

      console.log(`✅ Profile rejected, deleted and logged`);

      res.json({
        success: true,
        message: 'Profile rejected and removed',
        deletedCount: result.deletedCount,
        profileId: id,
        emailSent,
      });

    } catch (error) {
      console.error('❌ Error rejecting profile:', error);
      res.status(500).json({
        error: 'Failed to reject profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
