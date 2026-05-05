import { Router, Request, Response } from 'express';
import { generateToken, JWTPayload } from '../utils/jwt';

const router = Router();

// Real staff users database
const STAFF_USERS: Record<string, { name: string; email: string; role: string; password: string }> = {
  'staff@nikahnetwork.pk': {
    name: 'Ayesha Staff',
    email: 'staff@nikahnetwork.pk',
    role: 'staff',
    password: 'staff123',
  },
  'admin@intikhab.com': {
    name: 'Admin User',
    email: 'admin@intikhab.com',
    role: 'admin',
    password: 'admin123',
  },
};

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

    const user = STAFF_USERS[email as string];
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email not found',
      });
    }

    if (user.password !== password) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Password incorrect',
      });
    }

    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      id: email.split('@')[0],
      email: user.email,
      name: user.name,
      role: user.role as any,
    };

    const token = generateToken(payload);

    console.log(`✓ User logged in: ${email}`);

    res.json({
      success: true,
      token,
      user: {
        id: payload.id,
        email: user.email,
        name: user.name,
        role: user.role,
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