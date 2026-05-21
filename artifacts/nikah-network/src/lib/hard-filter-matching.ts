import type { User } from "./store";

export interface HardFilterConfig {
  enableAgeFilter: boolean;
  enableLocationFilter: boolean;
  locationRadius: number; // ✅ ADD THIS
  enableCasteFilter: boolean;
  strictCasteFilter: boolean;
  enableRequiredFieldsFilter: boolean;
  requiredFields: string[]; // ✅ FIX (remove keyof User)
}

export const DEFAULT_HARD_FILTER_CONFIG: HardFilterConfig = {
  enableAgeFilter: true,
  enableLocationFilter: true,
  enableCasteFilter: true,
  strictCasteFilter: false,
  enableRequiredFieldsFilter: true,
  locationRadius: 200,
  requiredFields: [
    "name",
    "gender",
    "dob",
    "city",
    "caste",
    "education",
    "occupation",
    "bio",
    "maritalStatus"
  ]
};

function ageFromDob(dob: string) {
  return new Date().getFullYear() - new Date(dob).getFullYear();
}

export interface HardFilterResult {
  passed: boolean;
  reasons: string[];
}

export function checkHardFilters(
  target: User,
  candidate: User,
  config: HardFilterConfig = DEFAULT_HARD_FILTER_CONFIG
): HardFilterResult {

  const reasons: string[] = [];

  // Gender check
  if (target.gender === candidate.gender) {
    reasons.push("Gender mismatch");
  }

  // Approved profile check
  if (candidate.profileStatus !== "approved") {
    reasons.push("Candidate profile not approved");
  }

  // Age filter
  if (config.enableAgeFilter) {
    const targetAge = ageFromDob(target.dob);
    const candidateAge = ageFromDob(candidate.dob);

    if (
      candidateAge < target.preferences.ageMin ||
      candidateAge > target.preferences.ageMax
    ) {
      reasons.push("Candidate age outside preferred range");
    }

    if (
      targetAge < candidate.preferences.ageMin ||
      targetAge > candidate.preferences.ageMax
    ) {
      reasons.push("Your age outside candidate preferred range");
    }
  }

  // Location filter
  if (config.enableLocationFilter) {
    if (target.city !== candidate.city) {
      reasons.push("City mismatch");
    }
  }

  // Caste filter
  if (config.enableCasteFilter) {

    const targetAccepts =
      target.preferences.castePrefs.includes(candidate.caste) ||
      target.preferences.castePrefs.includes("Any");

    const candidateAccepts =
      candidate.preferences.castePrefs.includes(target.caste) ||
      candidate.preferences.castePrefs.includes("Any");

    if (config.strictCasteFilter) {
      if (!targetAccepts || !candidateAccepts) {
        reasons.push("Strict caste filter failed");
      }
    } else {
      if (!targetAccepts && !candidateAccepts) {
        reasons.push("Caste preferences mismatch");
      }
    }
  }

  // Required fields filter
  if (config.enableRequiredFieldsFilter) {

    const missingFields = config.requiredFields.filter(field => {
      const value = (candidate as any)[field];
      return value === undefined || value === null || value === "";
    });

    if (missingFields.length > 0) {
      reasons.push(`Missing fields: ${missingFields.join(", ")}`);
    }
  }

  return {
    passed: reasons.length === 0,
    reasons
  };
}

export function filterCandidatesWithHardFilters(
  target: User,
  candidates: User[],
  config: HardFilterConfig
) {

  const passed: User[] = [];
  const rejected: { candidate: User; reasons: string[] }[] = [];

  candidates.forEach(candidate => {

    const result = checkHardFilters(target, candidate, config);

    if (result.passed) {
      passed.push(candidate);
    } else {
      rejected.push({
        candidate,
        reasons: result.reasons
      });
    }
  });

  return {
    passed,
    rejected
  };
}