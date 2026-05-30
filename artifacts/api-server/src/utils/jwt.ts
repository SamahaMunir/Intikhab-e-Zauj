import jwt from 'jsonwebtoken';

export interface JWTPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Generate JWT token with 7 days expiry (extended from 24h)
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(
    payload,
    JWT_SECRET,
    { 
      expiresIn: '7d', // ✅ EXTENDED: Changed from 24h to 7 days
      algorithm: 'HS256'
    }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.warn('⚠️ Token expired:', error.message);
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.warn('⚠️ Invalid token:', error.message);
    }
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authorization: string | undefined): string | null {
  if (!authorization) return null;
  
  const parts = authorization.split(' ');
  
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  }
  
  return null;
}

/**
 * Decode token without verification (use only for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
}
