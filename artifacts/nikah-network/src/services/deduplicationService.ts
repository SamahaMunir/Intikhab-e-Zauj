// ============================================
// DEDUPLICATION SERVICE
// ============================================
export interface Match {
  _id: string;
  candidateId: string;
  score: number;
  scoreBreakdown?: {
    caste: number;
    profession: number;
    ageGap: number;
    city: number;
    height: number;
    houseStatus: number;
    houseArea: number;
    total: number;
  };
  candidate?: {
    _id: string;
    name: string;
    age: number;
    city: string;
    profession: string;
    photo?: string;
    gender: string;
    email?: string;
  };
}

/**
 * Remove duplicate matches
 * A duplicate is when the same candidateId appears multiple times
 * Keep only the HIGHEST score version
 */
export function deduplicateMatches(matches: Match[]): Match[] {
  const candidateMap = new Map<string, Match>();

  for (const match of matches) {
    const candidateId = match.candidateId || match.candidate?._id;
    
    if (!candidateId) continue;

    // If we haven't seen this candidate, add them
    if (!candidateMap.has(candidateId)) {
      candidateMap.set(candidateId, match);
    } else {
      // If we have seen them, keep the one with the higher score
      const existing = candidateMap.get(candidateId)!;
      if ((match.scoreBreakdown?.total || match.score) > 
          (existing.scoreBreakdown?.total || existing.score)) {
        candidateMap.set(candidateId, match);
      }
    }
  }

  // Convert map back to array and sort by score (descending)
  return Array.from(candidateMap.values()).sort(
    (a, b) => (b.scoreBreakdown?.total || b.score) - (a.scoreBreakdown?.total || a.score)
  );
}

/**
 * Check if two matches are duplicates based on email
 */
export function isDuplicateByEmail(
  matches: Match[],
): Map<string, number> {
  const emailCount = new Map<string, number>();
  
  for (const match of matches) {
    const email = match.candidate?.email;
    if (email) {
      emailCount.set(email, (emailCount.get(email) || 0) + 1);
    }
  }

  return emailCount;
}

/**
 * Remove matches with invalid or missing candidate data
 */
export function filterValidMatches(matches: Match[]): Match[] {
  return matches.filter(
    (match) =>
      match.candidate &&
      match.candidate.name &&
      match.candidate.age &&
      match.candidate.city
  );
}

/**
 * Full cleanup pipeline
 */
export function cleanupMatches(matches: Match[]): Match[] {
  let cleaned = filterValidMatches(matches);
  cleaned = deduplicateMatches(cleaned);
  return cleaned;
}