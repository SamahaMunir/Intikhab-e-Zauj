import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, HeartHandshake, CalendarClock, UserCheck, Inbox } from "lucide-react";
import { format } from "date-fns";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` });

interface CounsellingRequest {
  _id: string;
  type: "pre_marriage" | "post_marriage";
  topic: string;
  status: "pending" | "scheduled" | "completed" | "cancelled";
  counsellor?: string | null;
  scheduledAt?: string | null;
  staffNotes?: string | null;
  createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  scheduled: "bg-sky-50 text-sky-700 border-sky-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function AppCounselling() {
  const [type, setType] = useState("");
  const [topic, setTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [requests, setRequests] = useState<CounsellingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const r = await fetch(`${API}/api/counselling/mine`, { headers: authHeaders() });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to load");
      setRequests(d.requests || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!type) { setError("Please choose a counselling type."); return; }
    if (topic.trim().length < 3) { setError("Please describe your topic or concern."); return; }
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/api/counselling`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ type, topic: topic.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to submit");
      setType(""); setTopic("");
      setRequests(prev => [d.request, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async (id: string) => {
    if (!window.confirm("Cancel this counselling request?")) return;
    setCancelling(id);
    try {
      const r = await fetch(`${API}/api/counselling/${id}/cancel`, { method: "PATCH", headers: authHeaders() });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to cancel");
      setRequests(prev => prev.map(c => c._id === id ? { ...c, status: "cancelled" } : c));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel");
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <HeartHandshake className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900">Counselling</h1>
          <p className="text-gray-500 text-sm mt-1">
            Falah-e-Khandan offers confidential pre- and post-marriage counselling. Request a session and our team will assign a counsellor.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Request form */}
        <Card className="border-gray-200 shadow-none h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Request a Session</CardTitle>
            <CardDescription>Tell us the type and what you'd like guidance on.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label>Counselling Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre_marriage">Pre-Marriage</SelectItem>
                    <SelectItem value="post_marriage">Post-Marriage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Topic / Concern</Label>
                <Input value={topic} onChange={e => setTopic(e.target.value)}
                  placeholder="E.g., financial planning, expectations, conflict resolution…" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Request"}
              </Button>
              <p className="text-xs text-gray-400">
                Your request is private and shared only with our counselling staff.
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Requests list */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Your Requests</h2>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
          ) : requests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
              <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No counselling requests yet.</p>
            </div>
          ) : (
            requests.map(req => (
              <Card key={req._id} className="border-gray-200 shadow-none">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 capitalize">{req.type.replace("_", "-")} counselling</p>
                      <p className="text-sm text-gray-600 mt-0.5">{req.topic}</p>
                    </div>
                    <Badge variant="outline" className={`capitalize shrink-0 ${STATUS_STYLE[req.status]}`}>
                      {req.status}
                    </Badge>
                  </div>

                  {(req.counsellor || req.scheduledAt) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 pt-1">
                      {req.counsellor && (
                        <span className="inline-flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> {req.counsellor}</span>
                      )}
                      {req.scheduledAt && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="w-3.5 h-3.5" /> {format(new Date(req.scheduledAt), "MMM d, yyyy · h:mm a")}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-gray-400">Requested {format(new Date(req.createdAt), "MMM d, yyyy")}</span>
                    {["pending", "scheduled"].includes(req.status) && (
                      <Button variant="ghost" size="sm" className="text-red-600 h-7 px-2 text-xs"
                        disabled={cancelling === req._id} onClick={() => cancel(req._id)}>
                        {cancelling === req._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Cancel"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
