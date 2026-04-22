export function computeMatchScore(a: any, b: any, weights: any) {
  // Hard filters
  if (a.gender === b.gender) return { total: 0, breakdown: { age: 0, location: 0, caste: 0, education: 0, income: 0, children: 0 } };
  
  // Calculate scores (mock logic for now to fulfill signature)
  const breakdown = { age: 80, location: 80, caste: 80, education: 80, income: 80, children: 80 };
  const total = 80;

  return { total, breakdown };
}
