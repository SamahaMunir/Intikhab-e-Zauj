import type { Profile, ScoreBreakdown, HardFilterResult } from './matching';

/**
 * v0 Staff Insights — deterministic, template-based (NO LLM, NO embeddings,
 * NO external API). Turns the structured score breakdown + retrieved similar
 * past matches into staff-readable bullets and a recommendation label.
 *
 * Upgrade path (Phase 2): feed `bullets` + `similar` into an LLM for a prose
 * summary, and replace categorical similarity with vector retrieval.
 */

export interface SimilarStats {
  total: number;       // comparable past pairs found
  successful: number;  // led toward nikah (completed proposals)
  pending: number;     // still in progress
  successRate: number | null; // % or null when no history
}

export interface MatchInsights {
  recommendation: { label: string; score: number; hardFiltersPassed: boolean };
  bullets: string[];
  similar: SimilarStats;
}

const CITY_GROUPS: string[][] = [
  ['lahore', 'sheikhupura', 'gujranwala', 'sialkot', 'narowal', 'gujrat'],
  ['faisalabad', 'lyallpur', 'jhang', 'toba tek singh', 'chiniot'],
  ['rawalpindi', 'islamabad', 'pindi', 'attock', 'chakwal', 'taxila'],
  ['multan', 'khanewal', 'lodhran', 'vehari', 'bahawalpur', 'sahiwal'],
  ['karachi', 'hyderabad', 'thatta', 'sukkur'],
  ['peshawar', 'mardan', 'swabi', 'nowshera', 'charsadda', 'abbottabad'],
  ['quetta', 'turbat', 'khuzdar'],
];

export function cityGroupKey(city?: string): number {
  if (!city) return -1;
  const c = city.toLowerCase().trim();
  return CITY_GROUPS.findIndex(g => g.some(v => c.includes(v) || v.includes(c)));
}

export function professionBucket(profession?: string): string {
  if (!profession) return 'unknown';
  const p = profession.toLowerCase();
  if (p.includes('engineer')) return 'engineer';
  if (p.includes('doctor') || p.includes('medical') || p.includes('health')) return 'medical';
  if (p.includes('teacher') || p.includes('lecturer') || p.includes('professor')) return 'education';
  if (p.includes('business') || p.includes('trader') || p.includes('shop')) return 'business';
  if (p.includes('software') || p.includes('developer') || p.includes('it ')) return 'tech';
  if (p.includes('account') || p.includes('bank') || p.includes('finance')) return 'finance';
  return 'other';
}

function age(p: Profile): number {
  if (p.age && Number(p.age) > 0) return Number(p.age);
  if (p.dob) {
    const d = new Date(p.dob); const t = new Date();
    let a = t.getFullYear() - d.getFullYear();
    const m = t.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
    return a > 0 ? a : 0;
  }
  return 0;
}

/** Build the insight bullets + recommendation. Pure. */
export function buildInsights(
  user: Profile,
  candidate: Profile,
  score: ScoreBreakdown,
  hardFilter: HardFilterResult,
  similar: SimilarStats
): MatchInsights {
  const bullets: string[] = [];

  // Profession
  if (user.profession && candidate.profession) {
    if (score.profession >= 12) {
      bullets.push(`High profession alignment (${user.profession} ↔ ${candidate.profession}) — compatible fields.`);
    } else if (score.profession >= 8) {
      bullets.push(`Moderate profession fit (${user.profession} vs ${candidate.profession}).`);
    } else {
      bullets.push(`Differing professions (${user.profession} vs ${candidate.profession}).`);
    }
  }

  // Age
  const ua = age(user), ca = age(candidate);
  if (ua > 0 && ca > 0) {
    const gap = Math.abs(ua - ca);
    if (gap <= 5) bullets.push(`Age gap is ${gap} year${gap === 1 ? '' : 's'} — within the Islamic ideal.`);
    else if (gap <= 12) bullets.push(`Age gap is ${gap} years — acceptable but on the wider side.`);
    else bullets.push(`Age gap is ${gap} years — exceeds the usual limit.`);
  }

  // City / relocation
  if (user.city && candidate.city) {
    const ug = cityGroupKey(user.city), cg = cityGroupKey(candidate.city);
    if (user.city.toLowerCase().trim() === candidate.city.toLowerCase().trim()) {
      bullets.push(`Both prefer ${user.city} — no relocation conflict expected.`);
    } else if (ug !== -1 && ug === cg) {
      bullets.push(`Nearby cities (${user.city} / ${candidate.city}) — minimal relocation.`);
    } else {
      bullets.push(`Different regions (${user.city} / ${candidate.city}) — relocation likely needed.`);
    }
  }

  // Caste
  if (user.caste && candidate.caste && user.caste.toLowerCase() === candidate.caste.toLowerCase()) {
    bullets.push(`Same caste/biradari (${user.caste}).`);
  }

  // Hard-filter concerns
  if (!hardFilter.passes && hardFilter.rejections.length) {
    bullets.push(`⚠ Hard-filter concern: ${hardFilter.rejections.map(r => r.reason).join('; ')}.`);
  }

  // Historical comparison
  if (similar.total > 0) {
    const rate = similar.successRate;
    bullets.push(
      `${similar.total} similar past match${similar.total === 1 ? '' : 'es'}: ` +
      `${similar.successful} led toward nikah, ${similar.pending} pending` +
      (rate !== null ? ` (${rate}% success rate).` : '.')
    );
  } else {
    bullets.push('No comparable past matches yet — limited history for this profile combination.');
  }

  // Recommendation label
  let label: string;
  if (!hardFilter.passes) {
    label = 'REVIEW — hard-filter concerns';
  } else if (score.total >= 75 || (similar.successRate !== null && similar.successRate >= 60 && score.total >= 60)) {
    label = 'LIKELY HIGH SUCCESS — recommend APPROVE';
  } else if (score.total >= 60) {
    label = 'GOOD MATCH — worth proposing';
  } else if (score.total >= 45) {
    label = 'MODERATE — review preferences';
  } else {
    label = 'REVIEW CAREFULLY — low compatibility';
  }

  return {
    recommendation: { label, score: score.total, hardFiltersPassed: hardFilter.passes },
    bullets,
    similar,
  };
}
