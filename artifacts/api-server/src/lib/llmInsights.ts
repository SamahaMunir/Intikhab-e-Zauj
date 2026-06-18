import type { MatchInsights } from './insights';
import { formatSimilarMatchesForLLM, toSimilarCard, type SimilarMatch } from './ragRetrieval';
import type { Profile, ScoreBreakdown } from './matching';
import { callLLM, llmConfigured } from './llm-provider';

/**
 * LLM prose summary of staff insights. OFF by default.
 *
 * Provider-agnostic via lib/llm-provider (claude/gemini/openai/deepseek, chosen
 * by env). When no provider key is set, returns null and the UI shows template
 * bullets only. Never throws.
 *
 * PRIVACY: enabling this sends the insight bullets (profession/city/age, and
 * staff-authored bullets may contain names) to the configured LLM provider.
 * Only enable if acceptable for your deployment.
 */

export function llmInsightsEnabled(): boolean {
  return llmConfigured();
}

export async function summarizeInsights(insights: MatchInsights): Promise<string | null> {
  if (!llmConfigured()) return null;

  const { recommendation, bullets, similar } = insights;
  const facts = [
    `Compatibility score: ${recommendation.score}/100`,
    `Hard filters: ${recommendation.hardFiltersPassed ? 'passed' : 'flagged'}`,
    `Heuristic label: ${recommendation.label}`,
    similar.total > 0
      ? `Similar past matches: ${similar.total} (${similar.successful} led to nikah, ${similar.pending} pending${similar.successRate !== null ? `, ${similar.successRate}% success` : ''})`
      : 'No comparable past matches yet',
    '',
    'Insight bullets:',
    ...bullets.map(b => `- ${b}`),
  ].join('\n');

  const system =
    'You advise matrimonial matchmaking staff. Given structured facts about a ' +
    'match, write a concise 2-3 sentence recommendation. Use ONLY the numbers ' +
    'provided — never invent statistics or percentages. End with one of: ' +
    'Recommend APPROVE, Recommend REVIEW, or Recommend CAUTION. Be factual, no hype.';

  const r = await callLLM(system, `Match facts:\n${facts}`, 220);
  return r?.text?.trim() || null;
}

export type RagRecommendation = 'APPROVE' | 'REVIEW' | 'CAUTION';

export interface RagInsight {
  recommendation: RagRecommendation;
  reasoning: string;
  confidenceScore: number; // 0-100
  similarMatches: ReturnType<typeof toSimilarCard>[];
}

export interface RagInput {
  male: Profile;
  female: Profile;
  score: ScoreBreakdown;
  hardFiltersPassed: boolean;
  similar: SimilarMatch[];
  matchId?: string;
}

/**
 * RAG-augmented recommendation: feeds the retrieved similar past matches (with
 * real outcomes) + the current pair into Claude and parses a structured
 * APPROVE/REVIEW/CAUTION verdict. Returns null when ANTHROPIC_API_KEY is unset
 * or on any error (caller shows the template insights only). Never throws.
 */
export async function summarizeInsightsWithRAG(input: RagInput): Promise<RagInsight | null> {
  if (!llmConfigured()) return null;

  const { male, female, score, hardFiltersPassed, similar } = input;
  const successCount = similar.filter(m => m.status === 'completed').length;
  const total = similar.length;
  const context = formatSimilarMatchesForLLM(similar);

  const systemPrompt =
    'You are an experienced matrimonial counselor advising matchmaking staff. ' +
    'Given a new match, its compatibility score, and similar PAST matches with ' +
    'their real outcomes, give a 2-3 sentence recommendation.\n' +
    'Rules: APPROVE = score 75+, hard filters pass, similar successful matches exist. ' +
    'REVIEW = score 50-74 or unclear factors. CAUTION = score <50 or hard-filter concerns. ' +
    'NEVER invent numbers or probabilities — use only the data given. ' +
    'End with exactly one tag: [APPROVE], [REVIEW], or [CAUTION].';

  const sb = score as any;
  const userPrompt =
    `NEW MATCH:\n` +
    `Groom: ${male.name}, ${male.age ?? '?'}, ${male.profession ?? '?'}, ${male.city ?? '?'}, caste ${male.caste ?? '?'}\n` +
    `Bride: ${female.name}, ${female.age ?? '?'}, ${female.profession ?? '?'}, ${female.city ?? '?'}, caste ${female.caste ?? '?'}\n\n` +
    `Compatibility: ${score.total}/100 (caste ${sb.caste}/25, profession ${sb.profession}/15, ` +
    `ageGap ${sb.ageGap}/15, city ${sb.city}/15, height ${sb.height}/10, houseStatus ${sb.houseStatus}/10, houseArea ${sb.houseArea}/10)\n` +
    `Hard filters: ${hardFiltersPassed ? 'passed' : 'FLAGGED'}\n\n` +
    `SIMILAR PAST MATCHES:\n${context}\n\n` +
    `Summary: ${total} similar matches, ${successCount} married` +
    (total > 0 ? ` (${Math.round((successCount / total) * 100)}% success).` : '.') +
    `\n\nProvide your recommendation.`;

  const r = await callLLM(systemPrompt, userPrompt, 300, input.matchId || '');
  if (!r) return null;
  const content = r.text;

  let recommendation: RagRecommendation = 'REVIEW';
  if (content.includes('[APPROVE]')) recommendation = 'APPROVE';
  else if (content.includes('[CAUTION]')) recommendation = 'CAUTION';

  const confidenceScore = Math.min(100, 50 + successCount * 10 + (score.total > 75 ? 20 : 0));

  return {
    recommendation,
    reasoning: content.replace(/\[APPROVE\]|\[REVIEW\]|\[CAUTION\]/g, '').trim(),
    confidenceScore,
    similarMatches: similar.map(toSimilarCard),
  };
}
