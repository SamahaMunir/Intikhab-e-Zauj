export interface HardFilterResult {
  passes: boolean;
  rejections: { reason: string }[];
}

export function applyHardFilters(user: any, candidate: any): HardFilterResult {
  const rejections: { reason: string }[] = [];

  // Rule 1: Opposite gender required (always enforced)
  if (user.gender && candidate.gender && user.gender === candidate.gender) {
    rejections.push({ reason: 'Same gender' });
    return { passes: false, rejections };
  }

  // Rule 2: Age gap ≤12 years (stricter than before — matrimonial norms)
  if (user.age && candidate.age) {
    const ageDiff = Math.abs(Number(user.age) - Number(candidate.age));
    if (ageDiff > 12) {
      rejections.push({ reason: `Age gap ${ageDiff}y exceeds 12-year limit` });
    }
  }

  // Rule 3: Male should not be more than 3 years younger than female (Islamic norm)
  if (user.gender === 'male' && candidate.gender === 'female') {
    if (user.age && candidate.age && Number(user.age) < Number(candidate.age) - 3) {
      rejections.push({ reason: 'Male more than 3 years younger than female' });
    }
  }

  return { passes: rejections.length === 0, rejections };
}
