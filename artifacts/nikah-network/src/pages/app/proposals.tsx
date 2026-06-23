import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { Clock, MessageSquare, Loader2 } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import proposalService, { type Proposal } from "@/services/proposalService";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  chat_active: "default",
  family_proposal_stage: "default",
  completed: "default",
  pending_staff_review: "secondary",
  pending_recipient: "secondary",
  mutual_interest_confirmed: "secondary",
  rejected_by_staff: "destructive",
  declined_by_recipient: "destructive",
  withdrawn: "outline",
  expired: "outline",
};

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

    return (
      <Card key={p._id} className="hover-elevate">
        <CardHeader className="pb-3">
          <CardTitle className="flex justify-between items-center text-lg">
            <span>{other?.name || "Unknown"}</span>
            <Badge variant={STATUS_VARIANT[p.status] || "secondary"} className="capitalize">
              {p.status.replace(/_/g, " ")}
            </Badge>
          </CardTitle>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {p.expiresAt ? <>Expires {formatDistanceToNow(parseISO(p.expiresAt), { addSuffix: true })}</> : "—"}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {[other?.city, other?.education, other?.profession].filter(Boolean).join(" • ") || "No details"}
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Link href={`/app/proposals/${p._id}`} className="w-full">
            <Button variant={chatOpen ? "default" : "outline"} className="w-full">
              {chatOpen ? <><MessageSquare className="w-4 h-4 mr-2" /> Open Chat</> : "View Details"}
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif font-bold">Proposals</h1>

      {error && (
        <Card><CardContent className="py-4 text-center text-destructive text-sm">{error}</CardContent></Card>
      )}

      <Tabs defaultValue="received">
        <TabsList className="mb-4">
          <TabsTrigger value="received">Received ({receivedProposals.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({sentProposals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-4">
          {receivedProposals.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No received proposals.</CardContent></Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {receivedProposals.map(p => renderProposalCard(p, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          {sentProposals.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No sent proposals.</CardContent></Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sentProposals.map(p => renderProposalCard(p, false))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
