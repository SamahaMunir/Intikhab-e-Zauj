import { Db, ObjectId } from 'mongodb';
import { calculateScore } from './matching';
import { professionBucket, cityGroupKey, type SimilarStats } from './insights';

/**
 * RAG retrieval — find named, real past pairs similar to the current match and
 * label each with its actual outcome.
 *
 * Outcomes come from the PROPOSALS collection (a `completed` proposal = both
 * sides interested = "married/met"), NOT the matches collection (which has no
 * outcome). Similarity is categorical: same male/female profession bucket +
 * same city group as the current pair. Each pair's compatibility score is
 * recomputed on the fly with the shared scorer.
 *
 * This is the "retrieval" half of RAG; the formatted output feeds the LLM.
 */

export type SimilarStatus = 'completed' | 'approved' | 'pending' | 'rejected';

export interface SimilarMatchSide {
  name: string;
  age: number;
  caste: string;
  profession: string;
  city: string;
}

export interface SimilarMatch {
  pairKey: string;
  leftProfile: SimilarMatchSide;  // groom
  rightProfile: SimilarMatchSide; // bride
  score: number;
  status: SimilarStatus;
  createdAt: Date;
}

function ageOf(p: any): number {
  if (p?.age && Number(p.age) > 0) return Number(p.age);
  if (p?.dob) {
    const d = new Date(p.dob), t = new Date();
    let a = t.getFullYear() - d.getFullYear();
    const m = t.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
    return a > 0 ? a : 0;
  }
  return 0;
}

function side(p: any): SimilarMatchSide {
  return {
    name: p?.name || 'N/A', age: ageOf(p), caste: p?.caste || 'N/A',
    profession: p?.profession || 'N/A', city: p?.city || 'N/A',
  };
}

function mapStatus(s: string): SimilarStatus {
  if (s === 'completed') return 'completed';
  if (s === 'approved') return 'approved';
  if (s === 'pending_recipient' || s === 'pending_staff') return 'pending';
  return 'rejected';
}

// Order for ranking when similarity ties: successes first.
const STATUS_RANK: Record<SimilarStatus, number> = { completed: 3, approved: 2, pending: 1, rejected: 0 };

/**
 * Retrieve up to `limit` similar past pairs with outcomes.
 */
export async function retrieveSimilarMatches(
  db: Db,
  currentMale: any,
  currentFemale: any,
  excludePairKey: string,
  limit = 5
): Promise<SimilarMatch[]> {
  try {
    const target = {
      maleBucket: professionBucket(currentMale?.profession),
      femaleBucket: professionBucket(currentFemale?.profession),
      group: cityGroupKey(currentMale?.city) !== -1 ? cityGroupKey(currentMale?.city) : cityGroupKey(currentFemale?.city),
    };

    const proposals = await db.collection('proposals')
      .find({ status: { $in: ['completed', 'approved', 'pending_recipient', 'pending_staff', 'expired', 'closed', 'declined', 'rejected'] } })
      .limit(500)
      .toArray();

    // Batch-load referenced profiles
    const ids = new Set<string>();
    for (const p of proposals) {
      if (p.initiatorId) ids.add(p.initiatorId.toString());
      if (p.recipientId) ids.add(p.recipientId.toString());
    }
    const docs = ids.size
      ? await db.collection('profiles')
          .find({ _id: { $in: Array.from(ids).map(s => { try { return new ObjectId(s); } catch { return null; } }).filter(Boolean) as ObjectId[] } },
                { projection: { name: 1, gender: 1, profession: 1, city: 1, caste: 1, age: 1, dob: 1 } })
          .toArray()
      : [];
    const pmap = new Map(docs.map(d => [d._id.toString(), d]));

    const out: SimilarMatch[] = [];
    for (const p of proposals) {
      const a = pmap.get(p.initiatorId?.toString());
      const b = pmap.get(p.recipientId?.toString());
      if (!a || !b) continue;

      const pairKey = [p.initiatorId?.toString(), p.recipientId?.toString()].sort().join('|');
      if (pairKey === excludePairKey) continue;

      const male = a.gender === 'male' ? a : b;
      const female = a.gender === 'male' ? b : a;

      const sameMale = professionBucket(male.profession) === target.maleBucket && target.maleBucket !== 'unknown';
      const sameFemale = professionBucket(female.profession) === target.femaleBucket && target.femaleBucket !== 'unknown';
      const grp = cityGroupKey(male.city) !== -1 ? cityGroupKey(male.city) : cityGroupKey(female.city);
      const sameGroup = target.group !== -1 && grp === target.group;
      if (!(sameMale && sameFemale && sameGroup)) continue;

      out.push({
        pairKey,
        leftProfile: side(male),
        rightProfile: side(female),
        score: calculateScore(male, female).total,
        status: mapStatus(p.status),
        createdAt: p.createdAt || new Date(),
      });
    }

    out.sort((x, y) => (STATUS_RANK[y.status] - STATUS_RANK[x.status]) || (y.score - x.score));
    // De-dup by pairKey, keep best
    const seen = new Set<string>();
    const deduped = out.filter(m => (seen.has(m.pairKey) ? false : (seen.add(m.pairKey), true)));
    return deduped.slice(0, limit);
  } catch (e) {
    console.error('❌ retrieveSimilarMatches:', e instanceof Error ? e.message : e);
    return [];
  }
}

/** Derive aggregate stats (used by the v0 insight bullets). */
export function statsFromSimilar(matches: SimilarMatch[]): SimilarStats {
  const total = matches.length;
  const successful = matches.filter(m => m.status === 'completed').length;
  const pending = matches.filter(m => m.status === 'approved' || m.status === 'pending').length;
  return { total, successful, pending, successRate: total > 0 ? Math.round((successful / total) * 100) : null };
}

/** Format retrieved matches as LLM context. */
export function formatSimilarMatchesForLLM(matches: SimilarMatch[]): string {
  if (!matches.length) return 'No similar historical matches found.';
  const label: Record<SimilarStatus, string> = {
    completed: '✓ MARRIED/MET', approved: '→ APPROVED (chat open)',
    pending: '⏳ IN REVIEW', rejected: '✗ DID NOT PROCEED',
  };
  return matches.map((m, i) =>
    `Similar Match ${i + 1}:\n` +
    `- Pair: ${m.leftProfile.name} (${m.leftProfile.age}, ${m.leftProfile.profession}) ↔ ${m.rightProfile.name} (${m.rightProfile.age}, ${m.rightProfile.profession})\n` +
    `- Location: ${m.leftProfile.city} / ${m.rightProfile.city}\n` +
    `- Caste: ${m.leftProfile.caste} / ${m.rightProfile.caste}\n` +
    `- Compatibility: ${m.score}/100\n` +
    `- Outcome: ${label[m.status]}`
  ).join('\n\n');
}

/** Compact card shape for the API response / frontend list. */
export function toSimilarCard(m: SimilarMatch) {
  return {
    names: `${m.leftProfile.name} ↔ ${m.rightProfile.name}`,
    score: m.score,
    status: m.status,
    outcome: m.status === 'completed' ? '✓ Married' : '→ ' + m.status.charAt(0).toUpperCase() + m.status.slice(1),
  };
}
