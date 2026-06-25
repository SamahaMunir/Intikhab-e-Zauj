// Realm-scoped auth. A staff member and an applicant can be signed in at the same
// time in one browser without clobbering each other's session, and every request
// is attributed to the correct identity. The realm is chosen by the URL path:
// anything under /staff (incl. /staff-login) is the staff realm; everything else
// is the user realm.
//
//   user realm  → localStorage 'token' / 'user'        (unchanged — back-compat)
//   staff realm → localStorage 'staff_token' / 'staff_user'

export type Realm = 'staff' | 'user';

const KEYS: Record<Realm, { token: string; user: string }> = {
  staff: { token: 'staff_token', user: 'staff_user' },
  user: { token: 'token', user: 'user' },
};

/** Which realm the current page belongs to (staff portal vs applicant app). */
export function realmForPath(path: string = typeof window !== 'undefined' ? window.location.pathname : '/'): Realm {
  return path.startsWith('/staff') ? 'staff' : 'user';
}

export function getToken(realm: Realm = realmForPath()): string {
  return localStorage.getItem(KEYS[realm].token) || '';
}

export function getStoredUser<T = any>(realm: Realm = realmForPath()): T | null {
  try {
    return JSON.parse(localStorage.getItem(KEYS[realm].user) || 'null');
  } catch {
    return null;
  }
}

export function setSession(realm: Realm, token: string, user: unknown): void {
  localStorage.setItem(KEYS[realm].token, token);
  localStorage.setItem(KEYS[realm].user, JSON.stringify(user));
}

export function clearSession(realm: Realm): void {
  localStorage.removeItem(KEYS[realm].token);
  localStorage.removeItem(KEYS[realm].user);
}

/** Authorization (+ optional JSON) headers for the active realm. */
export function authHeaders(json = true, realm: Realm = realmForPath()): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Bearer ${getToken(realm)}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}
