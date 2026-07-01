import { getDatabase } from '../db/connection';
import { verifyPassword } from '../utils/password';
import { buildSession } from '../utils/authSession';

/**
 * Single login implementation for ALL users (staff, admin, applicant). Since
 * everyone lives in the shared `profiles` collection, one code path authenticates
 * them and returns the canonical session. Both /auth/login and /auth/login-user
 * delegate here, so there is effectively one login "door".
 */

const STAFF_ROLES = ['staff', 'admin'];

export type AuthResult =
  | { ok: true; session: ReturnType<typeof buildSession>; user: { id: string; email: string; role: string } }
  | { ok: false; status: number; error: string };

export async function authenticate(email?: string, password?: string): Promise<AuthResult> {
  if (!email || !password) {
    return { ok: false, status: 400, error: 'Email and password required' };
  }

  const db = await getDatabase();
  const profiles = db.collection('profiles');
  const p = await profiles.findOne({ email });

  if (!p || !p.password) {
    return { ok: false, status: 401, error: 'Invalid credentials' };
  }

  // Password stored as "salt.hash"; tolerate legacy plaintext for old rows.
  const passwordOk = p.password.includes('.')
    ? verifyPassword(password, p.password)
    : p.password === password;
  if (!passwordOk) {
    return { ok: false, status: 401, error: 'Invalid credentials' };
  }

  // Preserve the pre-unification checks exactly:
  //   staff/admin → status must be 'active'
  //   applicant   → emailVerified AND active must be truthy
  const isStaff = STAFF_ROLES.includes(p.role);
  if (isStaff) {
    if (p.status !== 'active') {
      return { ok: false, status: 403, error: 'Your staff account is inactive' };
    }
  } else {
    if (!p.emailVerified) {
      return { ok: false, status: 403, error: 'Please verify your email to login' };
    }
    if (!p.active) {
      return { ok: false, status: 403, error: 'Your account has been deactivated' };
    }
  }

  await profiles.updateOne({ _id: p._id }, { $set: { lastLogin: new Date() } });

  const id = p._id.toString();
  const role = p.role || 'applicant';
  const session = buildSession({
    id,
    email: p.email,
    name: p.name || 'User',
    role,
    // Applicant sessions carry the extra fields the app UI needs.
    extra: isStaff
      ? undefined
      : {
          gender: p.gender || '',
          profileCompletion: p.profileCompletion || 0,
          paymentStatus: p.paymentStatus || 'pending',
          profileStatus: p.profileStatus || 'pending',
        },
  });

  return { ok: true, session, user: { id, email: p.email, role } };
}
