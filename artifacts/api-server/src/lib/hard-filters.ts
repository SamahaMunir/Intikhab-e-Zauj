export interface FilterRejection {
  reason: string;
  detail: string;
}

export interface HardFilterResult {
  passes: boolean;
  rejections: FilterRejection[];
}

/**
 * Hard filters - eliminate incompatible profiles
 * Based on ACTUAL schema fields (not preference fields)
 */
export function applyHardFilters(
  user: any,
  candidate: any
): HardFilterResult {
  const rejections: FilterRejection[] = [];

  // 1. GENDER FILTER - Must be opposite gender
  if (user.gender === candidate.gender) {
    rejections.push({
      reason: 'Same Gender',
      detail: `User is ${user.gender}, candidate is ${candidate.gender}`,
    });
  }

  // 2. AGE FILTER - Reasonable age range (18-99)
  // Default: Accept ages within 18-99 range
  const userAge = user.age || 0;
  const candidateAge = candidate.age || 0;

  if (candidateAge < 18 || candidateAge > 99) {
    rejections.push({
      reason: 'Age Out of Range',
      detail: `Candidate age ${candidateAge} is outside acceptable range (18-99)`,
    });
  }

  // Age gap should be reasonable (max 25 years difference)
  const ageGap = Math.abs(userAge - candidateAge);
  if (ageGap > 25) {
    rejections.push({
      reason: 'Age Gap Too Large',
      detail: `Age difference is ${ageGap} years (max allowed: 25)`,
    });
  }

  // 3. CASTE FILTER - Both must have caste field
  if (!user.caste || !candidate.caste) {
    rejections.push({
      reason: 'Caste Missing',
      detail: 'Both profiles must have caste information',
    });
  }

  // 4. LOCATION FILTER - Both must be in some city
  if (!user.city || !candidate.city) {
    rejections.push({
      reason: 'Location Missing',
      detail: 'Both profiles must have city information',
    });
  }

  // 5. PROFILE STATUS FILTER - Only approved profiles
  if (candidate.profileStatus !== 'approved') {
    rejections.push({
      reason: 'Profile Not Approved',
      detail: `Candidate profile status is "${candidate.profileStatus}", must be "approved"`,
    });
  }

  // 6. PAYMENT STATUS FILTER - Only paid profiles
  if (candidate.paymentStatus !== 'completed') {
    rejections.push({
      reason: 'Payment Not Completed',
      detail: `Candidate payment status is "${candidate.paymentStatus}", must be "completed"`,
    });
  }

  // 7. SELF-MATCH PREVENTION - Cannot match with self
  if (user._id?.toString() === candidate._id?.toString()) {
    rejections.push({
      reason: 'Self Match',
      detail: 'Cannot generate matches with own profile',
    });
  }

  // 8. MINIMUM PROFILE COMPLETION
  const minCompletion = 75; // At least 75% complete
  if ((candidate.profileCompletion || 0) < minCompletion) {
    rejections.push({
      reason: 'Incomplete Profile',
      detail: `Profile is ${candidate.profileCompletion}% complete, must be at least ${minCompletion}%`,
    });
  }

  return {
    passes: rejections.length === 0,
    rejections,
  };
}

/**
 * Quick check - if this returns false, skip expensive scoring
 */
export function passesQuickFilters(
  user: any,
  candidate: any
): boolean {
  const result = applyHardFilters(user, candidate);
  return result.passes;
}