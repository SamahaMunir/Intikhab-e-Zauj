import crypto from 'crypto';

/**
 * Hash a password using SHA256 (simple hashing for now)
 * TODO: Replace with bcrypt in production
 */
export function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  const passwordHash = hashPassword(password);
  return passwordHash === hash;
}

/**
 * Generate a random verification token
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a random 6-digit code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Check if token has expired
 */
export function isTokenExpired(expiryTime: Date): boolean {
  return new Date() > expiryTime;
}

/**
 * Get token expiry time (24 hours from now)
 */
export function getTokenExpiryTime(): Date {
  const expiryTime = new Date();
  expiryTime.setHours(expiryTime.getHours() + 24);
  return expiryTime;
}

export default {
  hashPassword,
  verifyPassword,
  generateVerificationToken,
  generateVerificationCode,
  isTokenExpired,
  getTokenExpiryTime,
};
