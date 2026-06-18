import { Db } from 'mongodb';
import { embed, embeddingsConfigured, pairToText } from './embeddings';
import type { SimilarStats } from './insights';

/**
 * Atlas Vector Search seam (Phase 2). OFF by default.
 *
 * Semantic retrieval of similar past match pairs. Requires:
 *   1. MongoDB Atlas (not a self-hosted Mongo),
 *   2. an embeddings provider (see embeddings.ts),
 *   3. a populated `match_vectors` collection + the vector index below,
 *   4. VECTOR_SEARCH_ENABLED=true.
 *
 * When any of these is missing, `findSimilarByVector` returns null and the
 * caller falls back to categorical retrieval. Never throws.
 *
 * Each `match_vectors` doc should look like:
 *   { pairKey: string, embedding: number[], outcome: 'success'|'pending'|'other' }
 * populated by an offline job that embeds each historical pair (pairToText) and
 * records its outcome (completed proposal = success).
 *
 * Atlas vector index ("match_vector_index" on `match_vectors`):
 *   {
 *     "fields": [
 *       { "type": "vector", "path": "embedding", "numDimensions": 1024, "similarity": "cosine" }
 *     ]
 *   }
 * (numDimensions must match the embedding model: voyage-3 = 1024, openai
 *  text-embedding-3-small = 1536.)
 */

export function vectorSearchEnabled(): boolean {
  return process.env.VECTOR_SEARCH_ENABLED === 'true' && embeddingsConfigured();
}

export const VECTOR_INDEX_NAME = process.env.VECTOR_INDEX_NAME || 'match_vector_index';
export const VECTOR_COLLECTION = process.env.VECTOR_COLLECTION || 'match_vectors';

/**
 * Retrieve similar past pairs by vector similarity and tally outcomes.
 * Returns SimilarStats, or null when vector search is unavailable.
 */
export async function findSimilarByVector(
  db: Db,
  male: any,
  female: any,
  limit = 20
): Promise<SimilarStats | null> {
  if (!vectorSearchEnabled()) return null;

  try {
    const vector = await embed(pairToText(male, female));
    if (!vector) return null;

    const docs = await db.collection(VECTOR_COLLECTION).aggregate([
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: 'embedding',
          queryVector: vector,
          numCandidates: Math.max(100, limit * 5),
          limit,
        },
      },
      { $project: { outcome: 1, _id: 0 } },
    ]).toArray();

    if (!docs.length) return { total: 0, successful: 0, pending: 0, successRate: null };

    let successful = 0, pending = 0;
    for (const d of docs) {
      if (d.outcome === 'success') successful++;
      else if (d.outcome === 'pending') pending++;
    }
    const total = docs.length;
    return { total, successful, pending, successRate: total ? Math.round((successful / total) * 100) : null };
  } catch (e) {
    console.error('❌ findSimilarByVector failed (falling back):', e instanceof Error ? e.message : e);
    return null;
  }
}
