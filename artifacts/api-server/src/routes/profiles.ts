import { Router, Response } from 'express';
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

      // Derive age from dob when the stored `age` is missing (self-registered
      // users capture dob, not age).
      const ageFrom = (p: any): number | undefined => {
        if (typeof p.age === 'number' && p.age > 0) return p.age;
        if (!p.dob) return undefined;
        const d = new Date(p.dob);
        if (isNaN(d.getTime())) return undefined;
        const now = new Date();
        let a = now.getFullYear() - d.getFullYear();
        const m = now.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
        return a > 0 && a < 120 ? a : undefined;
      };

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
          age: ageFrom(p),
          // Date the applicant registered per the source sheet (CSV). Falls back
          // to enteredAt/createdAt so self-registered profiles still group.
          applicationDate: p.applicationDate || p.enteredAt || p.createdAt,
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
          registeredBy: p.registeredBy,
          matched: p.matched,
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
 * GET /api/staff/profiles/payments/pending
 * Bank-transfer payments awaiting staff verification (staff only).
 * Defined before '/:id' so the literal path isn't captured as an id.
 */
router.get(
  '/payments/pending',
  authMiddleware,
  staffOnlyMiddleware,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const db = await getDatabase();
      const profiles = await db
        .collection('profiles')
        .find({ paymentStatus: 'submitted' })
        .sort({ paymentSubmittedAt: -1 })
        .toArray();
      res.json({
        success: true,
        count: profiles.length,
        data: profiles.map(p => ({
          _id: p._id.toString(),
          name: p.name,
          email: p.email,
          phone: p.phone,
          gender: p.gender,
          photo: p.photo,
          paymentMethod: p.paymentMethod,
          paymentReference: p.paymentReference,
          paymentScreenshot: p.paymentScreenshot,
          paymentSubmittedAt: p.paymentSubmittedAt,
        })),
      });
    } catch (error) {
      console.error('❌ Error fetching pending payments:', error);
      res.status(500).json({ error: 'Failed to fetch pending payments' });
    }
  }
);

/**
 * POST /api/staff/profiles/:id/payment-verify
 * Confirm a submitted bank transfer → mark the profile paid (staff only).
 */
router.post(
  '/:id/payment-verify',
  authMiddleware,
  staffOnlyMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!ObjectId.isValid(id)) { res.status(400).json({ error: 'Invalid profile ID' }); return; }
      if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

      const db = await getDatabase();
      const now = new Date();
      const result = await db.collection('profiles').updateOne(
        { _id: new ObjectId(id) },
        { $set: { paymentStatus: 'completed', paymentDate: now, paymentProvider: 'bank_transfer', paymentVerifiedBy: req.user.email, updatedAt: now } }
      );
      if (result.matchedCount === 0) { res.status(404).json({ error: 'Profile not found' }); return; }

      await db.collection('payments').updateMany(
        { profileId: new ObjectId(id), status: 'submitted' },
        { $set: { status: 'completed', completedAt: now, verifiedBy: req.user.email } }
      );
      await logAudit(
        req.user.email, req.user.id, (req.user.role as 'staff' | 'admin') || 'staff',
        'verify_payment', 'profile', id, 'Bank transfer verified', {}
      );
      res.json({ success: true, paymentStatus: 'completed' });
    } catch (error) {
      console.error('❌ Error verifying payment:', error);
      res.status(500).json({ error: 'Failed to verify payment' });
    }
  }
);

/**
 * POST /api/staff/profiles/:id/payment-reject
 * Reject a submitted bank transfer → back to unpaid so the applicant can retry.
 */
router.post(
  '/:id/payment-reject',
  authMiddleware,
  staffOnlyMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!ObjectId.isValid(id)) { res.status(400).json({ error: 'Invalid profile ID' }); return; }
      if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { reason } = req.body || {};

      const db = await getDatabase();
      const now = new Date();
      const result = await db.collection('profiles').updateOne(
        { _id: new ObjectId(id) },
        { $set: { paymentStatus: 'pending', paymentRejectedReason: reason || 'Could not verify transaction', paymentRejectedBy: req.user.email, updatedAt: now } }
      );
      if (result.matchedCount === 0) { res.status(404).json({ error: 'Profile not found' }); return; }

      await db.collection('payments').updateMany(
        { profileId: new ObjectId(id), status: 'submitted' },
        { $set: { status: 'rejected', rejectedAt: now, rejectedBy: req.user.email, rejectedReason: reason || '' } }
      );
      await logAudit(
        req.user.email, req.user.id, (req.user.role as 'staff' | 'admin') || 'staff',
        'reject_payment', 'profile', id, `Bank transfer rejected: ${reason || 'no reason'}`, {}
      );
      res.json({ success: true, paymentStatus: 'pending' });
    } catch (error) {
      console.error('❌ Error rejecting payment:', error);
      res.status(500).json({ error: 'Failed to reject payment' });
    }
  }
);

