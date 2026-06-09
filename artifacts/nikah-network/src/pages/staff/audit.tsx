import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { AlertCircle, Loader2, RefreshCw, Search, X } from "lucide-react";

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

const ACTION_OPTIONS = [
  "login", "logout",
  "invite_staff", "activate_staff", "deactivate_staff", "remove_staff",
  "create_applicant", "approve_profile", "reject_profile",
  "user_login", "account_deleted",
  "match_generated", "proposal_created",
];

const PAGE_SIZE = 50;

export default function StaffAudit() {
  const [logs, setLogs]         = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(0);

  // Filters
  const [filterAction, setFilterAction]       = useState('');
  const [filterActor, setFilterActor]         = useState('');
  const [filterResource, setFilterResource]   = useState('');
  const [pendingActor, setPendingActor]       = useState('');
  const [pendingResource, setPendingResource] = useState('');

  const token  = localStorage.getItem('token');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchAuditLogs = async (p = page) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        skip:  String(p * PAGE_SIZE),
      });
      if (filterAction)   params.set('action',       filterAction);
      if (filterActor)    params.set('actorEmail',    filterActor);
      if (filterResource) params.set('resourceType',  filterResource);

      const response = await fetch(`${apiUrl}/api/staff/audit-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch audit logs`);

      const data = await response.json();
      setLogs(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAuditLogs(0); }, [filterAction, filterActor, filterResource]);

  const applyTextFilters = () => {
    setFilterActor(pendingActor.trim());
    setFilterResource(pendingResource.trim());
    setPage(0);
  };

  const clearFilters = () => {
    setFilterAction('');
    setFilterActor('');
    setFilterResource('');
    setPendingActor('');
    setPendingResource('');
    setPage(0);
  };

  const goPage = (p: number) => {
    setPage(p);
    fetchAuditLogs(p);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = filterAction || filterActor || filterResource;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500">Immutable record of all staff actions.</p>
        </div>
        <button
          onClick={() => fetchAuditLogs(page)}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Action */}
            <div className="flex flex-col gap-1 min-w-44">
              <label className="text-xs font-medium text-gray-600">Action</label>
              <select
                value={filterAction}
                onChange={e => { setFilterAction(e.target.value); setPage(0); }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All actions</option>
                {ACTION_OPTIONS.map(a => (
                  <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            {/* Actor email */}
            <div className="flex flex-col gap-1 min-w-48">
              <label className="text-xs font-medium text-gray-600">Actor email</label>
              <input
                type="text"
                value={pendingActor}
                onChange={e => setPendingActor(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyTextFilters()}
                placeholder="staff@example.com"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Resource type */}
            <div className="flex flex-col gap-1 min-w-36">
              <label className="text-xs font-medium text-gray-600">Resource type</label>
              <select
                value={pendingResource}
                onChange={e => setPendingResource(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All types</option>
                {['profile', 'staff', 'match', 'auth', 'proposal'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={applyTextFilters}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
              >
                <Search className="w-4 h-4" /> Apply
              </button>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  <X className="w-4 h-4" /> Clear
                </button>
              )}
            </div>
          </div>
          {hasFilters && (
            <p className="text-xs text-purple-600 mt-2">
              Filtering by:
              {filterAction   && <span className="ml-1 font-medium">action="{filterAction}"</span>}
              {filterActor    && <span className="ml-1 font-medium">actor="{filterActor}"</span>}
              {filterResource && <span className="ml-1 font-medium">resource="{filterResource}"</span>}
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 flex gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error loading audit logs</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading audit logs…</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-gray-400">No audit logs found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Reason / Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, idx) => (
                  <TableRow key={log._id || idx}>
                    <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                      {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{log.actorEmail}</div>
                      <div className="text-xs text-gray-400 capitalize">{log.actorRole}</div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 capitalize">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                        {log.resourceType}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-gray-500">
                      {log.resourceId?.substring(0, 12) ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                      {log.reason || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination + summary */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} logs
        </span>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => goPage(page - 1)}
              className="px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-40 text-sm"
            >
              Previous
            </button>
            <span className="px-3 py-1">Page {page + 1} / {totalPages}</span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => goPage(page + 1)}
              className="px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-40 text-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
