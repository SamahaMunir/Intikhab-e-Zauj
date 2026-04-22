import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, parseISO } from "date-fns";

export default function StaffProposals() {
  const { proposals, users, approveProposal, rejectProposal, currentUser } = useStore();
  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Proposal Approvals</h1>
        <p className="text-muted-foreground">Review new proposals before they are sent.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Initiator</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map(p => {
                const init = users.find(u => u.id === p.initiatorId)?.name;
                const rec = users.find(u => u.id === p.recipientId)?.name;
                return (
                  <TableRow key={p.id}>
                    <TableCell>{init}</TableCell>
                    <TableCell>{rec}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(parseISO(p.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'pending_staff_approval' ? 'secondary' : 'outline'} className="capitalize">
                        {p.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {p.status === 'pending_staff_approval' && (
                        <>
                          <Button size="sm" variant="destructive" onClick={() => rejectProposal(p.id, currentUser.id, "Staff rejected")}>Reject</Button>
                          <Button size="sm" onClick={() => approveProposal(p.id, currentUser.id)}>Approve</Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
