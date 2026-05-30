import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { authMiddleware, staffOnlyMiddleware, AuthRequest } from '../middleware/auth';
import {
  inviteStaff,
  setPasswordWithInvite,
  getAllStaff,
  deactivateStaff,
  activateStaff,
  deleteStaff,
  resendInvite,
} from '../db/staff';
import { logAudit } from '../db/auditLogs';
import { getDatabase } from '../db/connection';
import { sendStaffInviteEmail, sendProfileApprovalEmail, sendProfileRejectionEmail } from '../utils/email';

const router = Router();

/**
 * Admin-only middleware
 */
function adminOnly(req: AuthRequest, res: Response, next: Function) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Only admins can manage staff',
    });
  }
  return next();
}

/**
 * POST /api/staff/invite
 * Send invite to new staff member (admin only)
 */
router.post(
  '/invite',
  authMiddleware,
  adminOnly,
  async (req: AuthRequest, res: Response) => {
    try {
      const { email, name, role } = req.body;

      if (!email || !name || !role) {
        res.status(400).json({
          error: 'Missing required fields',
          message: 'email, name, role required',
        });
        return;
      }

      const { staff, inviteLink } = await inviteStaff(
        email,
        name,
        role,
        req.user!.email
      );

      // ✅ SEND EMAIL
      const emailSent = await sendStaffInviteEmail(
        email,
        name,
        inviteLink,
        req.user!.name
      );

      // Log the action
      await logAudit(
        req.user!.email,
        req.user!.id,
        'admin',
        'invite_staff',
        'staff',
        email,
        `Invited ${role} staff member${emailSent ? ' (email sent)' : ' (email failed)'}`,
        { staffName: name, emailSent }
      );

      res.json({
        success: true,
        message: emailSent ? 'Invite sent via email' : 'Invite created but email failed',
        inviteLink,
        emailSent,
        staff: {
          email: staff.email,
          name: staff.name,
          role: staff.role,
          status: staff.status,
        },
      });
    } catch (error) {
      console.error('Error inviting staff:', error);
      res.status(500).json({
        error: 'Failed to send invite',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/staff/setup-password
 * Set password with invite token (public - no auth needed)
 */
router.post('/setup-password', async (req: Request, res: Response): Promise<any> => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'token and password required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Invalid password',
        message: 'Password must be at least 6 characters',
      });
    }

    const staff = await setPasswordWithInvite(token, password);

    res.json({
      success: true,
      message: 'Password set successfully',
      staff: {
        email: staff.email,
        name: staff.name,
      },
    });
  } catch (error) {
    console.error('Error setting password:', error);
    res.status(400).json({
      error: 'Failed to set password',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/staff/list
 * Get all staff (admin only)
 */
router.get(
  '/list',
  authMiddleware,
  adminOnly,
  async (req: AuthRequest, res: Response) => {
    try {
      const staff = await getAllStaff();
      res.json({
        success: true,
        data: staff.map(s => ({
          email: s.email,
          name: s.name,
          role: s.role,
          status: s.status,
          passwordSet: s.passwordSet,
          createdAt: s.createdAt,
          lastLogin: s.lastLogin,
        })),
      });
    } catch (error) {
      console.error('Error fetching staff:', error);
      res.status(500).json({ error: 'Failed to fetch staff' });
    }
  }
);

/**
 * POST /api/staff/deactivate
 * Deactivate staff member (admin only)
 */
router.post(
  '/deactivate',
  authMiddleware,
  adminOnly,
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }

      const success = await deactivateStaff(email);

      if (!success) {
        return res.status(404).json({ error: 'Staff not found' });
      }

      await logAudit(
        req.user!.email,
        req.user!.id,
        'admin',
        'deactivate_staff',
        'staff',
        email,
        'Staff member deactivated'
      );

      res.json({
        success: true,
        message: 'Staff member deactivated',
      });
    } catch (error) {
      console.error('Error deactivating staff:', error);
      res.status(500).json({ error: 'Failed to deactivate staff' });
    }
  }
);

/**
 * POST /api/staff/activate
 * Activate staff member (admin only)
 */
router.post(
  '/activate',
  authMiddleware,
  adminOnly,
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }

      const success = await activateStaff(email);

      if (!success) {
        return res.status(404).json({ error: 'Staff not found' });
      }

      await logAudit(
        req.user!.email,
        req.user!.id,
        'admin',
        'activate_staff',
        'staff',
        email,
        'Staff member activated'
      );

      res.json({
        success: true,
        message: 'Staff member activated',
      });
    } catch (error) {
      console.error('Error activating staff:', error);
      res.status(500).json({ error: 'Failed to activate staff' });
    }
  }
);

