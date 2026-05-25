/**
 * SCORING ALGORITHM (100-point system)
 * 
 * Weights based on Milestone 3 requirements:
 * - Caste Match: 25
 * - Profession Match: 15
 * - Age Gap Ideal: 15
 * - City Match: 15
 * - Height Preference: 10
 * - House Status: 10
 * - House Area: 10
 * 
 * TOTAL: 100 points
 */

export function calculateScore(user: any, candidate: any): number {
  let score = 0;

  // 1. CASTE MATCH (25 points) - Most important
  score += calculateCasteScore(user, candidate);

  // 2. PROFESSION MATCH (15 points)
  score += calculateProfessionScore(user, candidate);

  // 3. AGE GAP IDEAL (15 points)
  score += calculateAgeScore(user, candidate);

  // 4. CITY MATCH (15 points)
  score += calculateCityScore(user, candidate);

  // 5. HEIGHT PREFERENCE (10 points)
  score += calculateHeightScore(user, candidate);

  // 6. HOUSE STATUS (10 points)
  score += calculateHouseStatusScore(user, candidate);

  // 7. HOUSE AREA (10 points)
  score += calculateHouseAreaScore(user, candidate);

  // Ensure score is between 0-100
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * 1. CASTE MATCH (0-25 points)
 * Exact match = 25, otherwise 0 (cultural significance in Nikkah)
 */
function calculateCasteScore(user: any, candidate: any): number {
  if (!user.caste || !candidate.caste) return 0;

  if (user.caste.toLowerCase() === candidate.caste.toLowerCase()) {
    return 25;
  }

  // Small bonus for same region/culture even if exact caste differs
  return 0;
}

/**
 * 2. PROFESSION MATCH (0-15 points)
 * Exact match = 15, same field = 10, compatible = 5, none = 0
 */
function calculateProfessionScore(user: any, candidate: any): number {
  if (!user.profession || !candidate.profession) return 0;

  const userProf = user.profession.toLowerCase();
  const candProf = candidate.profession.toLowerCase();

  if (userProf === candProf) return 15;

  // Same field (e.g., both in tech, both in healthcare)
  if (professionsInSameField(userProf, candProf)) return 10;

  // Both employed (any profession)
  if (userProf && candProf) return 5;

  return 0;
}

/**
 * 3. AGE GAP IDEAL (0-15 points)
 * Ideal gap: 0-3 years = 15, 4-7 years = 12, 8-12 years = 8, 13-25 years = 3
 */
function calculateAgeScore(user: any, candidate: any): number {
  const userAge = user.age || 0;
  const candAge = candidate.age || 0;

  if (userAge === 0 || candAge === 0) return 0;

  const ageDiff = Math.abs(userAge - candAge);

  if (ageDiff <= 3) return 15;
  if (ageDiff <= 7) return 12;
  if (ageDiff <= 12) return 8;
  if (ageDiff <= 25) return 3;

  return 0;
}

/**
 * 4. CITY MATCH (0-15 points)
 * Same city = 15, same province = 8, willing to relocate = 3
 */
function calculateCityScore(user: any, candidate: any): number {
  if (!user.city || !candidate.city) return 0;

  const userCity = user.city.toLowerCase();
  const candCity = candidate.city.toLowerCase();

  if (userCity === candCity) return 15;

  // Same province (e.g., both in Punjab, both in Sindh)
  if (citiesInSameProvince(userCity, candCity)) return 8;

  // Different cities/provinces - small score for willingness
  return 3;
}

/**
 * 5. HEIGHT PREFERENCE (0-10 points)
 * Ideal height difference for opposite genders
 * Female prefers taller: candidate 5cm+ taller = 10
 * Male prefers shorter/equal: candidate shorter or equal = 10
 */
function calculateHeightScore(user: any, candidate: any): number {
  if (!user.height || !candidate.height) return 0;

  try {
    const userHeight = parseHeight(user.height); // in cm
    const candHeight = parseHeight(candidate.height); // in cm

    if (userHeight === 0 || candHeight === 0) return 0;

    const heightDiff = candHeight - userHeight;

    // Females typically prefer taller males (height difference > 5cm)
    if (user.gender === 'female' && heightDiff >= 5) return 10;

    // Males can be flexible
    if (user.gender === 'male' && heightDiff >= -10 && heightDiff <= 5) return 10;

    // Still compatible but not ideal
    if (Math.abs(heightDiff) <= 15) return 5;

    return 0;
  } catch {
    return 0;
  }
}

/**
 * 6. HOUSE STATUS (0-10 points)
 * Own = 10, Rented = 8, With family = 5, Other = 0
 */
function calculateHouseStatusScore(user: any, candidate: any): number {
  if (!user.houseStatus || !candidate.houseStatus) return 0;

  const statusScore: Record<string, number> = {
    own: 10,
    rented: 8,
    family: 5,
    with_family: 5,
    other: 0,
  };

  const userStatus = user.houseStatus.toLowerCase().replace(/\s+/g, '_');
  const candStatus = candidate.houseStatus.toLowerCase().replace(/\s+/g, '_');

  const userScore = statusScore[userStatus] ?? 0;
  const candScore = statusScore[candStatus] ?? 0;

  // Average of both, but bonus if both own/rented
  if (
    (userStatus === 'own' && candStatus === 'own') ||
    (userStatus === 'rented' && candStatus === 'rented')
  ) {
    return 10;
  }

  return (userScore + candScore) / 4; // Average, scaled
}

/**
 * 7. HOUSE AREA (0-10 points)
 * Size categories: Small < 1000, Medium 1000-2000, Large > 2000
 * Preference: Similar size = 10, one size difference = 5
 */
function calculateHouseAreaScore(user: any, candidate: any): number {
  if (!user.houseArea || !candidate.houseArea) return 0;

  try {
    const userArea = parseInt(user.houseArea.toString()) || 0;
    const candArea = parseInt(candidate.houseArea.toString()) || 0;

    if (userArea === 0 || candArea === 0) return 0;

    const userCategory = getAreaCategory(userArea);
    const candCategory = getAreaCategory(candArea);

    if (userCategory === candCategory) return 10;
    if (Math.abs(userCategory - candCategory) === 1) return 5;

    return 0;
  } catch {
    return 0;
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Parse height string (e.g., "5'10\"", "178cm") to cm
 */
function parseHeight(heightStr: string): number {
  if (!heightStr) return 0;

  const str = heightStr.toLowerCase().trim();

  // Handle cm format: "178cm"
  const cmMatch = str.match(/(\d+)\s*cm/);
  if (cmMatch) {
    return parseInt(cmMatch[1], 10);
  }

  // Handle feet'inch format: "5'10\""
  const feetInchMatch = str.match(/(\d+)\s*['"']\s*(\d+)?\s*["″]/);
  if (feetInchMatch) {
    const feet = parseInt(feetInchMatch[1], 10);
    const inches = feetInchMatch[2] ? parseInt(feetInchMatch[2], 10) : 0;
    return feet * 30.48 + inches * 2.54; // Convert to cm
  }

  // Handle just feet: "5.5"
  const feetDecimal = parseFloat(str);
  if (!isNaN(feetDecimal)) {
    return feetDecimal * 30.48; // Assume feet to cm
  }

  return 0;
}

/**
 * Categorize house area
 * Returns: 1 (small), 2 (medium), 3 (large)
 */
function getAreaCategory(sqFt: number): number {
  if (sqFt < 1000) return 1; // Small
  if (sqFt < 2000) return 2; // Medium
  return 3; // Large
}

/**
 * Check if two professions are in the same field
 */
function professionsInSameField(prof1: string, prof2: string): boolean {
  const techProfs = ['software', 'engineer', 'developer', 'programmer', 'it'];
  const medicalProfs = ['doctor', 'nurse', 'physician', 'medical', 'dentist'];
  const businessProfs = ['business', 'entrepreneur', 'manager', 'ceo', 'owner'];
  const educationProfs = ['teacher', 'professor', 'educator', 'education'];

  const professions = [techProfs, medicalProfs, businessProfs, educationProfs];

  for (const group of professions) {
    if (group.some((p) => prof1.includes(p)) && group.some((p) => prof2.includes(p))) {
      return true;
    }
  }

  return false;
}

/**
 * Check if two cities are in the same province (Pakistan)
 */
function citiesInSameProvince(city1: string, city2: string): boolean {
  const provinces: Record<string, string[]> = {
    punjab: [
      'lahore',
      'islamabad',
      'rawalpindi',
      'faisalabad',
      'multan',
      'bahawalpur',
      'gujranwala',
      'sialkot',
      'gujrat',
      'jhang',
    ],
    sindh: ['karachi', 'hyderabad', 'sukkur', 'larkana', 'mirpur khas'],
    kpk: ['peshawar', 'abbottabad', 'mardan', 'kohat', 'swat'],
    balochistan: ['quetta', 'gwadar', 'khuzdar'],
  };

  for (const [province, cities] of Object.entries(provinces)) {
    const normalizedCities = cities.map((c) => c.toLowerCase());
    if (
      normalizedCities.includes(city1.toLowerCase()) &&
      normalizedCities.includes(city2.toLowerCase())
    ) {
      return true;
    }
  }

  return false;
}

export { calculateCasteScore, calculateAgeScore, calculateCityScore };