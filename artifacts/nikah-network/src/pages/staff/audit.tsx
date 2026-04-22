import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function StaffAudit() {
  const { auditLogs, users } = useStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Audit Logs</h1>
        <p className="text-muted-foreground">Immutable record of all staff moderation actions.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Staff Member</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.slice().reverse().map(log => {
                const staff = users.find(u => u.id === log.staffId);
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell className="font-medium">{staff?.name}</TableCell>
                    <TableCell className="capitalize">{log.action.replace('_', ' ')}</TableCell>
                    <TableCell className="text-xs font-mono bg-muted px-1 rounded">{log.resourceType}:{log.resourceId.substring(0,6)}</TableCell>
                    <TableCell className="text-sm">{log.reason}</TableCell>
                  </TableRow>
                )
              })}
              {auditLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit logs found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
