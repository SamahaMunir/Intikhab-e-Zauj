import { ObjectId } from 'mongodb';
export interface HardFilterResult {
passed: boolean;
reasons: string[];
}
export interface UserProfile {
_id?: ObjectId | string;
name?: string;
email: string;
gender: 'male' | 'female';
dob: string | Date;
city: string;
caste: string;
education: string;
occupation?: string;
bio?: string;
photo?: string;
profileStatus: 'pending' | 'approved' | 'rejected';
// Preferences
agePreferenceMin?: number;
agePreferenceMax?: number;
castePreferences?: string[];
locationRadius?: number;
educationMin?: string;
incomeMin?: number;
}
/**

Configuration for hard filters
*/
export interface HardFilterConfig {
enableCasteFilter: boolean;
strictCasteFilter: boolean;      // If true: both must accept. If false: "Any" acceptable
enableLocationFilter: boolean;
enableAgeFilter: boolean;
enableRequiredFieldsFilter: boolean;
requiredFields: (keyof UserProfile)[];
}

export const DEFAULT_HARD_FILTER_CONFIG: HardFilterConfig = {
enableCasteFilter: true,
strictCasteFilter: false,          // "Any" is acceptable (lenient mode)
enableLocationFilter: true,
enableAgeFilter: true,
enableRequiredFieldsFilter: true,
requiredFields: ['name', 'gender', 'dob', 'city', 'caste', 'education', 'bio'],
};
/**

MAIN FUNCTION: Check all hard filters

Returns immediately on first failure (early exit for performance)
*/
export function checkHardFilters(
user1: UserProfile,
user2: UserProfile,
config: HardFilterConfig = DEFAULT_HARD_FILTER_CONFIG
): HardFilterResult {
const reasons: string[] = [];

// FILTER 1: GENDER
// Must be opposite gender
if (user1.gender === user2.gender) {
reasons.push(`Gender mismatch: Both are ${user1.gender}`);
  return { passed: false, reasons };
}

// FILTER 2: PROFILE STATUS
// Both must be approved
if (user2.profileStatus !== 'approved') {
reasons.push(`Profile status is "${user2.profileStatus}", not approved`);
  return { passed: false, reasons };
}

if (user1.profileStatus !== 'approved') {
reasons.push(`User profile status is "${user1.profileStatus}", not approved`);
  return { passed: false, reasons };
}
// FILTER 3: AGE RANGE
if (config.enableAgeFilter) {
const age1 = calculateAge(user1.dob);
const age2 = calculateAge(user2.dob);
const prefMin1 = user1.agePreferenceMin || 18;
const prefMax1 = user1.agePreferenceMax || 99;
const prefMin2 = user2.agePreferenceMin || 18;
const prefMax2 = user2.agePreferenceMax || 99;
// Check if user2's age is within user1's preference
if (age2 < prefMin1 || age2 > prefMax1) {
  reasons.push(
    `${user2.name} age (${age2}) outside preference range (${prefMin1}-${prefMax1})`
  );
}

// Check if user1's age is within user2's preference
if (age1 < prefMin2 || age1 > prefMax2) {
  reasons.push(
    `${user1.name} age (${age1}) outside preference range (${prefMin2}-${prefMax2})`
  );
}

if (reasons.length > 0) {
  return { passed: false, reasons };
}
}
// FILTER 4: LOCATION
if (config.enableLocationFilter) {
const city1 = (user1.city || '').toLowerCase().trim();
const city2 = (user2.city || '').toLowerCase().trim();
if (city1 !== city2) {
  reasons.push(`Cities don't match: ${user1.city} vs ${user2.city}`);
  return { passed: false, reasons };
}
}
// FILTER 5: CASTE
if (config.enableCasteFilter) {
const caste1 = (user1.caste || '').toLowerCase();
const caste2 = (user2.caste || '').toLowerCase();
const prefs1 = (user1.castePreferences || []).map(c => c.toLowerCase());
const prefs2 = (user2.castePreferences || []).map(c => c.toLowerCase());
// Check if user1 accepts user2's caste
const user1AcceptsCaste2 = prefs1.includes(caste2) || prefs1.includes('any');

// Check if user2 accepts user1's caste
const user2AcceptsCaste1 = prefs2.includes(caste1) || prefs2.includes('any');

if (config.strictCasteFilter) {
  // STRICT MODE: Both must accept each other's caste
  if (!user1AcceptsCaste2) {
    reasons.push(
      `${user1.name}'s caste preferences don't include ${user2.caste}`
    );
  }
  if (!user2AcceptsCaste1) {
    reasons.push(
      `${user2.name}'s caste preferences don't include ${user1.caste}`
    );
  }
  if (reasons.length > 0) {
    return { passed: false, reasons };
  }
} else {
  // LENIENT MODE: At least one must accept
  if (!user1AcceptsCaste2 && !user2AcceptsCaste1) {
    reasons.push(`Neither accepts the other's caste`);
    return { passed: false, reasons };
  }
}
}
// FILTER 6: REQUIRED FIELDS
if (config.enableRequiredFieldsFilter) {
const missingFields: string[] = [];
for (const field of config.requiredFields) {
  const value = user2[field];

  // Check if field is empty
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    missingFields.push(field);
  }
}

if (missingFields.length > 0) {
  reasons.push(`Profile missing fields: ${missingFields.join(', ')}`);
  return { passed: false, reasons };
}
}
// ALL FILTERS PASSED ✅
return { passed: true, reasons: [] };
}
/**

Helper: Calculate age from date of birth
*/
function calculateAge(dob: string | Date): number {
const birthDate = new Date(dob);
const today = new Date();
let age = today.getFullYear() - birthDate.getFullYear();
const monthDiff = today.getMonth() - birthDate.getMonth();

if (
monthDiff < 0 ||
(monthDiff === 0 && today.getDate() < birthDate.getDate())
) {
age--;
}
return Math.max(0, age);
}
/**

HELPER: Filter list of candidates
Returns: { passed: [], rejected: [] }
*/
export function filterCandidatesByHardFilters(
user: UserProfile,
candidates: UserProfile[],
config: HardFilterConfig = DEFAULT_HARD_FILTER_CONFIG
): {
passed: UserProfile[];
rejected: Array<{ candidate: UserProfile; reasons: string[] }>;
} {
const passed: UserProfile[] = [];
const rejected: Array<{ candidate: UserProfile; reasons: string[] }> = [];

for (const candidate of candidates) {
const result = checkHardFilters(user, candidate, config);
if (result.passed) {
  passed.push(candidate);
} else {
  rejected.push({ candidate, reasons: result.reasons });
}
}
return { passed, rejected };
}
/**

DEBUG: Get statistics about hard filter failures
*/
export function getHardFilterStats(
user: UserProfile,
candidates: UserProfile[],
config: HardFilterConfig = DEFAULT_HARD_FILTER_CONFIG
): {
totalCandidates: number;
passedFilters: number;
failedFilters: number;
passRate: string;
reasons: Record<string, number>;
} {
const { passed, rejected } = filterCandidatesByHardFilters(
user,
candidates,
config
);

const reasonCounts: Record<string, number> = {};
for (const { reasons } of rejected) {
for (const reason of reasons) {
// Extract key part of reason
const key = reason.split(':')[0].trim();
reasonCounts[key] = (reasonCounts[key] || 0) + 1;
}
}
const passRate = candidates.length > 0
? ((passed.length / candidates.length) * 100).toFixed(1)
: '0';
return {
totalCandidates: candidates.length,
passedFilters: passed.length,
failedFilters: rejected.length,
passRate: `${passRate}%`,
reasons: reasonCounts,
};
}