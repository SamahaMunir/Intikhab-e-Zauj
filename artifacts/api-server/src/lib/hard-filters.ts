export interface HardFilterResult {
  passes: boolean;
  rejections: { reason: string }[];
}

// Province/metro groups — candidates in different groups = long distance (Phase 1 reject)
const LOCATION_GROUPS: string[][] = [
  ['lahore', 'sheikhupura', 'gujranwala', 'sialkot', 'narowal', 'gujrat'],
  ['faisalabad', 'lyallpur', 'jhang', 'toba tek singh', 'chiniot'],
  ['rawalpindi', 'islamabad', 'pindi', 'attock', 'chakwal', 'taxila'],
  ['multan', 'khanewal', 'lodhran', 'vehari', 'bahawalpur', 'sahiwal'],
  ['karachi', 'hyderabad', 'thatta', 'sukkur'],
  ['peshawar', 'mardan', 'swabi', 'nowshera', 'charsadda', 'abbottabad'],
  ['quetta', 'turbat', 'khuzdar'],
];

function cityGroup(city: string): number {
  const c = city.toLowerCase().trim();
  return LOCATION_GROUPS.findIndex(g => g.some(v => c.includes(v) || v.includes(c)));
}

function wantsSameCaste(matchCriteria: string | undefined, desiredMatchDetails: string | undefined): boolean {
  const text = `${matchCriteria || ''} ${desiredMatchDetails || ''}`.toLowerCase();
  return (
    text.includes('same caste') ||
    text.includes('same biradari') ||
    text.includes('caste match') ||
    text.includes('apni zaat') ||
    text.includes('same cast') ||
    text.includes('biradari match')
  );
}

function computeAge(profile: any): number {
  if (profile.age && Number(profile.age) > 0) return Number(profile.age);
  if (profile.dob) {
    const dob = new Date(profile.dob);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age > 0 ? age : 0;
  }
  return 0;
}

export function applyHardFilters(user: any, candidate: any): HardFilterResult {
  const rejections: { reason: string }[] = [];

  // ── Rule 1: Opposite gender (always) ──────────────────────────────────────
  if (user.gender && candidate.gender && user.gender === candidate.gender) {
    rejections.push({ reason: 'Same gender' });
    return { passes: false, rejections };
  }

  // ── Rule 2: Caste compatibility ───────────────────────────────────────────
  // Hard reject only when user explicitly requires same caste AND castes differ
  if (
    user.caste &&
    candidate.caste &&
    wantsSameCaste(user.matchCriteria, user.desiredMatchDetails) &&
    user.caste.toLowerCase().trim() !== candidate.caste.toLowerCase().trim()
  ) {
    rejections.push({ reason: `Caste mismatch: user wants same caste (${user.caste}), candidate is ${candidate.caste}` });
  }

  // ── Rule 3: Age gap ≤ 12 years ────────────────────────────────────────────
  const userAge = computeAge(user);
  const candAge = computeAge(candidate);
  if (userAge > 0 && candAge > 0) {
    const ageDiff = Math.abs(userAge - candAge);
    if (ageDiff > 12) {
      rejections.push({ reason: `Age gap ${ageDiff}y exceeds 12-year limit` });
    }
    // Islamic norm: male should not be more than 3 years younger than female
    if (user.gender === 'male' && userAge < candAge - 3) {
      rejections.push({ reason: `Male (${userAge}) more than 3 years younger than female (${candAge})` });
    }
  }

  // ── Rule 4: Height preference ─────────────────────────────────────────────
  // Hard reject only when both heights available AND gap > 1.5 ft (extreme mismatch)
  if (user.height && candidate.height) {
    const uh = parseFloat(user.height);
    const ch = parseFloat(candidate.height);
    if (!isNaN(uh) && !isNaN(ch) && Math.abs(uh - ch) > 1.5) {
      rejections.push({ reason: `Height gap too large (${user.height} vs ${candidate.height})` });
    }
  }

  // ── Rule 5: Location — no long distance (Phase 1) ────────────────────────
  // Reject if user and candidate are in clearly different province/metro groups
  if (user.city && candidate.city) {
    const ug = cityGroup(user.city);
    const cg = cityGroup(candidate.city);
    if (ug !== -1 && cg !== -1 && ug !== cg) {
      rejections.push({
        reason: `Long distance: ${user.city} and ${candidate.city} are in different regions (Phase 1 restricts to same region)`,
      });
    }
  }

  return { passes: rejections.length === 0, rejections };
}
