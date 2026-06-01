export interface ScoreBreakdown {
  caste: number;
  profession: number;
  ageGap: number;
  city: number;
  height: number;
  houseStatus: number;
  houseArea: number;
  total: number;
}

function getAge(profile: any): number {
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

export function calculateScore(user: any, candidate: any): ScoreBreakdown {
  const breakdown: ScoreBreakdown = {
    caste: 0, profession: 0, ageGap: 0, city: 0,
    height: 0, houseStatus: 0, houseArea: 0, total: 0,
  };

  // ── 1. CASTE (25 pts) ──────────────────────────────────────────────────────
  // Both present → score properly. One missing → neutral 10. Neither → 0.
  if (user.caste && candidate.caste) {
    breakdown.caste = user.caste.toLowerCase() === candidate.caste.toLowerCase() ? 25 : 5;
  } else if (user.caste || candidate.caste) {
    breakdown.caste = 10; // partial data → neutral
  }

  // ── 2. PROFESSION (15 pts) ─────────────────────────────────────────────────
  if (user.profession && candidate.profession) {
    const up = user.profession.toLowerCase();
    const cp = candidate.profession.toLowerCase();
    if (up === cp) breakdown.profession = 15;
    else if (up.includes('engineer') && cp.includes('engineer')) breakdown.profession = 12;
    else if (
      (up.includes('doctor') || up.includes('medical')) &&
      (cp.includes('doctor') || cp.includes('medical') || cp.includes('health'))
    ) breakdown.profession = 12;
    else if (up.includes('teacher') && cp.includes('teacher')) breakdown.profession = 12;
    else if (up.includes('business') || cp.includes('business') ||
             up.includes('businessman') || cp.includes('businessman')) breakdown.profession = 8;
    else breakdown.profession = 3;
  } else if (user.profession || candidate.profession) {
    breakdown.profession = 8; // one side missing → neutral
  }

  // ── 3. AGE GAP (15 pts) ────────────────────────────────────────────────────
  // Compute age from dob if stored age is 0 or missing
  const userAge = getAge(user);
  const candAge = getAge(candidate);

  if (userAge > 0 && candAge > 0) {
    const ageDiff = Math.abs(userAge - candAge);
    if (ageDiff <= 2) breakdown.ageGap = 15;
    else if (ageDiff <= 5) breakdown.ageGap = 12;
    else if (ageDiff <= 8) breakdown.ageGap = 8;
    else if (ageDiff <= 12) breakdown.ageGap = 4;
    else breakdown.ageGap = 0;
  } else {
    breakdown.ageGap = 8; // age unknown → neutral
  }

  // ── 4. CITY (15 pts) ───────────────────────────────────────────────────────
  if (user.city && candidate.city) {
    const uc = user.city.toLowerCase().trim();
    const cc = candidate.city.toLowerCase().trim();
    if (uc === cc) {
      breakdown.city = 15;
    } else {
      const groups = [
        ['lahore', 'lahore city', 'cantonment lahore', 'lahore cantt'],
        ['karachi', 'karachi city', 'karachi west', 'karachi east'],
        ['islamabad', 'rawalpindi', 'pindi'],
        ['faisalabad', 'lyallpur'],
        ['multan', 'multan city'],
        ['peshawar', 'peshwar'],
      ];
      const inSameGroup = groups.some(g => g.some(v => uc.includes(v)) && g.some(v => cc.includes(v)));
      breakdown.city = inSameGroup ? 12 : 5;
    }
  } else if (user.city || candidate.city) {
    breakdown.city = 8;
  }

  // ── 5. HEIGHT (10 pts) ─────────────────────────────────────────────────────
  if (user.height && candidate.height) {
    const uh = parseFloat(user.height);
    const ch = parseFloat(candidate.height);
    if (!isNaN(uh) && !isNaN(ch)) {
      const diff = Math.abs(uh - ch);
      if (diff <= 0.2) breakdown.height = 10;
      else if (diff <= 0.5) breakdown.height = 8;
      else if (diff <= 0.8) breakdown.height = 5;
      else if (diff <= 1.2) breakdown.height = 2;
      else breakdown.height = 0;
    } else {
      breakdown.height = 5;
    }
  } else {
    breakdown.height = 5; // missing → neutral
  }

  // ── 6. HOUSE STATUS (10 pts) ───────────────────────────────────────────────
  if (user.houseStatus && candidate.houseStatus) {
    const us = user.houseStatus.toLowerCase();
    const cs = candidate.houseStatus.toLowerCase();
    const bothOwn = us.includes('own') && cs.includes('own');
    const bothRent = us.includes('rent') && cs.includes('rent');
    breakdown.houseStatus = (us === cs || bothOwn || bothRent) ? 10 : 5;
  } else {
    breakdown.houseStatus = 5; // missing → neutral
  }

  // ── 7. HOUSE AREA (10 pts) ─────────────────────────────────────────────────
  const ua = parseInt(String(user.houseArea || '0')) || 0;
  const ca = parseInt(String(candidate.houseArea || '0')) || 0;
  if (ua > 0 && ca > 0) {
    const pct = (Math.abs(ua - ca) / Math.max(ua, ca)) * 100;
    if (pct <= 10) breakdown.houseArea = 10;
    else if (pct <= 25) breakdown.houseArea = 8;
    else if (pct <= 50) breakdown.houseArea = 5;
    else breakdown.houseArea = 2;
  } else if (ua > 0 || ca > 0) {
    breakdown.houseArea = 5; // one side missing → neutral
  } else {
    breakdown.houseArea = 5; // both missing → neutral
  }

  breakdown.total = Math.round(
    breakdown.caste + breakdown.profession + breakdown.ageGap +
    breakdown.city + breakdown.height + breakdown.houseStatus + breakdown.houseArea
  );

  return breakdown;
}
