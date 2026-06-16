/**
 * ⚠️ DEMO/MOCK SCORER — NOT the production matching engine.
 *
 * The REAL, canonical matching lives in the backend:
 *   artifacts/api-server/src/lib/scoring.ts      (calculateScore)
 *   artifacts/api-server/src/lib/hard-filters.ts (applyHardFilters)
 * Real pages (/app/matches, /staff/matches) consume it via the API
 * (services/matchingService.ts). They never score on the client.
 *
 * This file + ./hard-filter-matching.ts are used ONLY by the Zustand demo
 * store (generateMatchesFor / seed proposals), which powers the not-yet-real
 * demo pages (/staff/proposals, /app/proposals, /staff/messages). It will be
 * REMOVED in M4 when those pages migrate to the real proposal/chat API.
 * Do NOT add production logic here — edit the backend scorer instead.
 */
import type { User, Config } from "./store";

import {
  checkHardFilters,
  HardFilterConfig
} from "./hard-filter-matching";

const eduRank: Record<string, number> = {
  Matric: 1,
  Intermediate: 2,
  Bachelors: 3,
  Masters: 4,
  MPhil: 5,
  PhD: 6
};

function ageFromDob(dob: string) {
  return new Date().getFullYear() - new Date(dob).getFullYear();
}

export function computeMatchScore(
  a: User,
  b: User,
  weights: Config["weights"]
) {

  const empty = {
    age: 0,
    location: 0,
    caste: 0,
    education: 0,
    income: 0,
    children: 0
  };

  if (a.gender === b.gender) {
    return {
      total: 0,
      breakdown: empty
    };
  }

  const male = a.gender === "M" ? a : b;
  const female = a.gender === "F" ? a : b;

  const ageM = ageFromDob(male.dob);
  const ageF = ageFromDob(female.dob);

  // AGE
  const ageGap = Math.abs(ageM - ageF);

  let ageScore = Math.max(0, 100 - ageGap * 8);

  if (
    ageM < female.preferences.ageMin ||
    ageM > female.preferences.ageMax
  ) {
    ageScore *= 0.5;
  }

  if (
    ageF < male.preferences.ageMin ||
    ageF > male.preferences.ageMax
  ) {
    ageScore *= 0.5;
  }

  // LOCATION
  const locationScore =
    a.city === b.city ? 100 : 50;

  // CASTE
  const aPrefsB =
    a.preferences.castePrefs.includes(b.caste) ||
    a.preferences.castePrefs.includes("Any");

  const bPrefsA =
    b.preferences.castePrefs.includes(a.caste) ||
    b.preferences.castePrefs.includes("Any");

  const casteScore =
    (aPrefsB && bPrefsA)
      ? 100
      : (aPrefsB || bPrefsA)
      ? 60
      : 30;

  // EDUCATION
  const aEdu = eduRank[a.education] || 0;
  const bEdu = eduRank[b.education] || 0;

  const educationScore = Math.max(
    0,
    100 - Math.abs(aEdu - bEdu) * 20
  );

  // INCOME
  const incomeScore =
    male.income >= female.preferences.incomeMin
      ? 100
      : Math.max(
          0,
          (male.income /
            Math.max(1, female.preferences.incomeMin)) * 100
        );

  // CHILDREN
  const childrenScore =
    a.children === b.children ? 100 : 70;

  const breakdown = {
    age: Math.round(ageScore),
    location: Math.round(locationScore),
    caste: Math.round(casteScore),
    education: Math.round(educationScore),
    income: Math.round(incomeScore),
    children: Math.round(childrenScore)
  };

  const total = Math.round(
    breakdown.age * weights.age +
      breakdown.location * weights.location +
      breakdown.caste * weights.caste +
      breakdown.education * weights.education +
      breakdown.income * weights.income
  );

  return {
    total,
    breakdown
  };
}

export function computeMatchScoreWithHardFilters(
  a: User,
  b: User,
  weights: Config["weights"],
  hardFilters: HardFilterConfig
) {

  const hardFilterResult = checkHardFilters(
    a,
    b,
    hardFilters
  );

  if (!hardFilterResult.passed) {
    return null;
  }

  return {
    score: computeMatchScore(a, b, weights),
    hardFilterResult
  };
}