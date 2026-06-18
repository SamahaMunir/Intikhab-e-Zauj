import { useEffect, useState } from 'react';
import { X, Sparkles, Loader2, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface SimilarStats { total: number; successful: number; pending: number; successRate: number | null; }
interface Insights {
  recommendation: { label: string; score: number; hardFiltersPassed: boolean };
  bullets: string[];
  similar: SimilarStats;
}
interface SimilarCard { names: string; score: number; status: string; outcome: string; }
interface AiSummary {
  recommendation: 'APPROVE' | 'REVIEW' | 'CAUTION';
  reasoning: string;
  confidenceScore: number;
  similarMatches: SimilarCard[];
}
interface InsightsResponse {
  insights: Insights;
  similarMatches?: SimilarCard[];
  similarMetrics?: SimilarStats;
  aiSummary?: AiSummary | null;
  error?: string;
}

function recTone(label: string): { cls: string; Icon: typeof CheckCircle2 } {
  if (/HIGH SUCCESS|GOOD|APPROVE/.test(label)) return { cls: 'bg-emerald-50 text-[#059669] border-emerald-200', Icon: CheckCircle2 };
  if (/MODERATE|REVIEW/.test(label)) return { cls: 'bg-amber-50 text-[#D97706] border-amber-200', Icon: TrendingUp };
  return { cls: 'bg-red-50 text-red-600 border-red-200', Icon: AlertTriangle };
}

/**
 * Staff AI Insights — v0 template + RAG. Loads bullets + similar past matches
 * first; staff can click "Get AI Recommendation" to run the RAG+Claude step.
 */
export default function InsightsModal({ matchId, open, onClose }: { matchId: string | null; open: boolean; onClose: () => void; }) {
  const [data, setData] = useState<Insights | null>(null);
  const [similar, setSimilar] = useState<SimilarCard[]>([]);
  const [metrics, setMetrics] = useState<SimilarStats | null>(null);
  const [ai, setAi] = useState<AiSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async (withAI: boolean) => {
    const qs = withAI ? '?includeAI=true&includeRAG=true' : '?includeRAG=true';
    const r = await fetch(`${API}/api/staff/matches/${matchId}/insights${qs}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    });
    const d: InsightsResponse = await r.json();
    if (!r.ok) throw new Error(d.error || 'Failed to load insights');
    return d;
  };

  useEffect(() => {
    if (!open || !matchId) return;
    setData(null); setSimilar([]); setMetrics(null); setAi(null); setError(null); setLoading(true);
    document.body.style.overflow = 'hidden';
    (async () => {
      try {
        const d = await fetchInsights(false);
        setData(d.insights);
        setSimilar(d.similarMatches || []);
        setMetrics(d.similarMetrics || null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load insights');
      } finally {
        setLoading(false);
      }
    })();
    return () => { document.body.style.overflow = ''; };
  }, [open, matchId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const getAI = async () => {
    setAiLoading(true); setError(null);
    try {
      const d = await fetchInsights(true);
      if (d.aiSummary) setAi(d.aiSummary);
      else setError('AI recommendation unavailable — no LLM provider configured on the server.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get AI recommendation');
    } finally {
      setAiLoading(false);
    }
  };

  if (!open) return null;
  const tone = data ? recTone(data.recommendation.label) : null;
  const aiTone = ai ? recTone(ai.recommendation) : null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#031a0e]/45 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="AI Insights"
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">

        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-[#1C1917] leading-tight">AI Insights</h3>
            <p className="text-xs text-gray-500">RAG over past matches · LLM step is opt-in</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="ml-auto p-2 -mr-2 text-gray-400 hover:text-[#1C1917] rounded-lg hover:bg-gray-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 max-h-[68vh] overflow-y-auto">
          {loading && (
            <div className="py-10 text-center"><Loader2 className="w-7 h-7 animate-spin text-[#10B981] mx-auto mb-2" />
              <p className="text-sm text-gray-500">Analyzing match…</p></div>
          )}
          {error && <div className="py-3 mb-3 text-center text-red-600 text-sm">{error}</div>}

          {data && tone && (
            <div className="space-y-4">
              <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${tone.cls}`}>
                <tone.Icon className="w-5 h-5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-tight">{data.recommendation.label}</p>
                  <p className="text-xs opacity-80">Compatibility {data.recommendation.score}/100 · hard filters {data.recommendation.hardFiltersPassed ? 'passed' : 'flagged'}</p>
                </div>
              </div>

              <ul className="space-y-2.5">
                {data.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-[#1C1917]">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              {/* Retrieved similar past matches (RAG) */}
              {similar.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Similar past matches</p>
                  <div className="space-y-2">
                    {similar.map((m, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-gray-100 bg-[#FDF8F3] px-3.5 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#1C1917] truncate">{m.names}</p>
                          <p className="text-xs text-gray-500">Score {m.score}/100</p>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                          m.outcome.includes('Married') ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {m.outcome}
                        </span>
                      </div>
                    ))}
                  </div>
                  {metrics && (
                    <p className="text-xs text-gray-500 mt-2">
                      {metrics.total} similar · {metrics.successful} married
                      {metrics.successRate !== null && <> · <span className="font-bold text-[#059669]">{metrics.successRate}%</span> success</>}
                    </p>
                  )}
                </div>
              )}

              {/* RAG + LLM recommendation */}
              {!ai && (
                <button onClick={getAI} disabled={aiLoading}
                  className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold
                             flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-60">
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Get AI Recommendation
                </button>
              )}

              {ai && aiTone && (
                <div className={`rounded-2xl border p-4 ${aiTone.cls}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <aiTone.Icon className="w-5 h-5" />
                    <span className="font-bold text-sm">AI Recommendation: {ai.recommendation}</span>
                  </div>
                  <p className="text-sm leading-relaxed mb-3">{ai.reasoning}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs opacity-80">Confidence {ai.confidenceScore}%</span>
                    <div className="flex-1 h-1.5 rounded-full bg-black/10 overflow-hidden">
                      <div className="h-full bg-current opacity-70" style={{ width: `${ai.confidenceScore}%` }} />
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-gray-400 pt-1">
                Retrieval-augmented: similar matches pulled from your database, optionally summarized by Claude. Guidance only — final decision rests with staff.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
