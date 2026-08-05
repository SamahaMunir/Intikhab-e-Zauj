import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, MessageCircle, Inbox, ArrowRight, Check, X } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Link } from "wouter";
import proposalService, { type Proposal, type ProposalStatus } from "@/services/proposalService";
import InsightsModal from "@/components/matches/InsightsModal";

// Insights help staff decide before/while a proposal is live. Once it's concluded
// (completed) or otherwise terminal, the recommendation is irrelevant — hide it.
const TERMINAL_STATUSES = ["completed", "withdrawn", "expired", "declined_by_recipient", "rejected_by_staff"];

const FILTERS: { label: string; value: ProposalStatus | "all" }[] = [
  { label: "Pending Review", value: "pending_staff_review" },
  { label: "Awaiting Recipient", value: "pending_recipient" },
  { label: "Chat Active", value: "chat_active" },
  { label: "Family Stage", value: "family_proposal_stage" },
  { label: "Completed", value: "completed" },
  { label: "All", value: "all" },
];

// Compact summary tiles across the top (clickable → sets the filter).
const SUMMARY: { label: string; value: ProposalStatus | "all"; match: (s: string) => boolean }[] = [
  { label: "Pending Review", value: "pending_staff_review", match: s => s === "pending_staff_review" },
  { label: "Awaiting Recipient", value: "pending_recipient", match: s => s === "pending_recipient" },
  { label: "Family Stage", value: "family_proposal_stage", match: s => s === "family_proposal_stage" },
  { label: "Completed", value: "completed", match: s => s === "completed" },
];

