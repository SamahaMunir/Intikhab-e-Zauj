import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Heart, Check, Clock } from "lucide-react";
import proposalService, { type ChatMessage, type Proposal } from "@/services/proposalService";

/**
 * Staff chat / relay window. A staff-managed profile has no login, so staff
 * read the conversation here and reply on its behalf. Messages staff send are
 * stored with senderRole='staff' and appear to the applicant as the other side.
 *
 * When the other side is staff-managed, staff also explicitly confirm that side's
 * interest here (an audited proxy action) — interest is never inferred silently.
 */
export default function StaffChatModal({
  proposalId, open, onClose, initiatorName, recipientName, relayFor, relaySide, onChanged,
}: {
  proposalId: string | null;
  open: boolean;
  onClose: () => void;
  initiatorName?: string;
  recipientName?: string;
  relayFor?: string;                          // name of the staff-managed side, if any
  relaySide?: "initiator" | "recipient";      // which side staff proxy for
  onChanged?: () => void;                      // notify parent to refresh after an action
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    if (!proposalId) return;
    try {
      // Pull messages AND the proposal so staff see live interest state (who has
      // already clicked "I'm Interested") without reopening the modal.
      const [msgRes, propRes] = await Promise.all([
        proposalService.getMessages(proposalId),
        proposalService.get(proposalId).catch(() => null),
      ]);
      setMessages(msgRes.messages || []);
      if (propRes?.proposal) setProposal(propRes.proposal);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load chat");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !proposalId) return;
    setLoading(true); setError(null); setText(""); setProposal(null);
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, proposalId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages.length]);

  const send = async () => {
    const t = text.trim();
    if (!t || !proposalId) return;
    setSending(true); setError(null);
    try {
      await proposalService.sendMessage(proposalId, t);
      setText("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Message not sent");
    } finally {
      setSending(false);
    }
  };

  const confirmInterest = async () => {
    if (!proposalId || !relaySide) return;
    setConfirming(true); setError(null);
    try {
      await proposalService.interest(proposalId, relaySide);
      await refresh();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm interest");
    } finally {
      setConfirming(false);
    }
  };

  // Live interest state (from the polled proposal).
  const mi = proposal?.mutualInterest;
  const initiatorInterested = !!mi?.initiatorInterested;
  const recipientInterested = !!mi?.recipientInterested;
  const initiatorProxied = !!mi?.initiatorConfirmedBy;
  const recipientProxied = !!mi?.recipientConfirmedBy;
  const relaySideInterested = relaySide === "initiator" ? initiatorInterested : relaySide === "recipient" ? recipientInterested : false;
  const initName = initiatorName || proposal?.initiator?.name || "Initiator";
  const recipName = recipientName || proposal?.recipient?.name || "Recipient";

  const InterestRow = ({ label, interested, proxied }: { label: string; interested: boolean; proxied: boolean }) => (
    <div className="flex items-center justify-between text-xs">
      <span className="truncate">{label}</span>
      {interested ? (
        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold shrink-0">
          <Check className="w-3.5 h-3.5" /> Interested{proxied ? " (staff-confirmed)" : ""}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-muted-foreground shrink-0">
          <Clock className="w-3.5 h-3.5" /> Waiting
        </span>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Chat — {initiatorName || "Initiator"} &amp; {recipientName || "Recipient"}
          </DialogTitle>
        </DialogHeader>

        {/* Live interest tracker — staff see the moment either party clicks "I'm Interested". */}
        <div className="rounded-lg border bg-muted/40 p-2.5 space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Interest</p>
          <InterestRow label={initName} interested={initiatorInterested} proxied={initiatorProxied} />
          <InterestRow label={recipName} interested={recipientInterested} proxied={recipientProxied} />
          {initiatorInterested && recipientInterested && (
            <p className="text-[11px] text-emerald-700 font-medium pt-0.5">Both interested → advanced to family stage.</p>
          )}
        </div>

        {relayFor && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs p-2.5 space-y-2">
            <p>{relayFor} is a staff-managed profile (no login). Messages you send here are relayed on their behalf.</p>
            {relaySide && (
              <Button size="sm" variant="outline" disabled={confirming || relaySideInterested} onClick={confirmInterest} className="w-full">
                {confirming ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Heart className="w-4 h-4 mr-1" />}
                {relaySideInterested ? `Interest confirmed for ${relayFor}` : `Confirm interest on behalf of ${relayFor}`}
              </Button>
            )}
          </div>
        )}

        <div ref={scrollRef} className="h-80 overflow-y-auto rounded-lg border bg-muted/30 p-3 space-y-3">
          {loading ? (
            <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground text-center px-4">
              No messages yet.
            </div>
          ) : (
            messages.map((m) => {
              const fromStaff = m.senderRole === "staff" || m.senderRole === "admin";
              return (
                <div key={m._id} className={`flex flex-col ${fromStaff ? "items-end" : "items-start"}`}>
                  <span className="text-[11px] text-muted-foreground mb-0.5">
                    {fromStaff ? "Staff (relayed)" : initiatorName || "Applicant"}
                  </span>
                  <div className={`p-2.5 rounded-lg max-w-[80%] text-sm ${fromStaff ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-background border rounded-tl-none"}`}>
                    {m.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message to relay…"
            className="resize-none min-h-20"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <Button onClick={send} disabled={sending || !text.trim()} className="h-auto self-stretch aspect-square">
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">No contact details (phone/email) — they're blocked by the system.</p>
      </DialogContent>
    </Dialog>
  );
}
