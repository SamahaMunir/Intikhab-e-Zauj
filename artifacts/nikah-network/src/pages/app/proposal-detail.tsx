import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Loader2, Heart, Check, X } from "lucide-react";
import { useProposal } from "@/hooks/useProposal";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useProposalTimer } from "@/hooks/useProposalTimer";
import { QNA_CATEGORIES } from "@/lib/qnaQuestions";
import { getUserId } from "@/lib/currentUser";

const QUESTION_LABELS: Record<string, string> = Object.fromEntries(
  QNA_CATEGORIES.flatMap(c => c.questions.map(q => [q.id, q.label]))
);

export default function ProposalDetail() {
  const params = useParams();
  const id = params.id as string;

  const userId = useMemo(() => getUserId(), []);

  const { proposal, loading, acting, error, respond, withdraw, interest, refresh } = useProposal(id);

  const chatOpen = proposal?.status === "chat_active" && proposal?.chat?.status === "open";
  const { messages, sending, send } = useChatMessages(id, !!chatOpen);
  const timer = useProposalTimer(proposal?.chat?.closesAt);

  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages.length]);

  // Poll the proposal while the chat is open so the other side's interest (incl.
  // a staff-confirmed proxy for a staff-managed profile) shows up live.
  useEffect(() => {
    if (!chatOpen) return;
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [chatOpen, refresh]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (error || !proposal) {
    return <div className="p-8 text-center text-muted-foreground">{error || "Proposal not found."}</div>;
  }

  const isInitiator = proposal.initiatorId === userId;
  const other = isInitiator ? proposal.recipient : proposal.initiator;
  const mySideInterested = isInitiator
    ? proposal.mutualInterest?.initiatorInterested
    : proposal.mutualInterest?.recipientInterested;
  const otherSideInterested = isInitiator
    ? proposal.mutualInterest?.recipientInterested
    : proposal.mutualInterest?.initiatorInterested;

  const isRecipientPending = proposal.status === "pending_recipient" && !isInitiator;
  const canWithdraw = isInitiator && ["pending_staff_review", "pending_recipient"].includes(proposal.status);
  const isSuccess = proposal.status === "family_proposal_stage" || proposal.status === "completed";

  // The other side may be a staff-managed profile (no login) — staff relay on its
  // behalf, so set expectations that it won't reply in the chat directly.
  const STAFF_SOURCES = ["staff_entry", "paper", "whatsapp", "walkin", "referral", "phone"];
  const otherStaffManaged =
    other?.registeredBy === "staff" || STAFF_SOURCES.includes(other?.source || "");

  const handleSend = async () => {
    const ok = await send(text);
    if (ok) setText("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/app/proposals">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl md:text-3xl font-serif font-bold">Proposal with {other?.name || "Unknown"}</h1>
        <Badge variant={proposal.status === "chat_active" || isSuccess ? "default" : "secondary"}
          className="capitalize ml-auto">
          {proposal.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b flex-row items-center justify-between">
              <CardTitle>Introduction Chat</CardTitle>
              {chatOpen && <span className="text-xs text-muted-foreground">Introduction closes in {timer.label}</span>}
            </CardHeader>

            <CardContent ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatOpen && otherStaffManaged && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3">
                  This match was arranged by our staff. {other?.name || "This person"} may not reply
                  here directly — staff will relay on their behalf. Share your questions, then mark
                  <strong> “I'm Interested” </strong> to proceed.
                </div>
              )}
              {proposal.status === "pending_staff_review" && (
                <div className="h-full flex items-center justify-center text-center text-muted-foreground px-6">
                  {isInitiator
                    ? "Your proposal is awaiting staff review. We'll notify you once it's approved."
                    : "This proposal is awaiting staff review."}
                </div>
              )}
              {proposal.status === "pending_recipient" && (
                <div className="h-full flex items-center justify-center text-center text-muted-foreground px-6">
                  {isInitiator
                    ? "Staff approved your proposal. Waiting for the recipient to accept."
                    : "Review this proposal and accept to open a private chat right away."}
                </div>
              )}
              {["rejected_by_staff", "declined_by_recipient", "withdrawn", "expired"].includes(proposal.status) && (
                <div className="h-full flex items-center justify-center text-center text-muted-foreground px-6">
                  This proposal is {proposal.status.replace(/_/g, " ")}.{proposal.reviewReason ? ` (${proposal.reviewReason})` : ""}
                </div>
              )}
              {isSuccess && (
                <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-2">
                  <Heart className="w-10 h-10 text-primary" />
                  <p className="font-semibold">Both sides are interested.</p>
                  <p className="text-sm text-muted-foreground">
                    The introduction phase is complete. Staff will now share family contacts and
                    coordinate the next steps with both families offline.
                  </p>
                </div>
              )}
              {proposal.status === "chat_active" && messages.length === 0 && (
                <div className="h-full flex items-center justify-center text-muted-foreground text-center px-6">
                  No messages yet. Start with a thoughtful question.
                </div>
              )}
              {proposal.status === "chat_active" && messages.map(msg => {
                const isMine = msg.senderId === userId;
                return (
                  <div key={msg._id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                    <span className="text-xs text-muted-foreground mb-1">{isMine ? "You" : other?.name}</span>
                    <div className={`p-3 rounded-lg max-w-[80%] ${isMine
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted rounded-tl-none"}`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </CardContent>

            {chatOpen && (
              <CardFooter className="p-4 border-t gap-2">
                <Textarea value={text} onChange={e => setText(e.target.value)}
                  placeholder="Type your message…" className="resize-none min-h-[80px]"
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
                <Button onClick={handleSend} disabled={sending || !text.trim()} className="h-auto self-stretch aspect-square">
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>

        <div className="md:col-span-1 space-y-6">
          {(isRecipientPending || canWithdraw || chatOpen) && (
            <Card>
              <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {isRecipientPending && (
                  <div className="space-y-2">
                    <Button className="w-full" disabled={acting} onClick={() => respond("accept")}>
                      <Check className="w-4 h-4 mr-2" /> Accept Proposal
                    </Button>
                    <Button variant="outline" className="w-full" disabled={acting} onClick={() => respond("decline")}>
                      <X className="w-4 h-4 mr-2" /> Decline
                    </Button>
                  </div>
                )}
                {canWithdraw && (
                  <Button variant="outline" className="w-full" disabled={acting} onClick={() => withdraw()}>
                    Withdraw Proposal
                  </Button>
                )}
                {chatOpen && otherSideInterested && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-3 flex items-start gap-2">
                    <Heart className="w-4 h-4 mt-0.5 shrink-0 fill-emerald-600 text-emerald-600" />
                    <span>
                      <strong>{other?.name || "The other person"}</strong> has expressed interest.
                      {!mySideInterested && " Mark “I'm Interested” to proceed."}
                    </span>
                  </div>
                )}
                {chatOpen && (
                  <Button className="w-full" disabled={acting || mySideInterested} onClick={() => interest()}>
                    <Heart className="w-4 h-4 mr-2" />
                    {mySideInterested ? "Interest Registered" : "I'm Interested"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {proposal.questionResponses && proposal.questionResponses.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Their Responses</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {proposal.questionResponses.map((qr, i) => (
                  <div key={qr.questionId || i}>
                    <p className="text-xs text-muted-foreground">{QUESTION_LABELS[qr.questionId] || qr.questionId}</p>
                    <p className="text-sm whitespace-pre-wrap">{qr.response}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>About this introduction</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p>• This is a <strong>48-hour introduction window</strong> — a short, supervised chat to get acquainted.</p>
              <p>• Mark “I'm Interested” once you wish to proceed.</p>
              <p>• When both sides are interested, staff share family contacts and the process continues offline.</p>
              <p>• Please don't share contact details in chat — staff will coordinate that.</p>
              <p>• Be respectful and honest.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