/**
 * POST /api/staff/profiles/:id/set-matched
 * Manually flag a profile as matched/married (hidden from the matching pool) or
 * back to available (staff only). Used when updating from paper/scanned records.
 * Body: { matched: boolean }
 */
router.post(
  '/:id/set-matched',
  authMiddleware,
  staffOnlyMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!ObjectId.isValid(id)) { res.status(400).json({ error: 'Invalid profile ID' }); return; }
      if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

      const matched = !!req.body?.matched;
      const db = await getDatabase();
      const now = new Date();
      const set = matched
        ? { matched: true, matchedAt: now, updatedAt: now }
        : { matched: false, matchedAt: null, updatedAt: now };

      const result = await db.collection('profiles').updateOne({ _id: new ObjectId(id) }, { $set: set });
      if (result.matchedCount === 0) { res.status(404).json({ error: 'Profile not found' }); return; }

      await logAudit(
        req.user.email, req.user.id, (req.user.role as 'staff' | 'admin') || 'staff',
        matched ? 'mark_matched' : 'mark_available', 'profile', id,
        matched ? 'Marked as matched (hidden from pool)' : 'Marked as available', {}
      );
      res.json({ success: true, matched });
    } catch (error) {
      console.error('❌ Error setting matched flag:', error);
      res.status(500).json({ error: 'Failed to update status' });
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
 * PUT /api/staff/profiles/:id
 * Edit an existing profile's fields (staff only). Whitelisted fields only —
 * staff use this to complete data imported from the paper sheets (profession,
 * home ownership, house area, income, …) after the CSV import.
 */
router.put(
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
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const db = await getDatabase();
      const profilesCollection = db.collection('profiles');
      const query = { _id: new ObjectId(id) };

      const existing = await profilesCollection.findOne(query);
      if (!existing) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }

      // Plain string/text fields staff may edit.
      const STRING_FIELDS = [
        'name', 'phone', 'gender', 'city', 'education', 'profession', 'designation',
        'monthlyIncome', 'income', 'caste', 'height', 'religion', 'sect', 'cnic', 'bio',
        'fatherName', 'fatherOccupation', 'motherName', 'motherOccupation',
        'fatherMobile', 'motherMobile', 'matchCriteria', 'desiredMatchDetails',
        'notes', 'regNo', 'institution', 'jobType', 'address', 'motherTongue',
      ];
      const NUMERIC_FIELDS = [
        'numBrothers', 'numSisters', 'numMarriedBrothers', 'numMarriedSisters', 'areaValue',
      ];

      const set: Record<string, any> = { updatedAt: new Date() };

      for (const f of STRING_FIELDS) {
        if (f in req.body) set[f] = req.body[f] == null ? '' : String(req.body[f]);
      }
      for (const f of NUMERIC_FIELDS) {
        if (f in req.body) set[f] = Number(req.body[f]) || 0;
      }
      // dob: accept a date/ISO string, store as Date.
      if ('dob' in req.body && req.body.dob) {
        const d = new Date(req.body.dob);
        if (!isNaN(d.getTime())) set.dob = d;
      }
      if ('age' in req.body && req.body.age !== '') {
        const a = Number(req.body.age);
        if (a > 0) set.age = a;
      }
      // Home ownership + house area are stored under two aliases each — keep in sync.
      if ('homeOwnership' in req.body || 'houseStatus' in req.body) {
        const v = String(req.body.homeOwnership ?? req.body.houseStatus ?? '');
        set.homeOwnership = v;
        set.houseStatus = v;
      }
      if ('houseArea' in req.body || 'areaValue' in req.body) {
        const areaStr = req.body.houseArea ?? req.body.areaValue ?? '';
        set.houseArea = String(areaStr);
        set.areaValue = Number(areaStr) || 0;
      }
      if ('photo' in req.body) set.photo = req.body.photo || null;

      // Nothing beyond the timestamp → nothing to do.
      if (Object.keys(set).length <= 1) {
        res.status(400).json({ error: 'No editable fields provided' });
        return;
      }

      await profilesCollection.updateOne(query, { $set: set });

      await logAudit(
        req.user.email,
        req.user.id,
        (req.user.role as 'staff' | 'admin') || 'staff',
        'edit_profile',
        'profile',
        id,
        'Staff edited profile fields',
        { fields: Object.keys(set).filter(k => k !== 'updatedAt') }
      );

      const updated = await profilesCollection.findOne(query, {
        projection: { password: 0, verificationToken: 0 },
      });
      res.json({ success: true, profile: updated ? { ...updated, _id: updated._id.toString() } : null });
    } catch (error) {
      console.error('❌ Error editing profile:', error);
      res.status(500).json({
        error: 'Failed to edit profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
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
