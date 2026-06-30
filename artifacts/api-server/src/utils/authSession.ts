import { generateToken } from './jwt';

/**
 * Single source of truth for what a successful login returns.
 *
 * Both login routes (staff `/auth/login` and applicant `/auth/login-user`) MUST
 * build their token + response through here so the two flows can never drift:
 *   - token `id` is ALWAYS a Mongo ObjectId string (never an email/local-part),
 *     so downstream `new ObjectId(req.user.id)` always works.
 *   - the `user` object exposes BOTH `id` and `_id` (same value), so the
 *     frontend works whichever field it reads.
 */
export interface SessionUser {
  id: string;          // Mongo ObjectId string
  email: string;
  name: string;
  role: string;
  extra?: Record<string, unknown>; // role-specific fields (gender, profileCompletion, …)
}

export function buildSession(u: SessionUser) {
  const token = generateToken({ id: u.id, email: u.email, name: u.name, role: u.role });
  const user = {
    id: u.id,
    _id: u.id, // alias — frontend reads both id and _id in different places
    email: u.email,
    name: u.name,
    role: u.role,
    ...u.extra,
  };
  return { success: true, token, user, expiresIn: '7d' };
}
