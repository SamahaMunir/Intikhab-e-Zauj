import { useCallback, useEffect, useState } from 'react';
import matchingService from '../services/matchingService';
import type { MatchItem } from '../components/matches/types';

/** Dedup candidates, keep highest score, drop incomplete records. */
function dedup(raw: MatchItem[]): MatchItem[] {
  const seen = new Map<string, MatchItem>();
  for (const m of raw) {
    const cid = m.candidateId || m.candidate?._id;
    if (!cid) continue;
    const existing = seen.get(cid);
    const score = m.scoreBreakdown?.total ?? m.score ?? 0;
    const existScore = existing ? (existing.scoreBreakdown?.total ?? existing.score ?? 0) : -1;
    if (!existing || score > existScore) seen.set(cid, m);
  }
  return Array.from(seen.values()).filter(m => m.candidate?.name && m.candidate?.city);
}

export interface UseMatches {
  matches: MatchItem[];
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  /** (Re)generate on the backend then fetch. */
  reload: () => Promise<void>;
  /** Same as reload but flagged as an explicit user-triggered regenerate. */
  generate: () => Promise<void>;
}

/**
 * Single entry point for match data on the frontend. All scoring/filtering is
 * done by the backend matching engine (api-server/src/lib/matching); this hook
 * only fetches and shapes the results.
 */
export function useMatches(userId: string | undefined, enabled = true): UseMatches {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async (regenerate: boolean) => {
    if (!userId) { setError('Please log in to view matches.'); setIsLoading(false); return; }
    try {
      if (regenerate) { setIsGenerating(true); setIsLoading(false); } else { setIsLoading(true); }
      setError(null);
      await matchingService.generateMatches(userId);
      const res = await matchingService.getMatches(userId);
      setMatches(dedup(res.matches || []));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load matches');
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!enabled) { setIsLoading(false); return; }
    fetchMatches(false);
  }, [enabled, fetchMatches]);

  return {
    matches,
    isLoading,
    isGenerating,
    error,
    reload: () => fetchMatches(false),
    generate: () => fetchMatches(true),
  };
}
