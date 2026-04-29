import { Router, Request, Response } from 'express';

const router = Router();

// Mock staff users
const MOCK_USERS: Record<string, { name: string; role: string }> = {
  'staff@nikahnetwork.pk': {
    name: 'Ayesha Staff',
    role: 'staff',
  },
  'admin@intikhab.com': {
    name: 'Admin User',
    role: 'admin',
  },
};

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if user exists
    const user = MOCK_USERS[email as string];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email' });
    }

    // Generate mock token
    const token = `bearer_${Date.now()}_${email}`;

    return res.json({
      token,
      user: {
        id: email.split('@')[0],
        email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;