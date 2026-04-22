import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function StaffCounselling() {
  const { counselling, users } = useStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Counselling Requests</h1>
        <p className="text-muted-foreground">Manage incoming requests for pre/post-marriage guidance.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {counselling.map(c => {
                const user = users.find(u => u.id === c.userId);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{user?.name}</TableCell>
                    <TableCell className="capitalize">{c.type.replace('_', ' ')}</TableCell>
                    <TableCell>{c.topic}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'pending' ? 'secondary' : 'default'} className="capitalize">
                        {c.status}
                      </Badge>
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
