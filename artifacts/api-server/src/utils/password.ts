import crypto from 'crypto';

/**
 * Hash password with salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}.${hash}`;
}

/**
 * Verify password
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split('.');
  const verify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verify;
}

/**
 * Generate 6-digit verification code (000000-999999)
 */
export function generateVerificationToken(): string {
  return String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
}

/**
 * Get token expiry time (24 hours from now)
 */
export function getTokenExpiryTime(): Date {
  const now = new Date();
  now.setHours(now.getHours() + 24);
  return now;
}