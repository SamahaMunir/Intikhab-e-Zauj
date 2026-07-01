/**
 * Environment loader — MUST be the first import in index.ts.
 *
 * ES modules fully evaluate every imported module before the importer's body
 * runs. Modules that read env at load time (e.g. utils/jwt.ts captures
 * JWT_SECRET in a top-level const) would otherwise see process.env BEFORE
 * dotenv ran, silently falling back to insecure defaults. Importing this module
 * first guarantees .env / .env.local are loaded before any such capture.
 */
import dotenv from 'dotenv';

dotenv.config();                                       // .env (defaults)
dotenv.config({ path: '.env.local', override: true }); // .env.local overrides (real secrets)

// ── Required env: fail fast with a clear message (better than a deep runtime crash) ──
const REQUIRED = ['DATABASE_URL', 'JWT_SECRET'] as const;
const missing = REQUIRED.filter((k) => !process.env[k] || process.env[k]!.trim() === '');
if (missing.length) {
  console.error(`\n✗ Missing required environment variable(s): ${missing.join(', ')}`);
  console.error('  Set them in .env / .env.local before starting the server.\n');
  process.exit(1);
}

// ── Optional integrations: warn so it's obvious which features are inactive ──
if (!['GOOGLE_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY'].some((k) => process.env[k])) {
  console.warn('⚠ No LLM key set — AI staff insights disabled (template fallback only).');
}
const OPTIONAL: Record<string, string> = {
  EMAIL_USER: 'email notifications',
  JAZZCASH_MERCHANT_ID: 'JazzCash payments',
  CLOUDINARY_CLOUD_NAME: 'photo uploads (Cloudinary)',
};
const inactive = Object.entries(OPTIONAL).filter(([k]) => !process.env[k]).map(([, label]) => label);
// SMS is active if a sending mode is chosen (real gateway or the console test mode).
const smsProvider = (process.env.SMS_PROVIDER || 'none').toLowerCase();
if (!['jazz', 'generic', 'console'].includes(smsProvider)) inactive.push('SMS notifications');
if (inactive.length) {
  console.warn(`⚠ Inactive integrations: ${inactive.join(', ')}`);
}
