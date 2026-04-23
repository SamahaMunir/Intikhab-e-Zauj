import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function StaffMatches() {
  const { matches, users, approveMatch, rejectMatch, currentUser } = useStore();
  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Suggested Matches</h1>
        <p className="text-muted-foreground">Review system-generated matches before they are visible to applicants.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User A</TableHead>
                <TableHead>User B</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map(m => {
                const ua = users.find(u => u.id === m.userAId)?.name;
                const ub = users.find(u => u.id === m.userBId)?.name;
                return (
                  <TableRow key={m.id}>
                    <TableCell>{ua}</TableCell>
                    <TableCell>{ub}</TableCell>
                    <TableCell className="font-bold text-primary">{m.score}%</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{m.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {m.status === 'suggested' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => rejectMatch(m.id, currentUser.id)}>Reject</Button>
                          <Button size="sm" onClick={() => approveMatch(m.id, currentUser.id)}>Approve</Button>
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
