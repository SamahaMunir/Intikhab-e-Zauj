import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import proposalService, { type Proposal, type ProposalStatus } from "@/services/proposalService";

const FILTERS: { label: string; value: ProposalStatus | "all" }[] = [
  { label: "Pending Review", value: "pending_staff" },
  { label: "Approved", value: "approved" },
  { label: "Completed", value: "completed" },
  { label: "All", value: "all" },
];

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  approved: "default", completed: "default",
  pending_recipient: "secondary", pending_staff: "secondary",
  rejected: "destructive", declined: "destructive",
  withdrawn: "outline", expired: "outline", closed: "outline",
};

export default function StaffProposals() {
  const [filter, setFilter] = useState<ProposalStatus | "all">("pending_staff");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

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

  useEffect(() => { load(); /* eslint-disable-line */ }, [filter]);

  const review = async (id: string, action: "approve" | "reject") => {
    let reason: string | undefined;
    if (action === "reject") {
      reason = window.prompt("Reason for rejecting this proposal?") || undefined;
      if (!reason) return;
    }
    setActingId(id);
    try {
      await proposalService.staffReview(id, action, reason);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Proposal Approvals</h1>
        <p className="text-muted-foreground">Review accepted proposals before the chat opens.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <Button key={f.value} size="sm" variant={filter === f.value ? "default" : "outline"}
            onClick={() => setFilter(f.value)}>
            {f.label}
          </Button>
        ))}
      </div>

      {error && <Card><CardContent className="py-3 text-center text-destructive text-sm">{error}</CardContent></Card>}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
          ) : proposals.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">No proposals in this view.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Initiator</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map(p => (
                  <TableRow key={p._id}>
                    <TableCell>{p.initiator?.name || "Unknown"}</TableCell>
                    <TableCell>{p.recipient?.name || "Unknown"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {p.type === "STAFF_PROPOSAL" ? "Staff" : "User"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.createdAt ? formatDistanceToNow(parseISO(p.createdAt), { addSuffix: true }) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[p.status] || "secondary"} className="capitalize">
                        {p.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {p.status === "pending_staff" ? (
                        <>
                          <Button size="sm" variant="destructive" disabled={actingId === p._id}
                            onClick={() => review(p._id, "reject")}>Reject</Button>
                          <Button size="sm" disabled={actingId === p._id}
                            onClick={() => review(p._id, "approve")}>
                            {actingId === p._id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
