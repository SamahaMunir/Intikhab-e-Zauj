import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, Clock, Check } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import proposalService, { type Proposal } from "@/services/proposalService";
import StaffChatModal from "@/components/StaffChatModal";

const STAFF_SOURCES = ["staff_entry", "paper", "whatsapp", "walkin", "referral", "phone"];
const isStaffManaged = (p?: { registeredBy?: string; source?: string }) =>
  p?.registeredBy === "staff" || STAFF_SOURCES.includes(p?.source || "");

/**
 * Ongoing Chats — supervise the live 48-hour introduction chats. Staff read the
 * conversation, relay for any staff-managed (no-login) side, and confirm that
 * side's interest. (Replaces the old mock "Q&A Moderation" screen.)
 */
export default function StaffOngoingChats() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<Proposal | null>(null);

  const load = async () => {
    try {
      setLoading(true); setError(null);
      const res = await proposalService.staffList("chat_active");
      const list = (res.proposals || []).filter((p) => p.chat?.status === "open");
      setProposals(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load chats");
    } finally {
      setLoading(false);
    }
  };

  // Poll so staff see interest clicks / new messages land without a manual refresh.
  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const relayFor = (p: Proposal) =>
    isStaffManaged(p.recipient) ? p.recipient?.name : isStaffManaged(p.initiator) ? p.initiator?.name : undefined;
  const relaySide = (p: Proposal): "initiator" | "recipient" | undefined =>
    isStaffManaged(p.recipient) ? "recipient" : isStaffManaged(p.initiator) ? "initiator" : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Ongoing Chats</h1>
        <p className="text-muted-foreground">
          Supervise live 48-hour introductions. Relay for staff-managed profiles and confirm their interest.
        </p>
      </div>

      {error && <Card><CardContent className="py-3 text-center text-destructive text-sm">{error}</CardContent></Card>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
      ) : proposals.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No active chats right now.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {proposals.map((p) => {
            const staffName = relayFor(p);
            const iInt = !!p.mutualInterest?.initiatorInterested;
            const rInt = !!p.mutualInterest?.recipientInterested;
            const intChip = (name: string, on: boolean) => (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                on ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                {on ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {(name || "?").split(" ")[0]}
              </span>
            );
            return (
              <Card key={p._id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">
                      {p.initiator?.name || "Unknown"} <span className="text-muted-foreground">&amp;</span> {p.recipient?.name || "Unknown"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{p.chat?.messageCount ?? 0} messages</span>
                      {p.chat?.closesAt && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> closes {formatDistanceToNow(parseISO(p.chat.closesAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {intChip(p.initiator?.name || "", iInt)}
                      {intChip(p.recipient?.name || "", rInt)}
                      {(iInt || rInt) && !(iInt && rInt) && (
                        <span className="text-[10px] text-amber-700 font-medium">1 side interested</span>
                      )}
                      {staffName && <Badge variant="outline" className="text-[10px]">Relay: {staffName}</Badge>}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setChat(p)}>Open</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <StaffChatModal
        proposalId={chat?._id ?? null}
        open={chat !== null}
        onClose={() => setChat(null)}
        initiatorName={chat?.initiator?.name}
        recipientName={chat?.recipient?.name}
        relayFor={chat ? relayFor(chat) : undefined}
        relaySide={chat ? relaySide(chat) : undefined}
        onChanged={load}
      />
    </div>
  );
}
