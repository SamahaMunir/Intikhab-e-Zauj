import { ObjectId } from 'mongodb';
export interface ScoringWeights {
age: number;        // 0.15
location: number;   // 0.15
caste: number;      // 0.25
education: number;  // 0.15
income: number;     // 0.10
profession?: number; // 0.05 (new)
height?: number;    // 0.05 (new)
house?: number;     // 0.10 (new)
}
export const DEFAULT_WEIGHTS: ScoringWeights = {
age: 0.15,
location: 0.15,
caste: 0.25,
education: 0.15,
income: 0.10,
profession: 0.05,
height: 0.05,
house: 0.10,
};
export interface ScoreBreakdown {
age: number;
location: number;
caste: number;
education: number;
income: number;
profession?: number;
height?: number;
house?: number;
}
export interface MatchScore {
total: number;
breakdown: ScoreBreakdown;
}
const EDUCATION_RANK: Record<string, number> = {
'Matric': 1,
'Intermediate': 2,
'Bachelors': 3,
'Masters': 4,
'MPhil': 5,
'PhD': 6,
};
const PROFESSION_CATEGORIES: Record<string, string[]> = {
'tech': ['Software Engineer', 'Developer', 'IT Professional', 'Business Analyst'],
'medical': ['Doctor', 'Nurse', 'Pharmacist'],
'education': ['Teacher', 'Professor', 'Lecturer'],
'business': ['Manager', 'Director', 'Business Owner', 'Entrepreneur'],
'finance': ['Accountant', 'Financial Analyst', 'CFO', 'Banker'],
'creative': ['Designer', 'Photographer', 'Artist'],
};
/**

MAIN FUNCTION: Calculate match score

Input: Two users
Output: Score (0-100) with breakdown
*/
export function computeMatchScore(
user1: any,
user2: any,
weights: ScoringWeights = DEFAULT_WEIGHTS
): MatchScore {
const breakdown: ScoreBreakdown = {
  age: 0,
  location: 0,
  caste: 0,
  education: 0,
  income: 0
};

// 1. AGE SCORE (15 points max)
breakdown.age = calculateAgeScore(user1, user2);
// 2. LOCATION SCORE (15 points max)
breakdown.location = calculateLocationScore(user1, user2);
// 3. CASTE SCORE (25 points max)
breakdown.caste = calculateCasteScore(user1, user2);
// 4. EDUCATION SCORE (15 points max)
breakdown.education = calculateEducationScore(user1, user2);
// 5. INCOME SCORE (10 points max)
breakdown.income = calculateIncomeScore(user1, user2);
// 6. PROFESSION SCORE (5 points max)
breakdown.profession = calculateProfessionScore(user1, user2);
// 7. HEIGHT SCORE (5 points max)
breakdown.height = calculateHeightScore(user1, user2);
// 8. HOUSE SCORE (10 points max)
breakdown.house = calculateHouseScore(user1, user2);
// Calculate weighted total
const total = Math.round(
breakdown.age * (weights.age || 0) * 100 +
breakdown.location * (weights.location || 0) * 100 +
breakdown.caste * (weights.caste || 0) * 100 +
breakdown.education * (weights.education || 0) * 100 +
breakdown.income * (weights.income || 0) * 100 +
(breakdown.profession || 0) * (weights.profession || 0) * 100 +
(breakdown.height || 0) * (weights.height || 0) * 100 +
(breakdown.house || 0) * (weights.house || 0) * 100
);
return {
total: Math.min(100, Math.max(0, total)), // Clamp to 0-100
breakdown,
};
}
/**

SCORE 1: AGE COMPATIBILITY (15 points max)
Closer ages = higher score
*/
function calculateAgeScore(user1: any, user2: any): number {
const age1 = getAge(user1.dob);
const age2 = getAge(user2.dob);
const ageDifference = Math.abs(age1 - age2);

// Perfect match: 0-2 year difference = 15 points
// Good match: 3-5 years = 12 points
// Acceptable: 6-10 years = 8 points
// Tolerable: 11+ years = 3 points
if (ageDifference <= 2) return 15;
if (ageDifference <= 5) return 12;
if (ageDifference <= 10) return 8;
return 3;
}
/**

SCORE 2: LOCATION COMPATIBILITY (15 points max)
Same city = 15 points
*/
function calculateLocationScore(user1: any, user2: any): number {
const city1 = (user1.city || '').toLowerCase();
const city2 = (user2.city || '').toLowerCase();

if (city1 === city2) return 15;
return 0; // Hard filter should catch this
}
/**

SCORE 3: CASTE COMPATIBILITY (25 points max)
Both accept = 25, one accepts = 15, neither = 5
*/
function calculateCasteScore(user1: any, user2: any): number {
const caste1 = (user1.caste || '').toLowerCase();
const caste2 = (user2.caste || '').toLowerCase();
const prefs1 = (user1.castePreferences || []).map((c: string) => c.toLowerCase());
const prefs2 = (user2.castePreferences || []).map((c: string) => c.toLowerCase());

const user1Accepts = prefs1.includes(caste2) || prefs1.includes('any');
const user2Accepts = prefs2.includes(caste1) || prefs2.includes('any');
if (user1Accepts && user2Accepts) return 25;
if (user1Accepts || user2Accepts) return 15;
return 5;
}
/**

SCORE 4: EDUCATION COMPATIBILITY (15 points max)
Same level = 15, adjacent = 10, 2 levels apart = 5
*/
function calculateEducationScore(user1: any, user2: any): number {
const edu1 = EDUCATION_RANK[user1.education || 'Matric'] || 0;
const edu2 = EDUCATION_RANK[user2.education || 'Matric'] || 0;

const eduDiff = Math.abs(edu1 - edu2);
if (eduDiff === 0) return 15;
if (eduDiff === 1) return 10;
if (eduDiff === 2) return 5;
return 2;
}
/**

SCORE 5: INCOME COMPATIBILITY (10 points max)
Male income >= Female's minimum = 10 points
*/
function calculateIncomeScore(user1: any, user2: any): number {
// Determine who is male/female
const male = user1.gender === 'male' ? user1 : user2;
const female = user1.gender === 'female' ? user1 : user2;

const maleIncome = male.income || 0;
const femaleIncomeMin = female.incomeMin || 0;
if (maleIncome >= femaleIncomeMin) return 10;
if (maleIncome >= femaleIncomeMin * 0.8) return 5;
return 0;
}
/**

SCORE 6: PROFESSION COMPATIBILITY (5 points max)
Same field = 5 points
*/
function calculateProfessionScore(user1: any, user2: any): number {
const prof1 = (user1.profession || '').toLowerCase();
const prof2 = (user2.profession || '').toLowerCase();

// Check if professions are in same category
for (const category in PROFESSION_CATEGORIES) {
const professions = PROFESSION_CATEGORIES[category].map(p => p.toLowerCase());
if (professions.includes(prof1) && professions.includes(prof2)) {
return 5;
}
}
return 0;
}
/**
SCORE 7: HEIGHT COMPATIBILITY (5 points max)
If height preference exists and matches = 5 points
*/
function calculateHeightScore(user1: any, user2: any): number {
const height1 = parseFloat(user1.height || '0');
const height2 = parseFloat(user2.height || '0');

if (height1 === 0 || height2 === 0) return 3; // Partial credit if missing
// For now, just give points if both have heights specified
return 5;
}
/**

SCORE 8: HOUSE COMPATIBILITY (10 points max)
Both own house = 10, mixed = 5
*/
function calculateHouseScore(user1: any, user2: any): number {
const status1 = (user1.houseStatus || '').toLowerCase();
const status2 = (user2.houseStatus || '').toLowerCase();

if (status1 === 'own' && status2 === 'own') return 10;
if (status1 !== 'own' || status2 !== 'own') return 5;
return 3;
}
/**

Helper: Get age from date of birth
*/
function getAge(dob: string | Date): number {
const birthDate = new Date(dob);
const today = new Date();
let age = today.getFullYear() - birthDate.getFullYear();
const m = today.getMonth() - birthDate.getMonth();
if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
return age;
}

