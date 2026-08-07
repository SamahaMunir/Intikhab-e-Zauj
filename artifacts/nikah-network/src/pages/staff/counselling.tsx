import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Inbox, UserCheck, CalendarClock, Phone, Mail } from "lucide-react";
import { format } from "date-fns";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface CReq {
  _id: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  type: "pre_marriage" | "post_marriage";
  topic: string;
  status: "pending" | "scheduled" | "completed" | "cancelled";
  counsellor?: string | null;
  scheduledAt?: string | null;
  staffNotes?: string | null;
  createdAt: string;
}

const FILTERS: { label: string; value: string }[] = [
  { label: "Pending", value: "pending" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "All", value: "" },
];

const STATUS_STYLE: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  scheduled: "bg-sky-50 text-sky-700 border-sky-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time.
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function StaffCounselling() {
  const [filter, setFilter] = useState("pending");
  const [items, setItems] = useState<CReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Per-row draft edits
  const [draft, setDraft] = useState<Record<string, { counsellor: string; scheduledAt: string; staffNotes: string }>>({});

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const qs = filter ? `?status=${filter}` : "";
      const r = await fetch(`${API}/api/staff/counselling${qs}`, { headers: { Authorization: `Bearer ${getToken("staff")}` } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setItems(d.requests || []);
      const dr: any = {};
      for (const c of d.requests || []) dr[c._id] = { counsellor: c.counsellor || "", scheduledAt: toLocalInput(c.scheduledAt), staffNotes: c.staffNotes || "" };
      setDraft(dr);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, [filter]);

  const patch = async (id: string, body: any) => {
    setBusy(id);
    setError(null);
    try {
      const r = await fetch(`${API}/api/staff/counselling/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken("staff")}` },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      // If the updated row no longer matches the active filter, drop it; else replace.
      setItems(prev => {
        if (filter && d.request.status !== filter) return prev.filter(c => c._id !== id);
        return prev.map(c => c._id === id ? d.request : c);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  };

  const saveAndSchedule = (id: string) => {
    const dft = draft[id];
    patch(id, {
      counsellor: dft.counsellor,
      scheduledAt: dft.scheduledAt ? new Date(dft.scheduledAt).toISOString() : null,
      staffNotes: dft.staffNotes,
      status: "scheduled",
    });
  };

  return (
    <div className="max-w-4xl space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Counselling Requests</h1>
        <p className="text-gray-500 text-sm mt-1">
          Assign a counsellor, schedule the session, and mark it completed. Pre/post-marriage guidance requests from applicants.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(f => {
          const active = filter === f.value;
          return (
            <button key={f.value || "all"} onClick={() => setFilter(f.value)}
              className={`px-3.5 h-8 rounded-full text-sm font-medium transition-colors ${
                active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {f.label}
            </button>
          );
        })}
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No requests in this view.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(c => {
            const dft = draft[c._id] || { counsellor: "", scheduledAt: "", staffNotes: "" };
            const setD = (patch: Partial<typeof dft>) => setDraft(prev => ({ ...prev, [c._id]: { ...dft, ...patch } }));
            const isBusy = busy === c._id;
            const terminal = c.status === "completed" || c.status === "cancelled";

            return (
              <Card key={c._id} className="border-gray-200 shadow-none">
                <CardContent className="p-4 space-y-3">
                  {/* Top: applicant + status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{c.userName}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                        {c.userEmail && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {c.userEmail}</span>}
                        {c.userPhone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {c.userPhone}</span>}
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border capitalize shrink-0 ${STATUS_STYLE[c.status]}`}>
                      {c.status}
                    </span>
                  </div>

                  {/* Request */}
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-400 capitalize">{c.type.replace("_", "-")} · requested {format(new Date(c.createdAt), "MMM d, yyyy")}</p>
                    <p className="text-sm text-gray-700 mt-0.5">{c.topic}</p>
                  </div>

                  {/* Manage (hidden once terminal) */}
                  {!terminal && (
                    <div className="space-y-2.5 pt-1">
                      <div className="grid sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500 flex items-center gap-1 mb-1"><UserCheck className="w-3.5 h-3.5" /> Counsellor</label>
                          <input value={dft.counsellor} onChange={e => setD({ counsellor: e.target.value })}
                            placeholder="Assign a counsellor"
                            className="h-9 w-full px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-gray-400" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500 flex items-center gap-1 mb-1"><CalendarClock className="w-3.5 h-3.5" /> Session date &amp; time</label>
                          <input type="datetime-local" value={dft.scheduledAt} onChange={e => setD({ scheduledAt: e.target.value })}
                            className="h-9 w-full px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-gray-400" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Staff notes (private)</label>
                        <textarea value={dft.staffNotes} onChange={e => setD({ staffNotes: e.target.value })}
                          rows={2} placeholder="Internal notes…"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-gray-400 resize-none" />
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" className="bg-sky-600 hover:bg-sky-700" disabled={isBusy} onClick={() => saveAndSchedule(c._id)}>
                          {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Schedule"}
                        </Button>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={isBusy}
                          onClick={() => patch(c._id, { counsellor: dft.counsellor, staffNotes: dft.staffNotes, status: "completed" })}>
                          Mark Completed
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 ml-auto" disabled={isBusy}
                          onClick={() => { if (window.confirm("Cancel this request?")) patch(c._id, { status: "cancelled" }); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Terminal summary */}
                  {terminal && (c.counsellor || c.scheduledAt || c.staffNotes) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      {c.counsellor && <span className="inline-flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> {c.counsellor}</span>}
                      {c.scheduledAt && <span className="inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> {format(new Date(c.scheduledAt), "MMM d, yyyy · h:mm a")}</span>}
                      {c.staffNotes && <span className="italic">“{c.staffNotes}”</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
