export interface HardFilterResult {
  passes: boolean;
  rejections: { reason: string }[];
}

export function applyHardFilters(user: any, candidate: any): HardFilterResult {
  const rejections: { reason: string }[] = [];

  // Only check: opposite gender (required)
  if (user.gender && candidate.gender && user.gender === candidate.gender) {
    rejections.push({ reason: 'Same gender' });
    return { passes: false, rejections };
  }

  // Optional: age within ±15 years
  if (user.age && candidate.age) {
    if (Math.abs(user.age - candidate.age) > 15) {
      rejections.push({ reason: `Age gap ${Math.abs(user.age - candidate.age)}y` });
    }
  }

  return {
    passes: rejections.length === 0,
    rejections,
  };
}