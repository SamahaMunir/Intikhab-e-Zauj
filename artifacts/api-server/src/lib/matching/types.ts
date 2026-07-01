/**
 * Shared matching types — single source of truth for scoring + hard filters.
 * Consumed by the Express backend (matchingRoutes). The React frontend never
 * scores locally; it reads results from the matching API.
 */

/** Loose profile shape the matching engine reads. All fields optional/defensive. */
export interface Profile {
  _id?: any;
  name?: string;
  gender?: 'male' | 'female' | string;
  age?: number;
  dob?: string;
  city?: string;
  caste?: string;
  profession?: string;
  education?: string;
  height?: string | number;
  houseStatus?: string;
  houseArea?: string | number;
  matchCriteria?: string;
  desiredMatchDetails?: string;
  [key: string]: any;
}

/** Per-dimension score contributions + total (0–100). */
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

/** Alias used by API consumers. */
export type MatchScore = ScoreBreakdown;

/**
 * Tunable per-dimension max points. Staff can edit these (see the config API);
 * they should sum to 100 for a 0–100 score. calculateScore scales each dimension
 * by weight/DEFAULT, so at DEFAULT_WEIGHTS the output is unchanged.
 */
export interface ScoreWeights {
  caste: number;
  profession: number;
  ageGap: number;
  city: number;
  height: number;
  houseStatus: number;
  houseArea: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  caste: 25,
  profession: 15,
  ageGap: 15,
  city: 15,
  height: 10,
  houseStatus: 10,
  houseArea: 10,
};

export const WEIGHT_KEYS: (keyof ScoreWeights)[] = [
  'caste', 'profession', 'ageGap', 'city', 'height', 'houseStatus', 'houseArea',
];

export interface HardFilterRejection {
  reason: string;
}

export interface HardFilterResult {
  passes: boolean;
  rejections: HardFilterRejection[];
}
