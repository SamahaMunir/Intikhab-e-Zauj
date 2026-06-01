import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection';
import { generateToken, JWTPayload } from '../utils/jwt';
import { verifyPassword } from '../utils/password';
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

    const db = await getDatabase();
    // ✅ FIX: Use 'profiles' collection for all user types
    const profilesCollection = db.collection('profiles');

    // ✅ FIND USER (applicant or staff)
    const profile = await profilesCollection.findOne({ email });

    if (!profile) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password incorrect',
      });
      return;
    }
// ✅ VERIFY PASSWORD - with null check
if (!profile.password) {
  res.status(401).json({
    error: 'Invalid credentials',
    message: 'Account not properly configured. Please register again.',
  });
  return;
}

if (!verifyPassword(password, profile.password)) {
  res.status(401).json({
    error: 'Invalid credentials',
    message: 'Email or password incorrect',
  });
  return;
}

    // ✅ CHECK IF EMAIL VERIFIED
   // if (!profile.emailVerified) {
      //res.status(403).json({
     //   error: 'Email not verified',
    //    message: 'Please verify your email to login',
     // });
     // return;
  //  }

    // ✅ CHECK IF ACCOUNT ACTIVE
    if (!profile.active) {
      res.status(403).json({
        error: 'Account inactive',
        message: 'Your account has been deactivated',
      });
      return;
    }

    // ✅ GENERATE JWT (7 days expiry)
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      id: profile._id.toString(),
      email: profile.email,
      name: profile.name || 'User',
      role: profile.role || 'applicant',
    };

    const token = generateToken(payload);

    // ✅ UPDATE LAST LOGIN
    await profilesCollection.updateOne(
      { _id: profile._id },
      { $set: { lastLogin: new Date() } }
    );

    // ✅ LOG AUDIT
    try {
      await logAudit(
        email,
        profile._id.toString(),
        profile.role || 'applicant',
        'user_login',
        'profiles',
        email,
        'User logged in',
        { userAgent: req.get('user-agent'), role: profile.role }
      );
    } catch (auditError) {
      console.warn('⚠️ Audit logging failed:', auditError);
      // Don't block login if audit fails
    }

    console.log(`✅ User logged in: ${email} (role: ${profile.role})`);

    res.json({
      success: true,
      token,
      user: {
        _id: profile._id.toString(),
        email: profile.email,
        name: profile.name,
        role: profile.role || 'applicant',
        gender: profile.gender || '',          // ← required for wizard + matching
        profileCompletion: profile.profileCompletion || 0,
        paymentStatus: profile.paymentStatus || 'pending',
        profileStatus: profile.profileStatus || 'pending',
      },
      expiresIn: '7d',
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
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
