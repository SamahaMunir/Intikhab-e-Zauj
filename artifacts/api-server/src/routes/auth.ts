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
 * (register/verify), auth-simple.ts (auto-verify/dev). NOTE: staff login here
 * and applicant login in user-auth.ts are two parallel flows — keep their JWT
 * payload/role shapes compatible.
 */
import { Router, Request, Response } from 'express';
import { generateToken, JWTPayload } from '../utils/jwt';
import { logAudit } from '../db/auditLogs';
import { getStaffByEmail, updateLastLogin } from '../db/staff';
import { verifyPassword } from '../utils/password';

const router = Router();

/**
 * POST /auth/login
 * Login with email and password. Returns JWT token.
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Invalid request', message: 'Email and password required' });
      return;
    }

    const staff = await getStaffByEmail(email);
    if (!staff) {
      res.status(401).json({ error: 'Invalid credentials', message: 'Email not found' });
      return;
    }

    if (staff.status !== 'active') {
      res.status(401).json({ error: 'Account inactive', message: 'Your staff account has been deactivated' });
      return;
    }

    // Verify password — stored as "salt.hash" (verifyPassword handles both hashed and legacy plain)
    const passwordOk = staff.password?.includes('.')
      ? verifyPassword(password, staff.password)
      : staff.password === password;
    if (!passwordOk) {
      res.status(401).json({ error: 'Invalid credentials', message: 'Password incorrect' });
      return;
    }

    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      id: email.split('@')[0],
      email: staff.email,
      name: staff.name,
      role: staff.role,
    };
    const token = generateToken(payload);

    await updateLastLogin(email);
    await logAudit(
      email, payload.id, staff.role, 'login', 'auth', email,
      'Staff logged in', { userAgent: req.get('user-agent') }
    );

    console.log(`✓ User logged in: ${email}`);

    res.json({
      success: true,
      token,
      user: { id: payload.id, email: staff.email, name: staff.name, role: staff.role },
      expiresIn: '24h',
    });
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