// Build a WhatsApp click-to-send link to a parent's number (PK-normalized).
function waNumber(raw?: string): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d]/g, '');
  if (d.startsWith('0')) d = '92' + d.slice(1);
  else if (d.length === 10 && d.startsWith('3')) d = '92' + d;
  return d.startsWith('92') && d.length >= 12 ? d : null;
}
function waHref(parentNum: string | undefined, thisName?: string, otherName?: string): string | null {
  const num = waNumber(parentNum);
  if (!num) return null;
  const msg = `Assalam-o-Alaikum. This is Intikhab-e-Zauj matchmaking. The proposal for ${thisName || 'your family member'} with ${otherName || 'the other family'} has reached the family stage. Please contact us to proceed further. JazakAllah.`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

// Muted status pill + leading dot color, professional palette.
const STATUS_PILL: Record<string, { label: string; cls: string; dot: string }> = {
  pending_staff_review:      { label: "Pending Review",     cls: "bg-amber-50 text-amber-700 border-amber-200",     dot: "bg-amber-500" },
  pending_recipient:         { label: "Awaiting Recipient", cls: "bg-sky-50 text-sky-700 border-sky-200",           dot: "bg-sky-500" },
  chat_active:               { label: "Chat Active",        cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  mutual_interest_confirmed: { label: "Mutual Interest",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  family_proposal_stage:     { label: "Family Stage",       cls: "bg-violet-50 text-violet-700 border-violet-200",  dot: "bg-violet-500" },
  completed:                 { label: "Completed",          cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-600" },
  rejected_by_staff:         { label: "Rejected",           cls: "bg-red-50 text-red-600 border-red-200",           dot: "bg-red-500" },
  declined_by_recipient:     { label: "Declined",           cls: "bg-red-50 text-red-600 border-red-200",           dot: "bg-red-500" },
  withdrawn:                 { label: "Withdrawn",          cls: "bg-gray-100 text-gray-500 border-gray-200",       dot: "bg-gray-400" },
  expired:                   { label: "Expired",            cls: "bg-gray-100 text-gray-500 border-gray-200",       dot: "bg-gray-400" },
};
function statusPill(status: string) {
  return STATUS_PILL[status] || { label: status.replace(/_/g, " "), cls: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" };
}

function initials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}
function Avatar({ name }: { name?: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-semibold shrink-0 ring-1 ring-gray-200">
      {initials(name)}
    </div>
  );
}

function scoreTone(s: number): string {
  return s >= 70 ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : s >= 50 ? "text-amber-700 bg-amber-50 border-amber-200"
    : "text-red-600 bg-red-50 border-red-200";
}

export default function StaffProposals() {
  const [filter, setFilter] = useState<ProposalStatus | "all">("pending_staff_review");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [insightsMatchId, setInsightsMatchId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await proposalService.staffList(filter === "all" ? undefined : filter);
      setProposals(res.proposals || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load proposals");
    } finally {
      setLoading(false);
    }
  };

  // Summary counts across ALL proposals (one call, refreshed after each action).
  const loadCounts = async () => {
    try {
      const res = await proposalService.staffList(undefined);
      const tally: Record<string, number> = {};
      for (const p of res.proposals || []) tally[p.status] = (tally[p.status] || 0) + 1;
      setCounts(tally);
    } catch { /* summary is best-effort */ }
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, [filter]);
  useEffect(() => { loadCounts(); }, []);

  const refresh = async () => { await Promise.all([load(), loadCounts()]); };

  const review = async (id: string, action: "approve" | "reject") => {
    let reason: string | undefined;
    if (action === "reject") {
      reason = window.prompt("Reason for rejecting this proposal?") || undefined;
      if (!reason) return;
    }
    setActingId(id);
    try {
      await proposalService.staffReview(id, action, reason);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActingId(null);
    }
  };

  const conclude = async (id: string, outcome: "completed" | "not_proceeded") => {
    const verb = outcome === "completed" ? "mark this match COMPLETED (success)" : "close this match as NOT PROCEEDED";
    if (!window.confirm(`Are you sure you want to ${verb}?`)) return;
    const note = window.prompt("Add a closing note (optional):") || undefined;
    setActingId(id);
    try {
      await proposalService.conclude(id, outcome, note);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Proposal Approvals</h1>
        <p className="text-gray-500 text-sm mt-1">
          Pre-screen new proposals before the recipient sees them. Use Insights for the compatibility score and AI explanation.
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SUMMARY.map(t => {
          const active = filter === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              className={`text-left rounded-xl border bg-white px-4 py-3 transition-all ${
                active ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{counts[t.value] ?? "—"}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap border-b border-gray-200">
        {FILTERS.map(f => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 h-9 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No proposals in this view.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map(p => {
            const pill = statusPill(p.status);
            const busy = actingId === p._id;
            const score = typeof p.compatibilityScore === "number" ? Math.round(p.compatibilityScore) : null;
            const initHref  = waHref((p.initiator as any)?.fatherMobile || (p.initiator as any)?.motherMobile || (p.initiator as any)?.phone, p.initiator?.name, p.recipient?.name);
            const recipHref = waHref((p.recipient as any)?.fatherMobile || (p.recipient as any)?.motherMobile || (p.recipient as any)?.phone, p.recipient?.name, p.initiator?.name);

            return (
              <Card key={p._id} className="border-gray-200 shadow-none hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex flex-col xl:flex-row xl:items-center gap-4">

                  {/* Pair */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar name={p.initiator?.name} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.initiator?.name || "Unknown"}</p>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Initiator</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar name={p.recipient?.name} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.recipient?.name || "Unknown"}</p>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Recipient</p>
                      </div>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 shrink-0">
                    {score !== null ? (
                      <span className={`inline-flex items-center justify-center min-w-11 px-2 h-7 rounded-md border text-sm font-bold tabular-nums ${scoreTone(score)}`}>
                        {score}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300 w-11 text-center">—</span>
                    )}
                    <div className="flex flex-col items-start gap-1 min-w-40">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${pill.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} />
                        {pill.label}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {p.type === "STAFF_PROPOSAL" ? "Staff" : "User"} proposal
                        {p.createdAt && ` · ${formatDistanceToNow(parseISO(p.createdAt), { addSuffix: true })}`}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 xl:justify-end xl:min-w-64">
                    {p.status === "chat_active" && (
                      <Link href="/staff/messages">
                        <Button size="sm" variant="ghost" className="text-gray-500">
                          In Ongoing Chats <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    )}

                    {p.matchId && !TERMINAL_STATUSES.includes(p.status) && (
                      <Button size="sm" variant="outline" onClick={() => setInsightsMatchId(p.matchId!)}>
                        <Sparkles className="w-4 h-4 mr-1.5" /> Insights
                      </Button>
                    )}

                    {p.status === "pending_staff_review" ? (
                      <>
                        <Button size="sm" variant="outline" disabled={busy}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => review(p._id, "reject")}>
                          <X className="w-4 h-4 mr-1.5" /> Reject
                        </Button>
                        <Button size="sm" disabled={busy}
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => review(p._id, "approve")}>
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1.5" /> Approve</>}
                        </Button>
                      </>
                    ) : p.status === "family_proposal_stage" ? (
                      <>
                        {initHref && (
                          <a href={initHref} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50">
                              <MessageCircle className="w-4 h-4 mr-1.5" /> {p.initiator?.name?.split(' ')[0] || 'Initiator'} family
                            </Button>
                          </a>
                        )}
                        {recipHref && (
                          <a href={recipHref} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50">
                              <MessageCircle className="w-4 h-4 mr-1.5" /> {p.recipient?.name?.split(' ')[0] || 'Recipient'} family
                            </Button>
                          </a>
                        )}
                        <Button size="sm" variant="outline" disabled={busy}
                          onClick={() => conclude(p._id, "not_proceeded")}>
                          Not Proceeded
                        </Button>
                        <Button size="sm" disabled={busy}
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => conclude(p._id, "completed")}>
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mark Completed"}
                        </Button>
                      </>
                    ) : (!p.matchId && p.status !== "chat_active") ? (
                      <span className="text-xs text-gray-300">No actions</span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <InsightsModal
        matchId={insightsMatchId}
        open={insightsMatchId !== null}
        onClose={() => setInsightsMatchId(null)}
      />
    </div>
  );
}
