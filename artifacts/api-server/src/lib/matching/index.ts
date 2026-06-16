/**
 * Single source of truth for matchmaking (scoring + hard filters).
 * Backend imports from here; the frontend consumes results via the matching API.
 */
export { calculateScore } from './calculateScore';
export { applyHardFilters } from './applyHardFilters';
export type {
  Profile,
  ScoreBreakdown,
  MatchScore,
  HardFilterResult,
  HardFilterRejection,
} from './types';
