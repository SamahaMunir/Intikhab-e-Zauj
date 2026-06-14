// Shared shapes for the matches experience (frontend-only, mirrors existing API data).

export interface MatchCandidate {
  _id: string;
  name: string;
  age: number;
  dob?: string;
  city: string;
  profession: string;
  photo?: string;
  gender: string;
  caste?: string;
  height?: string;
  education?: string;
  bio?: string;
}

export interface ScoreBreakdown {
  caste: number; profession: number; ageGap: number; city: number;
  height: number; houseStatus: number; houseArea: number; total: number;
}

export interface MatchItem {
  _id: string;
  candidateId: string;
  score: number;
  scoreBreakdown?: ScoreBreakdown;
  candidate?: MatchCandidate;
}

export interface MatchFilters {
  ageMin: number;
  ageMax: number;
  cities: string[];
  educations: string[];
  scoreMin: number;
}

export const DEFAULT_FILTERS: MatchFilters = {
  ageMin: 18,
  ageMax: 60,
  cities: [],
  educations: [],
  scoreMin: 0,
};

export function activeFilterCount(f: MatchFilters): number {
  let n = 0;
  if (f.ageMin !== DEFAULT_FILTERS.ageMin || f.ageMax !== DEFAULT_FILTERS.ageMax) n++;
  if (f.cities.length) n++;
  if (f.educations.length) n++;
  if (f.scoreMin > 0) n++;
  return n;
}

export function applyFilters(matches: MatchItem[], f: MatchFilters): MatchItem[] {
  return matches.filter(m => {
    const c = m.candidate;
    const score = m.scoreBreakdown?.total ?? m.score;
    if (score < f.scoreMin) return false;
    if (c?.age != null && (c.age < f.ageMin || c.age > f.ageMax)) return false;
    if (f.cities.length && !(c?.city && f.cities.includes(c.city))) return false;
    if (f.educations.length && !(c?.education && f.educations.includes(c.education))) return false;
    return true;
  });
}

export const qualityLabel = (s: number) =>
  s >= 75 ? 'Excellent' : s >= 60 ? 'Good' : s >= 40 ? 'Fair' : 'Low';
