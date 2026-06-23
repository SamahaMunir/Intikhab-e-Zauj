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
