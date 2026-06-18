/**
 * LLM Provider Abstraction.
 *
 * One interface, swappable providers via env — no code changes to migrate.
 * Supported: claude · gemini · openai · deepseek.
 *
 * Selection: PREFERRED_LLM (claude|gemini|openai|deepseek|auto). 'auto' (default)
 * picks the first provider whose key is present, in cost-then-quality order:
 * gemini → claude → openai → deepseek.
 *
 * If no key is configured, `callLLM` returns null (feature disabled) and never
 * throws — callers fall back to the template insights.
 *
 * Per-provider model override env: CLAUDE_MODEL / GEMINI_MODEL / OPENAI_MODEL /
 * DEEPSEEK_MODEL.
 */

import { recordCost } from './cost-tracker';

export type LLMProvider = 'claude' | 'gemini' | 'openai' | 'deepseek';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
}

export interface LLMResponse {
  provider: LLMProvider;
  text: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
}

const DEFAULT_MODELS: Record<LLMProvider, string> = {
  claude: 'claude-haiku-4-5',
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  deepseek: 'deepseek-chat',
};

const KEY_ENV: Record<LLMProvider, string> = {
  claude: 'ANTHROPIC_API_KEY',
  gemini: 'GOOGLE_API_KEY',
  openai: 'OPENAI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
};

const MODEL_ENV: Record<LLMProvider, string> = {
  claude: 'CLAUDE_MODEL',
  gemini: 'GEMINI_MODEL',
  openai: 'OPENAI_MODEL',
  deepseek: 'DEEPSEEK_MODEL',
};

// Cost-then-quality order for 'auto'
const AUTO_ORDER: LLMProvider[] = ['gemini', 'claude', 'openai', 'deepseek'];

function configFor(p: LLMProvider): LLMConfig | null {
  const apiKey = process.env[KEY_ENV[p]];
  if (!apiKey) return null;
  return { provider: p, apiKey, model: process.env[MODEL_ENV[p]] || DEFAULT_MODELS[p] };
}

/** Resolve the active LLM provider from env, or null if none configured. */
export function getLLMConfig(): LLMConfig | null {
  const preferred = (process.env.PREFERRED_LLM || 'auto').toLowerCase();
  if (preferred !== 'auto' && (AUTO_ORDER as string[]).includes(preferred)) {
    const c = configFor(preferred as LLMProvider);
    if (c) return c;
  }
  for (const p of AUTO_ORDER) {
    const c = configFor(p);
    if (c) return c;
  }
  return null;
}

export function llmConfigured(): boolean {
  return getLLMConfig() !== null;
}

/**
 * Unified LLM call. Returns null when no provider is configured or on error.
 * Records cost to the tracker and logs usage. Never throws.
 */
export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 300,
  matchId = ''
): Promise<LLMResponse | null> {
  const config = getLLMConfig();
  if (!config) return null;

  try {
    let resp: LLMResponse;
    switch (config.provider) {
      case 'claude':   resp = await callClaude(config, systemPrompt, userPrompt, maxTokens); break;
      case 'gemini':   resp = await callGemini(config, systemPrompt, userPrompt, maxTokens); break;
      case 'openai':   resp = await callOpenAI(config, systemPrompt, userPrompt, maxTokens); break;
      case 'deepseek': resp = await callDeepSeek(config, systemPrompt, userPrompt, maxTokens); break;
      default: return null;
    }
    logLLMUsage(resp);
    recordCost(resp.provider, resp.tokensIn, resp.tokensOut, resp.cost, matchId);
    return resp;
  } catch (e) {
    console.error('❌ callLLM failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

// ── Claude (Anthropic Messages API) ─────────────────────────────────────────
async function callClaude(c: LLMConfig, system: string, user: string, maxTokens: number): Promise<LLMResponse> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': c.apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: c.model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
  });
  const d: any = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || `Claude ${r.status}`);
  const tokensIn = d?.usage?.input_tokens ?? 0;
  const tokensOut = d?.usage?.output_tokens ?? 0;
  const text = Array.isArray(d?.content) ? d.content.map((x: any) => x?.text || '').join('') : '';
  return { provider: 'claude', text, tokensIn, tokensOut, cost: ((tokensIn + tokensOut) / 1000) * 0.0005 };
}

// ── Gemini (Google Generative Language API) ─────────────────────────────────
async function callGemini(c: LLMConfig, system: string, user: string, maxTokens: number): Promise<LLMResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${c.model}:generateContent?key=${c.apiKey}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      // thinkingBudget:0 disables 2.5-family "thinking" tokens so the whole
      // budget goes to the visible answer (else short replies get truncated).
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 1.0,
        ...(c.model.includes('2.5') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    }),
  });
  const d: any = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || `Gemini ${r.status}`);
  const text = d?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('') || '';
  // Gemini may return usageMetadata; else estimate (~4 chars/token)
  const tokensIn = d?.usageMetadata?.promptTokenCount ?? Math.ceil(user.length / 4);
  const tokensOut = d?.usageMetadata?.candidatesTokenCount ?? Math.ceil(text.length / 4);
  const cost = (tokensIn / 1000) * 0.0001 + (tokensOut / 1000) * 0.0003;
  return { provider: 'gemini', text, tokensIn, tokensOut, cost };
}

// ── OpenAI (Chat Completions) ───────────────────────────────────────────────
async function callOpenAI(c: LLMConfig, system: string, user: string, maxTokens: number): Promise<LLMResponse> {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.apiKey}` },
    body: JSON.stringify({
      model: c.model, max_tokens: maxTokens, temperature: 1.0,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });
  const d: any = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || `OpenAI ${r.status}`);
  const tokensIn = d?.usage?.prompt_tokens ?? 0;
  const tokensOut = d?.usage?.completion_tokens ?? 0;
  const text = d?.choices?.[0]?.message?.content || '';
  const cost = (tokensIn / 1000) * 0.00015 + (tokensOut / 1000) * 0.0006;
  return { provider: 'openai', text, tokensIn, tokensOut, cost };
}

// ── DeepSeek (OpenAI-compatible) ────────────────────────────────────────────
async function callDeepSeek(c: LLMConfig, system: string, user: string, maxTokens: number): Promise<LLMResponse> {
  const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.apiKey}` },
    body: JSON.stringify({
      model: c.model, max_tokens: maxTokens, temperature: 1.0,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });
  const d: any = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || `DeepSeek ${r.status}`);
  const tokensIn = d?.usage?.prompt_tokens ?? 0;
  const tokensOut = d?.usage?.completion_tokens ?? 0;
  const text = d?.choices?.[0]?.message?.content || '';
  return { provider: 'deepseek', text, tokensIn, tokensOut, cost: ((tokensIn + tokensOut) / 1000) * 0.00001 };
}

export function logLLMUsage(r: LLMResponse): void {
  console.log(`[LLM] ${r.provider.toUpperCase()} | tokens ${r.tokensIn}+${r.tokensOut} | $${r.cost.toFixed(6)}`);
}
