/**
 * USER-AUTH ROUTES — mounted at /auth (see src/index.ts). Applicant-side auth.
 * Endpoint map (verified against frontend usage):
 *   POST   /auth/login-user      — LIVE — applicant login. Caller:
 *                                  components/UserAuthModal.tsx. Delegates to the
 *                                  shared lib/authenticate.ts (same path as
 *                                  /auth/login); works for any role.
 *   GET    /auth/whoami          — LIVE — current user. Caller: lib/currentUser.ts
 *   DELETE /auth/delete-account  — auth-gated account deletion (real feature);
 *                                  confirm it's wired from the settings UI.
 * Sibling: auth.ts holds STAFF /auth/login. The two logins are parallel flows —
 * keep their JWT payload/role shapes compatible.
 */
import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection';
import { verifyPassword } from '../utils/password';
import { authenticate } from '../lib/authenticate';
import { logAudit } from '../db/auditLogs';
import { authMiddleware, type AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /auth/login-user
 * User login with email and password
 * ✅ UNIFIED: Uses 'profiles' collection for ALL users
 */
router.post('/login-user', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Email and password required',
      });
      return;
    }

    // Delegates to the shared authenticate() — same single login path as
    // /auth/login. Kept as an alias so existing frontend clients don't break.
    const result = await authenticate(email, password);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error, message: result.error });
      return;
    }

    try {
      await logAudit(
        result.user.email, result.user.id, result.user.role as any,
        'user_login', 'profiles', result.user.email,
        'User logged in', { userAgent: req.get('user-agent'), role: result.user.role }
      );
    } catch (auditError) {
      console.warn('⚠️ Audit logging failed:', auditError);
    }

    console.log(`✅ User logged in: ${email} (role: ${result.user.role})`);

    res.json(result.session);
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /auth/whoami
 * Return the fresh current-user object (same shape as login) so the frontend can
 * refresh values that go stale in localStorage — profileCompletion, profileStatus
 * and paymentStatus change after staff approval / profile edits. Distinct path
 * from the staff `/me` to avoid router shadowing.
 */
router.get('/whoami', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    // Staff/admin tokens carry a non-ObjectId id and have no applicant profile.
    if (!ObjectId.isValid(req.user.id)) {
      res.status(401).json({ error: 'This endpoint is for applicant accounts only.' });
      return;
    }
    const db = await getDatabase();
    const profile = await db.collection('profiles').findOne({ _id: new ObjectId(req.user.id) });
    if (!profile) {
      res.status(404).json({ error: 'User profile not found' });
      return;
    }
    res.json({
      success: true,
      user: {
        _id: profile._id.toString(),
        email: profile.email,
        name: profile.name,
        role: profile.role || 'applicant',
        gender: profile.gender || '',
        profileCompletion: profile.profileCompletion || 0,
        paymentStatus: profile.paymentStatus || 'pending',
        profileStatus: profile.profileStatus || 'pending',
      },
    });
  } catch (error) {
    console.error('❌ whoami error:', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

/**
 * DELETE /auth/delete-account
 * User deletes their own account (authenticated)
 * ✅ UNIFIED: Uses 'profiles' collection
 */
router.delete(
  '/delete-account',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { password } = req.body;

      if (!password) {
        res.status(400).json({
          error: 'Password required',
          message: 'Please provide your password to confirm deletion',
        });
        return;
      }

      const db = await getDatabase();
      // ✅ FIX: Use 'profiles' collection
      const profilesCollection = db.collection('profiles');

      // ✅ FIND USER
      const profile = await profilesCollection.findOne({
        _id: new ObjectId(req.user.id),
      });

      if (!profile) {
        res.status(404).json({ error: 'User profile not found' });
        return;
      }

      // ✅ VERIFY PASSWORD - Handle null/undefined
      if (!profile.password) {
        res.status(401).json({
          error: 'Invalid password',
          message: 'Password not set on account.',
        });
        return;
      }

      if (!verifyPassword(password, profile.password)) {
        res.status(401).json({
          error: 'Invalid password',
          message: 'Password is incorrect',
        });
        return;
      }

      // ✅ DELETE USER (PERMANENT)
      const deleteResult = await profilesCollection.deleteOne({
        _id: new ObjectId(req.user.id),
      });

      if (deleteResult.deletedCount === 0) {
        res.status(400).json({ error: 'Failed to delete account' });
        return;
      }

      console.log(`🗑️ User account deleted: ${profile.email}`);

      // ✅ LOG AUDIT
      try {
        await logAudit(
          profile.email,
          req.user.id,
          profile.role || 'applicant',
          'account_deleted',
          'profiles',
          profile.email,
          'User account deleted by self',
          { deletedAt: new Date().toISOString() }
        );
      } catch (auditError) {
        console.warn('⚠️ Audit logging failed:', auditError);
        // Don't block deletion if audit fails
      }

      res.json({
        success: true,
        message: 'Your account has been permanently deleted',
        deletedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error deleting account:', error);
      res.status(500).json({
        error: 'Failed to delete account',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