/**
 * POST /api/staff/remove
 * Remove staff member (admin only)
 */
router.post(
  '/remove',
  authMiddleware,
  adminOnly,
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }

      const success = await deleteStaff(email);

      if (!success) {
        return res.status(404).json({ error: 'Staff not found' });
      }

      await logAudit(
        req.user!.email,
        req.user!.id,
        'admin',
        'remove_staff',
        'staff',
        email,
        'Staff member removed'
      );

      res.json({
        success: true,
        message: 'Staff member removed',
      });
    } catch (error) {
      console.error('Error removing staff:', error);
      res.status(500).json({ error: 'Failed to remove staff' });
    }
  }
);

/**
 * POST /api/staff/create-user
 * Create applicant profile (staff only) - UNIFIED COLLECTION
 * Saves directly to 'profiles' collection with ALL required fields
 */
router.post(
  '/create-user',
  authMiddleware,
  staffOnlyMiddleware,
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const {
        name,
        email,
        phone,
        gender,
        dob,
        city,
        education,
        profession,
        income,
        caste,
        height,
        houseStatus,
        bio,
        photo,
        source,
        notes,
      } = req.body;

      // Validate required fields
      if (!name || !phone || !gender || !dob || !city) {
        res.status(400).json({
          error: 'Missing required fields',
          message: 'name, phone, gender, dob, city are required',
        });
        return;
      }

      const db = await getDatabase();
      // ✅ FIX: Use 'profiles' collection for ALL user profiles
      const profilesCollection = db.collection('profiles');

      // Check if phone already exists
      const existing = await profilesCollection.findOne({ phone });
      if (existing) {
        res.status(400).json({
          error: 'User with this phone already exists',
          message: `Phone: ${phone} is already registered`,
        });
        return;
      }

      // Create new profile with ALL required fields for matching
      const newProfile = {
        _id: new ObjectId(),
        
        // IDENTITY
        name,
        email: email || `${phone}@intikhab-pending.pk`,
        phone,
        gender,
        dob: new Date(dob),
        
        // ROLE & STATUS
        role: 'applicant',
        profileStatus: 'pending',
        active: true,
        
        // PROFILE DATA - ✅ ALL FIELDS REQUIRED FOR MATCHING
        city,
        education: education || 'Not specified',
        profession: profession || 'Not specified',
        income: income || 'Not specified',
        caste: caste || 'Not specified',
        height: height || 'Not specified',
        houseStatus: houseStatus || 'Not specified',
        bio: bio || '',
        photo: photo || null,
        
        // COMPLETION & PAYMENT
        profileCompletion: 60,
        paymentStatus: 'pending',
        emailVerified: false,
        
        // TIMESTAMPS & METADATA
        source: source || 'staff_entry',
        notes: notes || '',
        enteredBy: req.user!.email,
        enteredByName: req.user!.name || 'Unknown',
        enteredAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Insert profile
      const result = await profilesCollection.insertOne(newProfile);

      // Log audit
      await logAudit(
        req.user!.email,
        req.user!.id,
        'staff',
        'create_applicant',
        'profiles',
        phone,
        `Created applicant: ${name} from source: ${source || 'staff_entry'}`,
        { source, phone, gender, city, role: 'applicant' }
      );

      console.log(`✅ Applicant profile created: ${name} (${phone})`);

      res.json({
        success: true,
        message: 'Applicant profile created successfully',
        profile: {
          _id: result.insertedId.toString(),
          name: newProfile.name,
          email: newProfile.email,
          phone: newProfile.phone,
          gender: newProfile.gender,
          city: newProfile.city,
          profileStatus: newProfile.profileStatus,
          createdAt: newProfile.createdAt,
        },
      });
    } catch (error) {
      console.error('Error creating applicant:', error);
      res.status(500).json({
        error: 'Failed to create applicant',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/staff/pending-profiles
 * Get all pending profiles for approval (staff only)
 * Uses unified 'profiles' collection
 */
router.get(
  '/pending-profiles',
  authMiddleware,
  staffOnlyMiddleware,
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const db = await getDatabase();
      // ✅ FIX: Use 'profiles' collection
      const profilesCollection = db.collection('profiles');

      // Fetch all applicants with 'pending' status
      const profiles = await profilesCollection
        .find({ role: 'applicant', profileStatus: 'pending' })
        .sort({ createdAt: -1 })
        .toArray();

      res.json({
        success: true,
        count: profiles.length,
        profiles: profiles.map(p => ({
          _id: p._id?.toString(),
          name: p.name,
          phone: p.phone,
          email: p.email,
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
          notes: p.notes,
          source: p.source,
          enteredBy: p.enteredBy,
          enteredAt: p.enteredAt,
          profileCompletion: p.profileCompletion,
          createdAt: p.createdAt,
        })),
      });
    } catch (error) {
      console.error('Error fetching pending profiles:', error);
      res.status(500).json({
        error: 'Failed to fetch pending profiles',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/staff/approve-profile/:id
 * Approve a pending profile (staff only)
 * Uses unified 'profiles' collection and auto-generates matches
 */
router.post(
  '/approve-profile/:id',
  authMiddleware,
  staffOnlyMiddleware,
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { id } = req.params as { id: string };
      const { notes } = req.body;

      if (!id || !ObjectId.isValid(id)) {
        return res.status(400).json({
          error: 'Invalid profile ID',
          message: 'Valid MongoDB ObjectId required',
        });
      }

      const db = await getDatabase();
      // ✅ FIX: Use 'profiles' collection
      const profilesCollection = db.collection('profiles');

      // Find and update profile
      const result = await profilesCollection.findOneAndUpdate(
        { _id: new ObjectId(id), role: 'applicant', profileStatus: 'pending' },
        {
          $set: {
            profileStatus: 'approved',
            approvedBy: req.user!.email,
            approvedAt: new Date(),
            approvalNotes: notes || '',
            profileCompletion: 100,
            paymentStatus: 'completed',
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      );

      if (!result || !result.value) {
        return res.status(404).json({
          error: 'Profile not found or not pending',
          message: `No pending applicant profile found with ID: ${id}`,
        });
      }

      const profile = result.value;

      // ✅ AUTO-GENERATE MATCHES after approval
      console.log('\n✅ Generating matches for newly approved profile...');

      try {
        // Get opposite-gender approved candidates
        const candidates = await profilesCollection
          .find({
            role: 'applicant',
            gender: { $ne: profile.gender },
            profileStatus: 'approved',
            _id: { $ne: profile._id },
          })
          .toArray();

        // Import hard filters and scoring
        const { applyHardFilters } = require('../lib/hard-filters');
        const { calculateScore } = require('../lib/scoring');

        // Apply hard filters and generate matches
        const matchesCollection = db.collection('matches');
        const matchesToInsert: any[] = [];

        for (const candidate of candidates) {
          const filterResult = applyHardFilters(profile, candidate);
          
          if (filterResult.passes) {
            const score = calculateScore(profile, candidate);

            // Only save good matches (score >= 40)
            if (score >= 40) {
              matchesToInsert.push({
                userId: profile._id,
                candidateId: candidate._id,
                score,
                status: 'suggested',
                hardFiltersPassed: true,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
              });
            }
          }
        }

        // Insert matches
        if (matchesToInsert.length > 0) {
          await matchesCollection.insertMany(matchesToInsert);
          console.log(`✓ Auto-generated ${matchesToInsert.length} matches`);
        } else {
          console.log(`ℹ No matches generated (no suitable candidates found)`);
        }
      } catch (matchError) {
        console.error('⚠️ Matching generation error (non-fatal):', matchError);
        // Don't fail approval if matching fails
      }

      // Send approval email
      const emailSent = await sendProfileApprovalEmail(
        profile.email,
        profile.name
      );

      // Log audit
      await logAudit(
        req.user!.email,
        req.user!.id,
        'staff',
        'approve_profile',
        'profiles',
        profile.phone,
        `Approved profile for: ${profile.name}${emailSent ? ' (email sent)' : ' (email failed)'}`,
        { profileId: id, approvalNotes: notes }
      );

      console.log(`✅ Profile approved: ${profile.name}`);

      res.json({
        success: true,
        message: 'Profile approved successfully',
        emailSent,
        profile: {
          _id: profile._id?.toString(),
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          profileStatus: profile.profileStatus,
          approvedAt: profile.approvedAt,
        },
      });
    } catch (error) {
      console.error('Error approving profile:', error);
      res.status(500).json({
        error: 'Failed to approve profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/staff/reject-profile/:id
 * Reject a pending profile (staff only)
 */
router.post(
  '/reject-profile/:id',
  authMiddleware,
  staffOnlyMiddleware,
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { id } = req.params as { id: string };
      const { reason } = req.body;

      if (!id || !ObjectId.isValid(id)) {
        return res.status(400).json({
          error: 'Invalid profile ID',
          message: 'Valid MongoDB ObjectId required',
        });
      }

      if (!reason || reason.trim().length === 0) {
        res.status(400).json({
          error: 'Rejection reason required',
          message: 'Please provide a reason for rejection',
        });
        return;
      }

      const db = await getDatabase();
      // ✅ FIX: Use 'profiles' collection
      const profilesCollection = db.collection('profiles');

      // Find and update profile
      const result = await profilesCollection.findOneAndUpdate(
        { _id: new ObjectId(id), role: 'applicant', profileStatus: 'pending' },
        {
          $set: {
            profileStatus: 'rejected',
            rejectedBy: req.user!.email,
            rejectedAt: new Date(),
            rejectionReason: reason,
            active: false,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      );

      if (!result || !result.value) {
        return res.status(404).json({
          error: 'Profile not found or not pending',
          message: `No pending applicant profile found with ID: ${id}`,
        });
      }

      const profile = result.value;

      // Send rejection email
      const emailSent = await sendProfileRejectionEmail(
        profile.email,
        profile.name,
        reason
      );

      // Log audit
      await logAudit(
        req.user!.email,
        req.user!.id,
        'staff',
        'reject_profile',
        'profiles',
        profile.phone,
        `Rejected profile for: ${profile.name} - Reason: ${reason}${emailSent ? ' (email sent)' : ' (email failed)'}`,
        { profileId: id, rejectionReason: reason }
      );

      console.log(`✅ Profile rejected: ${profile.name}`);

      res.json({
        success: true,
        message: 'Profile rejected successfully',
        emailSent,
        profile: {
          _id: profile._id?.toString(),
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          profileStatus: profile.profileStatus,
          rejectedAt: profile.rejectedAt,
        },
      });
    } catch (error) {
      console.error('Error rejecting profile:', error);
      res.status(500).json({
        error: 'Failed to reject profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/staff/resend-invite
 * Resend invite to staff member (admin only)
 */
router.post(
  '/resend-invite',
  authMiddleware,
  adminOnly,
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }

      const inviteLink = await resendInvite(email);

      res.json({
        success: true,
        message: 'Invite resent',
        inviteLink,
      });
    } catch (error) {
      console.error('Error resending invite:', error);
      res.status(500).json({
        error: 'Failed to resend invite',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
