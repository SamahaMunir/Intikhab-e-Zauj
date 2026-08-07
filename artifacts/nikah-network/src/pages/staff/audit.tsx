import { useEffect, useState } from "react";
import { format } from "date-fns";
import { getToken } from '@/lib/auth';
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, RefreshCw, Search, X, Inbox, ChevronDown } from "lucide-react";

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

const RESOURCE_OPTIONS = ["profile", "staff", "match", "auth", "proposal"];

const PAGE_SIZE = 50;

// Color-code the action badge by category so the log scans fast.
function actionTone(action: string): string {
  const a = action.toLowerCase();
  if (/approve|activate|completed|success/.test(a)) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (/reject|deactivate|remove|delete|deleted|fail/.test(a)) return "bg-red-50 text-red-600 border-red-200";
  if (/invite|create|generated/.test(a)) return "bg-sky-50 text-sky-700 border-sky-200";
  if (/proposal|match/.test(a)) return "bg-violet-50 text-violet-700 border-violet-200";
  if (/login|logout/.test(a)) return "bg-gray-100 text-gray-600 border-gray-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

function initials(email?: string): string {
  if (!email) return "?";
  return email.slice(0, 2).toUpperCase();
}

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

  const token  = getToken('staff');
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

  const applyActor = () => { setFilterActor(pendingActor.trim()); setPage(0); };

  const clearFilters = () => {
    setFilterAction('');
    setFilterActor('');
    setFilterResource('');
    setPendingActor('');
    setPage(0);
  };

  const goPage = (p: number) => { setPage(p); fetchAuditLogs(p); };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = !!(filterAction || filterActor || filterResource);

  // Shared control styling — one height, one radius, consistent focus.
  const ctl = "h-9 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition";

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-12">

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 text-sm mt-1">
            Immutable record of all staff actions · <span className="font-semibold text-gray-900 tabular-nums">{total}</span> total
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchAuditLogs(page)} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Actor search */}
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={pendingActor}
            onChange={e => setPendingActor(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyActor()}
            placeholder="Search actor email…  (press Enter)"
            className={`${ctl} w-full pl-9 pr-3 placeholder-gray-400`}
          />
        </div>

        {/* Action select */}
        <div className="relative">
          <select
            value={filterAction}
            onChange={e => { setFilterAction(e.target.value); setPage(0); }}
            className={`${ctl} appearance-none pl-3 pr-9 cursor-pointer min-w-40`}
          >
            <option value="">All actions</option>
            {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Resource select */}
        <div className="relative">
          <select
            value={filterResource}
            onChange={e => { setFilterResource(e.target.value); setPage(0); }}
            className={`${ctl} appearance-none pl-3 pr-9 cursor-pointer min-w-36`}
          >
            <option value="">All resources</option>
            {RESOURCE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="text-gray-500" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {filterAction && (
            <Chip label={`action: ${filterAction.replace(/_/g, ' ')}`} onClear={() => setFilterAction('')} />
          )}
          {filterActor && (
            <Chip label={`actor: ${filterActor}`} onClear={() => { setFilterActor(''); setPendingActor(''); }} />
          )}
          {filterResource && (
            <Chip label={`resource: ${filterResource}`} onClear={() => setFilterResource('')} />
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Error loading audit logs</p>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500 text-sm">Loading audit logs…</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No audit logs found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70">
                  {['Timestamp', 'Actor', 'Action', 'Resource', 'ID', 'Reason / Note'].map(h => (
                    <th key={h} className="px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={log._id || idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                      {format(new Date(log.createdAt), "MMM d, yyyy · HH:mm:ss")}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[10px] font-bold ring-1 ring-gray-200 shrink-0">
                          {initials(log.actorEmail)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-48">{log.actorEmail}</div>
                          <div className="text-[11px] text-gray-400 capitalize">{log.actorRole}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border capitalize whitespace-nowrap ${actionTone(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{log.resourceType}</span>
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-gray-400">
                      {log.resourceId ? log.resourceId.substring(0, 10) : '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {log.reason || <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer inside the table card */}
        {!isLoading && logs.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 bg-gray-50/40 text-sm text-gray-500">
            <span className="tabular-nums">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => goPage(page - 1)}>
                  Previous
                </Button>
                <span className="px-1 font-medium text-gray-900 tabular-nums">{page + 1} / {totalPages}</span>
                <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => goPage(page + 1)}>
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-3 pr-2 h-7 rounded-full bg-gray-900 text-white text-xs font-medium">
      {label}
      <button onClick={onClear} className="hover:bg-white/20 rounded-full p-0.5 transition-colors" aria-label="Remove filter">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
