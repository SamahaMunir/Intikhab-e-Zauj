import { Router, Request, Response } from "express";
import { getAuditLogs, getResourceAuditLogs } from "../db/auditLogs";
import { authMiddleware, staffOnlyMiddleware, AuthRequest } from "../middleware/auth";
import { getDatabase } from "../db/connection";
import { generateToken, JWTPayload } from "../utils/jwt";

const router = Router();

/**
 * GET /api/staff/audit-logs
 * Fetch all audit logs (staff only)
 * Query params: action, resourceType, resourceId, actorEmail, limit, skip
 */
router.get(
  "/audit-logs",
  authMiddleware,
  staffOnlyMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        action,
        resourceType,
        resourceId,
        actorEmail,
        limit = "100",
        skip = "0",
      } = req.query;

      const filters: any = {};
      if (action) filters.action = action;
      if (resourceType) filters.resourceType = resourceType;
      if (resourceId) filters.resourceId = resourceId;
      if (actorEmail) filters.actorEmail = actorEmail;

      const { logs, total } = await getAuditLogs(
        filters,
        parseInt(limit as string, 10),
        parseInt(skip as string, 10)
      );

      res.json({
        success: true,
        data: logs,
        total,
        limit: parseInt(limit as string, 10),
        skip: parseInt(skip as string, 10),
      });
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch audit logs",
      });
    }
  }
);

/**
 * GET /api/staff/audit-logs/:resourceType/:resourceId
 * Fetch logs for a specific resource
 */
router.get(
  "/audit-logs/:resourceType/:resourceId",
  authMiddleware,
  staffOnlyMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { resourceType, resourceId } = req.params as { resourceType: string; resourceId: string };

      const logs = await getResourceAuditLogs(resourceType, resourceId);

      res.json({
        success: true,
        data: logs,
        resourceType,
        resourceId,
      });
    } catch (error) {
      console.error("Error fetching resource audit logs:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch resource audit logs",
      });
    }
  }
);
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
      nextStep: 'profile-wizard', // ✅ CHANGED: profile-wizard not dashboard
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