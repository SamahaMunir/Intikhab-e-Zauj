/**
 * AUTH-SIMPLE ROUTES — mounted at /auth (see src/index.ts). Quick/dev auth.
 * Endpoint map (verified against frontend usage):
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
import { getDatabase } from '../db/connection';
import { generateToken, JWTPayload } from '../utils/jwt';

const router = Router();

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
    // Dev/test helper only. Default-CLOSED: reachable only when explicitly
    // enabled via ENABLE_TEST_ENDPOINTS=true. Do NOT rely on NODE_ENV here — if
    // that var is ever unset in prod this endpoint would leak email-verification
    // links for any account (verification bypass).
    if (process.env.ENABLE_TEST_ENDPOINTS !== 'true') {
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