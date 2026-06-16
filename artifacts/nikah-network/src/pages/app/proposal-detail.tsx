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

export default function ProposalDetail() {
  const params = useParams();
  const id = params.id as string;

  const userId = useMemo(() => {
    const stored = localStorage.getItem("user");
    const u = stored ? JSON.parse(stored) : null;
    return (u?._id || u?.id) as string | undefined;
  }, []);

  const { proposal, loading, acting, error, respond, withdraw, interest } = useProposal(id);

  const chatOpen = proposal?.status === "approved" && proposal?.chat?.status === "open";
  const { messages, sending, send } = useChatMessages(id, !!chatOpen);
  const timer = useProposalTimer(proposal?.chat?.closesAt);

  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages.length]);

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

  const isRecipientPending = proposal.status === "pending_recipient" && !isInitiator;
  const canWithdraw = isInitiator && ["pending_recipient", "pending_staff"].includes(proposal.status);

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
        <Badge variant={proposal.status === "approved" || proposal.status === "completed" ? "default" : "secondary"}
          className="capitalize ml-auto">
          {proposal.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b flex-row items-center justify-between">
              <CardTitle>Chat</CardTitle>
              {chatOpen && <span className="text-xs text-muted-foreground">Closes in {timer.label}</span>}
            </CardHeader>

            <CardContent ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {proposal.status === "pending_recipient" && (
                <div className="h-full flex items-center justify-center text-center text-muted-foreground px-6">
                  {isInitiator
                    ? "Waiting for the recipient to accept your proposal."
                    : "Accept this proposal to open a chat (staff will review first)."}
                </div>
              )}
              {proposal.status === "pending_staff" && (
                <div className="h-full flex items-center justify-center text-center text-muted-foreground px-6">
                  Accepted — awaiting staff review before the chat opens.
                </div>
              )}
              {["rejected", "declined", "withdrawn", "expired", "closed"].includes(proposal.status) && (
                <div className="h-full flex items-center justify-center text-center text-muted-foreground px-6">
                  This proposal is {proposal.status}.{proposal.reviewReason ? ` (${proposal.reviewReason})` : ""}
                </div>
              )}
              {proposal.status === "completed" && (
                <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-2">
                  <Heart className="w-10 h-10 text-primary" />
                  <p className="font-semibold">Both sides are interested.</p>
                  <p className="text-sm text-muted-foreground">Staff will now coordinate with both families.</p>
                </div>
              )}
              {proposal.status === "approved" && messages.length === 0 && (
                <div className="h-full flex items-center justify-center text-muted-foreground text-center px-6">
                  No messages yet. Start with a thoughtful question.
                </div>
              )}
              {proposal.status === "approved" && messages.map(msg => {
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
                {chatOpen && (
                  <Button className="w-full" disabled={acting || mySideInterested} onClick={() => interest()}>
                    <Heart className="w-4 h-4 mr-2" />
                    {mySideInterested ? "Interest Registered" : "I'm Interested"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Guidelines</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p>• The chat stays open for 48 hours.</p>
              <p>• Mark “I'm Interested” once you wish to proceed.</p>
              <p>• When both sides are interested, staff coordinate with families.</p>
              <p>• Be respectful and honest.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
