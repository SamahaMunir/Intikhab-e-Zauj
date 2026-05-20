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
 */
router.post('/login-user', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Email and password required',
      });
    }

    const db = await getDatabase();
    const usersCollection = db.collection('users');

    // ✅ FIND USER
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password incorrect',
      });
    }

    // ✅ VERIFY PASSWORD
    if (!verifyPassword(password, user.password)) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password incorrect',
      });
    }

    // ✅ CHECK IF EMAIL VERIFIED
    if (!user.emailVerified) {
      return res.status(403).json({
        error: 'Email not verified',
        message: 'Please verify your email to login',
      });
    }

    // ✅ CHECK IF ACCOUNT ACTIVE
    if (!user.active) {
      return res.status(403).json({
        error: 'Account inactive',
        message: 'Your account has been deactivated',
      });
    }

    // ✅ GENERATE JWT
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      id: user._id.toString(),
      email: user.email,
      name: user.name || 'User',
      role: 'user'
    };

    const token = generateToken(payload);

    // ✅ UPDATE LAST LOGIN
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    // ✅ LOG AUDIT
    try {
      await logAudit(
        email,
        user._id.toString(),
        'applicant',
        'user_login',
        'users',
        email,
        'User logged in',
        { userAgent: req.get('user-agent') }
      );
    } catch (auditError) {
      console.warn('⚠️ Audit logging failed:', auditError);
    }

    console.log(`✅ User logged in: ${email}`);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: 'applicant',
        profileCompletion: user.profileCompletion || 0,
        paymentStatus: user.paymentStatus || 'pending',
      },
      expiresIn: '24h',
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
      const usersCollection = db.collection('users');

      // ✅ FIND USER
      const user = await usersCollection.findOne({
        _id: new ObjectId(req.user.id),
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // ✅ VERIFY PASSWORD
      if (!verifyPassword(password, user.password)) {
        res.status(401).json({
          error: 'Invalid password',
          message: 'Password is incorrect',
        });
        return;
      }

      // ✅ DELETE USER (PERMANENT)
      const deleteResult = await usersCollection.deleteOne({
        _id: new ObjectId(req.user.id),
      });

      if (deleteResult.deletedCount === 0) {
        res.status(400).json({ error: 'Failed to delete account' });
        return;
      }

      console.log(`🗑️ User account deleted: ${user.email}`);

      // ✅ LOG AUDIT
      try {
        await logAudit(
          user.email,
          req.user.id,
          'applicant',
          'account_deleted',
          'users',
          user.email,
          'User account deleted by self',
          { deletedAt: new Date().toISOString() }
        );
      } catch (auditError) {
        console.warn('⚠️ Audit logging failed:', auditError);
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