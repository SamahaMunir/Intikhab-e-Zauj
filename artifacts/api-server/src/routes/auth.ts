import { Router, Request, Response } from 'express';
import { generateToken, JWTPayload } from '../utils/jwt';
import { logAudit } from '../db/auditLogs';
import { getStaffByEmail, updateLastLogin } from '../db/staff';
import { verifyPassword } from '../utils/password';

const router = Router();


/**
 * POST /auth/login
 * Login with email and password
 * Returns JWT token
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Email and password required',
      });
    }

    // Get staff from database
    const staff = await getStaffByEmail(email);
    
    if (!staff) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email not found',
      });
    }

    // Check if active
    if (staff.status !== 'active') {
      return res.status(401).json({
        error: 'Account inactive',
        message: 'Your staff account has been deactivated',
      });
    }

    // Verify password — stored as "salt.hash" (verifyPassword handles both hashed and legacy plain)
    const passwordOk = staff.password?.includes('.')
      ? verifyPassword(password, staff.password)
      : staff.password === password;
    if (!passwordOk) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Password incorrect',
      });
    }

    // Generate JWT
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      id: email.split('@')[0],
      email: staff.email,
      name: staff.name,
      role: staff.role,
    };

    const token = generateToken(payload);

    // Update last login
    await updateLastLogin(email);

    // Log the login
    await logAudit(
      email,
      payload.id,
      staff.role,
      'login',
      'auth',
      email,
      'Staff logged in',
      { userAgent: req.get('user-agent') }
    );

    console.log(`✓ User logged in: ${email}`);

    res.json({
      success: true,
      token,
      user: {
        id: payload.id,
        email: staff.email,
        name: staff.name,
        role: staff.role,
      },
      expiresIn: '24h',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No token provided',
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token format',
    });
  }

  res.json({
    success: true,
    message: 'Token is valid',
  });
});

/**
 * POST /auth/logout
 */
router.post('/logout', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * GET /auth/me
 */
router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No token provided',
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token format',
    });
  }

  res.json({
    success: true,
    message: 'Token is valid',
  });
});

export default router;