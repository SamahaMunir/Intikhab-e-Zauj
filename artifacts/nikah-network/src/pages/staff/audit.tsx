import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";

interface AuditLog {
  _id?: string;
  actorId: string;
  actorEmail: string;
  actorRole: "staff" | "admin";
  action: string;
  resourceType: string;
  resourceId: string;
  reason?: string;
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

export default function StaffAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;

      const response = await fetch(`${apiUrl}/api/staff/audit-logs?limit=100&skip=0`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch audit logs`);
      }

      const data = await response.json();
      setLogs(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">
            Immutable record of all staff moderation actions.
          </p>
        </div>
        <button
          onClick={fetchAuditLogs}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 flex gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error loading audit logs</p>
              <p className="text-sm text-red-800">{error}</p>
              <p className="text-xs text-red-700 mt-2">
                API URL: {import.meta.env.VITE_API_URL || window.location.origin}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading audit logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No audit logs found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource Type</TableHead>
                  <TableHead>Resource ID</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, idx) => (
                  <TableRow key={log._id || idx}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>{log.actorEmail}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {log.actorRole}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {log.action.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {log.resourceType}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {log.resourceId.substring(0, 8)}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">
                      {log.reason || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        Total logs: {total} | Showing {logs.length} logs
      </div>
    </div>
  );
}
