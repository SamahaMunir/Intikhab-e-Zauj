import { useEffect, useState } from "react";
import { format } from "date-fns";
import { getToken } from '@/lib/auth';
import { AlertCircle, Loader2, RefreshCw, Search, X, ScrollText } from "lucide-react";

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

  const inputCls =
    'h-11 px-4 rounded-xl bg-[#F4F6F5] border border-gray-200 text-sm text-[#1C1917] ' +
    'placeholder-gray-400 focus:outline-none focus:border-[#10B981] focus:bg-white transition-colors';

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── Header + total chip ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
            <ScrollText className="w-6 h-6 text-[#10B981]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1C1917]">Audit Logs</h1>
            <p className="text-sm text-gray-500">
              Immutable record of all staff actions · <span className="font-semibold text-[#1C1917]">{total}</span> total
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchAuditLogs(page)}
          disabled={isLoading}
          className="flex items-center gap-2 h-11 px-5 rounded-xl bg-[#10B981] text-white
                     hover:bg-[#059669] disabled:opacity-50 text-sm font-bold transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1.5 min-w-44">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Action</label>
            <select value={filterAction}
              onChange={e => { setFilterAction(e.target.value); setPage(0); }}
              className={inputCls + ' cursor-pointer'}>
              <option value="">All actions</option>
              {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 min-w-48">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Actor email</label>
            <input type="text" value={pendingActor}
              onChange={e => setPendingActor(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyTextFilters()}
              placeholder="staff@example.com" className={inputCls} />
          </div>

          <div className="flex flex-col gap-1.5 min-w-36">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Resource type</label>
            <select value={pendingResource}
              onChange={e => setPendingResource(e.target.value)}
              className={inputCls + ' cursor-pointer'}>
              <option value="">All types</option>
              {['profile', 'staff', 'match', 'auth', 'proposal'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            <button onClick={applyTextFilters}
              className="flex items-center gap-1.5 h-11 px-5 bg-[#10B981] text-white rounded-xl
                         hover:bg-[#059669] text-sm font-bold transition-colors">
              <Search className="w-4 h-4" /> Apply
            </button>
            {hasFilters && (
              <button onClick={clearFilters}
                className="flex items-center gap-1.5 h-11 px-4 border border-gray-200 text-gray-600
                           rounded-xl hover:bg-gray-50 text-sm font-bold transition-colors">
                <X className="w-4 h-4" /> Clear
              </button>
            )}
          </div>
        </div>
        {hasFilters && (
          <p className="text-xs text-[#10B981] mt-3 font-semibold">
            Filtering by:
            {filterAction   && <span className="ml-1">action="{filterAction}"</span>}
            {filterActor    && <span className="ml-1">actor="{filterActor}"</span>}
            {filterResource && <span className="ml-1">resource="{filterResource}"</span>}
          </p>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 flex gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-900">Error loading audit logs</p>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#10B981]" />
            <span className="ml-2 text-gray-500">Loading audit logs…</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-gray-400">No audit logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F4F6F5] border-b border-gray-100">
                  {['Timestamp', 'Actor', 'Action', 'Resource', 'ID', 'Reason / Note'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={log._id || idx}
                      className={`border-b border-gray-50 hover:bg-[#F4F6F5] transition-colors ${
                        idx % 2 ? 'bg-white' : 'bg-gray-50/30'
                      }`}>
                    <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                      {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-semibold text-[#1C1917]">{log.actorEmail}</div>
                      <div className="text-xs text-gray-400 capitalize">{log.actorRole}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#10B981] capitalize whitespace-nowrap">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{log.resourceType}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono text-gray-400">
                      {log.resourceId?.substring(0, 12) ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 max-w-xs truncate">
                      {log.reason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          Showing {total === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} logs
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => goPage(page - 1)}
              className="h-9 px-4 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 text-sm font-semibold transition-colors">
              Previous
            </button>
            <span className="px-3 font-semibold text-[#1C1917]">Page {page + 1} / {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => goPage(page + 1)}
              className="h-9 px-4 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 text-sm font-semibold transition-colors">
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
