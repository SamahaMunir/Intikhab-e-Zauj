/**
 * Single source of truth for the logged-in user on the frontend.
 *
 * Identity is fragmented across the backend: applicant login returns `user._id`,
 * staff login returns `user.id`, and the JWT carries `id`. Reading the raw field
 * directly is a footgun — always go through getUserId() so both shapes resolve.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface StoredUser {
  _id?: string;
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  gender?: string;
  profileCompletion?: number;
  profileStatus?: string;
  paymentStatus?: string;
  [k: string]: unknown;
}

export function getToken(): string {
  return localStorage.getItem('token') || '';
}

export function getStoredUser(): StoredUser | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try { return JSON.parse(raw) as StoredUser; } catch { return null; }
}

/** Canonical account id — handles both `_id` (applicant) and `id` (staff). */
export function getUserId(): string | undefined {
  const u = getStoredUser();
  return (u?._id || u?.id) as string | undefined;
}

/**
 * Re-fetch the current user from the server and refresh localStorage so values
 * that go stale (profileCompletion, profileStatus, paymentStatus after staff
 * approval) are current. Best-effort — returns the refreshed user or null and
 * never throws.
 */
export async function refreshCurrentUser(): Promise<StoredUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/whoami`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return getStoredUser();
    const data = await res.json();
    if (data?.user) {
      // Preserve any extra local-only fields, overlay fresh server values.
      const merged = { ...(getStoredUser() || {}), ...data.user };
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    }
    return getStoredUser();
  } catch {
    return getStoredUser();
  }
}
