import { Db } from 'mongodb';
import { DEFAULT_WEIGHTS, WEIGHT_KEYS, type ScoreWeights } from '../lib/matching/types';

/**
 * Platform config, stored as single well-known docs in the `config` collection.
 * Currently: matching score weights (staff-tunable).
 */
const WEIGHTS_ID = 'scoreWeights';

export async function getScoreWeights(db: Db): Promise<ScoreWeights> {
  const doc = await db.collection('config').findOne({ _id: WEIGHTS_ID as any });
  // Merge over defaults so a partial/legacy doc can't produce NaN dimensions.
  return doc?.weights ? { ...DEFAULT_WEIGHTS, ...doc.weights } : { ...DEFAULT_WEIGHTS };
}

export async function setScoreWeights(db: Db, weights: ScoreWeights): Promise<void> {
  await db.collection('config').updateOne(
    { _id: WEIGHTS_ID as any },
    { $set: { weights, updatedAt: new Date() } },
    { upsert: true }
  );
}

/**
 * Validate an incoming weights payload. Returns clean weights, or an error string.
 * Requires all 7 keys as finite numbers in 0..100.
 */
export function validateWeights(input: any): { weights: ScoreWeights } | { error: string } {
  if (!input || typeof input !== 'object') return { error: 'weights object required' };
  const out = {} as ScoreWeights;
  for (const k of WEIGHT_KEYS) {
    const v = Number(input[k]);
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      return { error: `weight '${k}' must be a number between 0 and 100` };
    }
    out[k] = Math.round(v);
  }
  const sum = WEIGHT_KEYS.reduce((s, k) => s + out[k], 0);
  if (sum <= 0) return { error: 'weights must sum to more than 0' };
  return { weights: out };
}
