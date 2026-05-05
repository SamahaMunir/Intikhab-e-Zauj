import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractToken } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Middleware to verify JWT token
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
      });
      return;
    }

    const payload = verifyToken(token);
    
    if (!payload) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed',
    });
  }
}

/**
 * Middleware to check if user is staff or admin
 */
export function staffOnlyMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || !['staff', 'admin'].includes(req.user.role)) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Only staff can access this resource',
    });
    return;
  }
  next();
}