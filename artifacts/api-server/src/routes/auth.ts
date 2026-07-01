/**
 * AUTH ROUTES — mounted at /auth (see src/index.ts). One of four auth files;
 * paths do NOT collide. Endpoint map (verified against frontend usage):
 *   POST /auth/login   — LIVE — STAFF login. Callers: contexts/AuthContext.tsx,
 *                        components/StaffAuthModal.tsx
 *   POST /auth/logout  — unused by FE (it just clears localStorage); kept as a
 *                        harmless convention.
 *   GET  /auth/me      — DEAD — no caller. FE uses /auth/whoami (user-auth.ts)
 *                        and /api/profile/me instead. Safe to remove.
 * Related auth files: user-auth.ts (applicant login/whoami), register.ts
 * (register/verify), auth-simple.ts (auto-verify/dev). NOTE: /auth/login and
 * user-auth's /auth/login-user now delegate to ONE shared lib/authenticate.ts —
 * a single login implementation for staff + applicants (both live in profiles).
 * The two URLs remain as aliases for frontend back-compat.
 */
import { Router, Request, Response } from 'express';
import { logAudit } from '../db/auditLogs';
import { authenticate } from '../lib/authenticate';

const router = Router();

/**
 * POST /auth/login
 * Login with email and password. Returns JWT token.
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await authenticate(email, password);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error, message: result.error });
      return;
    }

    await logAudit(
      result.user.email, result.user.id, result.user.role as any, 'login', 'auth', result.user.email,
      'User logged in', { userAgent: req.get('user-agent') }
    );
    console.log(`✓ User logged in: ${result.user.email} (role: ${result.user.role})`);

    res.json(result.session);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /auth/logout
 */
router.post('/logout', (_req: Request, res: Response): void => {
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * GET /auth/me — lightweight token-presence check.
 */
router.get('/me', (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
    return;
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid token format' });
    return;
  }
  res.json({ success: true, message: 'Token is valid' });
});

export default router;
