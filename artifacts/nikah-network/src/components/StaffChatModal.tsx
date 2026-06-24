import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import proposalService, { type ChatMessage } from "@/services/proposalService";

/**
 * Staff chat / relay window. A staff-managed profile has no login, so staff
 * read the conversation here and reply on its behalf. Messages staff send are
 * stored with senderRole='staff' and appear to the applicant as the other side.
 */
export default function StaffChatModal({
  proposalId, open, onClose, initiatorName, recipientName, relayFor,
}: {
  proposalId: string | null;
  open: boolean;
  onClose: () => void;
  initiatorName?: string;
  recipientName?: string;
  relayFor?: string; // name of the staff-managed side staff is relaying for, if any
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    if (!proposalId) return;
    try {
      const res = await proposalService.getMessages(proposalId);
      setMessages(res.messages || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load chat");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !proposalId) return;
    setLoading(true); setError(null); setText("");
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Chat — {initiatorName || "Initiator"} &amp; {recipientName || "Recipient"}
          </DialogTitle>
        </DialogHeader>

        {relayFor && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs p-2.5">
            {relayFor} is a staff-managed profile (no login). Messages you send here are relayed on their behalf.
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
