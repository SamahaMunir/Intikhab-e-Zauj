import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { Clock, MessageSquare, Loader2, Inbox, MapPin, GraduationCap, Briefcase, ArrowRight } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import proposalService, { type Proposal } from "@/services/proposalService";

// Status → label + soft pill styling + leading dot.
const STATUS_PILL: Record<string, { label: string; cls: string; dot: string }> = {
  pending_staff_review:      { label: "Under Review",       cls: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500" },
  pending_recipient:         { label: "Awaiting Response",  cls: "bg-sky-50 text-sky-700 border-sky-200",             dot: "bg-sky-500" },
  chat_active:               { label: "Chat Active",        cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  mutual_interest_confirmed: { label: "Mutual Interest",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  family_proposal_stage:     { label: "Family Stage",       cls: "bg-violet-50 text-violet-700 border-violet-200",    dot: "bg-violet-500" },
  completed:                 { label: "Completed",          cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-600" },
  rejected_by_staff:         { label: "Not Approved",       cls: "bg-red-50 text-red-600 border-red-200",             dot: "bg-red-500" },
  declined_by_recipient:     { label: "Declined",           cls: "bg-red-50 text-red-600 border-red-200",             dot: "bg-red-500" },
  withdrawn:                 { label: "Withdrawn",          cls: "bg-gray-100 text-gray-500 border-gray-200",         dot: "bg-gray-400" },
  expired:                   { label: "Expired",            cls: "bg-gray-100 text-gray-500 border-gray-200",         dot: "bg-gray-400" },
};
function statusPill(status: string) {
  return STATUS_PILL[status] || { label: status.replace(/_/g, " "), cls: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" };
}

function initials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

export default function Proposals() {
  const userId = useMemo(() => {
    const stored = localStorage.getItem("user");
    const u = stored ? JSON.parse(stored) : null;
    return (u?._id || u?.id) as string | undefined;
  }, []);

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await proposalService.list("all");
        if (active) setProposals(res.proposals || []);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load proposals");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const sentProposals = proposals.filter(p => p.initiatorId === userId);
  const receivedProposals = proposals.filter(p => p.recipientId === userId);

  const renderProposalCard = (p: Proposal, isReceived: boolean) => {
    const other = isReceived ? p.initiator : p.recipient;
    const chatOpen = p.status === "chat_active" && p.chat?.status === "open";
    const pill = statusPill(p.status);
    const details = [
      { icon: MapPin, value: other?.city },
      { icon: GraduationCap, value: other?.education },
      { icon: Briefcase, value: (other as any)?.profession },
    ].filter(d => d.value);

    return (
      <div key={p._id}
        className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-none hover:shadow-md hover:border-emerald-200 transition-all flex flex-col">

        {/* Header: avatar + name + status */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0 ring-1 ring-emerald-100">
            {initials(other?.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 truncate">{other?.name || "Unknown"}</p>
            <span className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${pill.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} />
              {pill.label}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="mt-4 space-y-1.5 flex-1">
          {details.length > 0 ? details.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
              <d.icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{d.value}</span>
            </div>
          )) : (
            <p className="text-sm text-gray-400">No details available</p>
          )}
        </div>

        {/* Expiry */}
        {p.expiresAt && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            Expires {formatDistanceToNow(parseISO(p.expiresAt), { addSuffix: true })}
          </div>
        )}

        {/* Action */}
        <Link href={`/app/proposals/${p._id}`} className="mt-4 block">
          <Button variant={chatOpen ? "default" : "outline"}
            className={`w-full ${chatOpen ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}>
            {chatOpen
              ? <><MessageSquare className="w-4 h-4 mr-2" /> Open Chat</>
              : <>View Details <ArrowRight className="w-4 h-4 ml-2" /></>}
          </Button>
        </Link>
      </div>
    );
  };

  const emptyState = (label: string) => (
    <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
      <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">{label}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-gray-900">Proposals</h1>
        <p className="text-gray-500 text-sm mt-1">Track proposals you've sent and received.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-red-600 text-sm">{error}</div>
      )}

      <Tabs defaultValue="received">
        <TabsList className="mb-5">
          <TabsTrigger value="received">Received ({receivedProposals.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({sentProposals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="received">
          {receivedProposals.length === 0 ? emptyState("No received proposals yet.") : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {receivedProposals.map(p => renderProposalCard(p, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent">
          {sentProposals.length === 0 ? emptyState("You haven't sent any proposals yet.") : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sentProposals.map(p => renderProposalCard(p, false))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
