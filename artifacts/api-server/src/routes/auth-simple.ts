/**
 * AUTH-SIMPLE ROUTES — mounted at /auth (see src/index.ts). Quick/dev auth.
 * Endpoint map (verified against frontend usage):
 *   POST /auth/register-simple        — DEAD — no source caller. Safe to remove.
 *   POST /auth/verify-auto            — LIVE — Caller: pages/verify-auto.tsx
 *                                       (auto-verify → profile wizard).
 *   GET  /auth/test-verification-link — LIVE but DEV/TEST ONLY. Caller:
 *                                       pages/test-verification.tsx. NOTE: a
 *                                       duplicate of this exists in
 *                                       auditLogsRoutes.ts (that copy is dead).
 *                                       Do not expose in production.
 * Real (non-dev) flows live in register.ts (register/verify-email).
 */
import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection';
import { generateToken, JWTPayload } from '../utils/jwt';
import { hashPassword, generateVerificationToken, getTokenExpiryTime } from '../utils/password';
import { sendSimpleVerificationEmail } from '../utils/email';
import { logAudit } from '../db/auditLogs';

const router = Router();

/**
 * POST /auth/register-simple
 * Quick registration - Email & Password only
 */
router.post('/register-simple', async (req: Request, res: Response) => {
  try {
    const { email, password, passwordConfirm } = req.body;

    // ✅ VALIDATE
    if (!email || !password || !passwordConfirm) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Email and password required',
      });
    }

    if (password !== passwordConfirm) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Passwords do not match',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Password must be at least 6 characters',
      });
    }

    const db = await getDatabase();
    const usersCollection = db.collection('users');

    // ✅ CHECK DUPLICATE EMAIL
    const existingUser = await usersCollection.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        error: 'Email already registered',
        message: 'Please use a different email or login',
      });
    }

    // ✅ CREATE USER
    const verificationToken = generateVerificationToken();
    const tokenExpiry = getTokenExpiryTime();

    const newUser = {
      _id: new ObjectId(),
      email,
      password: hashPassword(password),
      role: 'applicant',
      
      // ✅ Email verification
      emailVerified: false,
      verificationToken,
      verificationTokenExpiry: tokenExpiry,
      
      // ✅ Profile tracking (NEW - no approval needed)
      profileCompletion: 0, // 0%, 25%, 50%, 75%, 100%
      profileCompletedAt: null,
      
      // ✅ Payment tracking (NEW)
      paymentStatus: 'pending', // pending, completed
      paymentAmount: 4000, // PKR
      paymentDate: null,
      paymentTransactionId: null,
      
      // ✅ Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
    };

    await usersCollection.insertOne(newUser);
    console.log(`✅ User registered: ${email}`);

    // ✅ SEND VERIFICATION EMAIL
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5175'}/verify-auto?token=${verificationToken}&email=${email}`;
    const emailSent = await sendSimpleVerificationEmail(email, verificationLink);

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Check your email to verify.',
      user: {
        _id: newUser._id.toString(),
        email: newUser.email,
        role: 'applicant',
      },
      emailSent,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      error: 'Registration failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /auth/verify-auto
 * Auto-verify email with token (single click)
 */
router.post('/verify-auto', async (req: Request, res: Response) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'Email and token required',
      });
    }

    const db = await getDatabase();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No account with this email',
      });
    }

    // ✅ VERIFY TOKEN
    if (user.verificationToken !== token) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Verification link is invalid',
      });
    }

    if (new Date() > user.verificationTokenExpiry) {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Verification link expired. Please register again.',
      });
    }

    // ✅ MARK VERIFIED
    await usersCollection.updateOne(
      { email },
      {
        $set: {
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
          updatedAt: new Date(),
        },
      }
    );

    console.log(`✅ Email verified: ${email}`);

    // ✅ GENERATE JWT
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      id: user._id.toString(),
      email: user.email,
      name: user.name || 'User',
      role: user.role,
    };

    const jwt_token = generateToken(payload);

    return res.json({
      success: true,
      message: 'Email verified! Please complete your profile.',
      token: jwt_token,
      user: {
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      nextStep: 'profile-completion', // Tell frontend to go to wizard
    });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({
      error: 'Verification failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
/**
 * GET /auth/test-verification-link
 * ✅ TEST MODE - Get verification link without email
 */
router.get('/test-verification-link', async (req: Request, res: Response) => {
  try {
    // Dev/test helper only — must never be reachable in production.
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Not found' });
    }

    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Email required',
        message: 'Please provide ?email=test@example.com',
      });
    }

    const db = await getDatabase();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: `No user with email: ${email}`,
      });
    }

    if (!user.verificationToken) {
      return res.status(400).json({
        error: 'Already verified',
        message: 'This user is already verified',
      });
    }

    // ✅ RETURN VERIFICATION LINK FOR TESTING
    const verificationLink = `http://localhost:5175/verify-auto?token=${user.verificationToken}&email=${email}`;

    console.log(`\n✅ TEST MODE - Verification Link:`);
    console.log(`${verificationLink}\n`);

    return res.json({
      success: true,
      message: 'Verification link generated (TEST MODE)',
      link: verificationLink,
      token: user.verificationToken,
      email,
    });
  } catch (error) {
    console.error('Test link error:', error);
    return res.status(500).json({
      error: 'Failed to generate test link',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;