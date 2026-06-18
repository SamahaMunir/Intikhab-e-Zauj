/**
 * Embeddings provider seam (Phase 2). OFF by default.
 *
 * Generates a vector for a piece of text using whichever provider is configured
 * via env. Until EMBEDDINGS_PROVIDER + EMBEDDINGS_API_KEY are set, `embed`
 * returns null and the caller falls back to non-vector retrieval. Never throws.
 *
 * Supported providers: 'voyage' (voyage-3), 'openai' (text-embedding-3-small).
 * Add others by extending the switch below.
 */

export function embeddingsConfigured(): boolean {
  return !!process.env.EMBEDDINGS_PROVIDER && !!process.env.EMBEDDINGS_API_KEY;
}

export async function embed(text: string): Promise<number[] | null> {
  const provider = process.env.EMBEDDINGS_PROVIDER;
  const key = process.env.EMBEDDINGS_API_KEY;
  if (!provider || !key || !text.trim()) return null;

  try {
    if (provider === 'voyage') {
      const r = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: process.env.EMBEDDINGS_MODEL || 'voyage-3', input: [text] }),
      });
      const d: any = await r.json();
      if (!r.ok) throw new Error(d?.error?.message || `voyage ${r.status}`);
      return d?.data?.[0]?.embedding ?? null;
    }

    if (provider === 'openai') {
      const r = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: process.env.EMBEDDINGS_MODEL || 'text-embedding-3-small', input: text }),
      });
      const d: any = await r.json();
      if (!r.ok) throw new Error(d?.error?.message || `openai ${r.status}`);
      return d?.data?.[0]?.embedding ?? null;
    }

    console.warn(`⚠ EMBEDDINGS_PROVIDER='${provider}' not implemented — skipping`);
    return null;
  } catch (e) {
    console.error('❌ embed() failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

/** Build the text we embed for a match pair (no IDs — just descriptive traits). */
export function pairToText(male: any, female: any): string {
  const side = (p: any, role: string) =>
    `${role}: ${[p?.profession, p?.education, p?.city, p?.caste, p?.age && `age ${p.age}`]
      .filter(Boolean).join(', ')}`;
  return `${side(male, 'Groom')}. ${side(female, 'Bride')}.`;
}
