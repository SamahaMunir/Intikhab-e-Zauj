import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check, AlertTriangle } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` });

interface Prefs { matches: boolean; proposals: boolean; messages: boolean }
const DEFAULT_PREFS: Prefs = { matches: true, proposals: true, messages: true };

export default function AppSettings() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Account deletion
  const [delPassword, setDelPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/api/profile/me`, { headers: authHeaders() });
        const d = await r.json();
        if (r.ok) {
          const p = (d.profile || d)?.notificationPrefs;
          if (p) setPrefs({ ...DEFAULT_PREFS, ...p });
        }
      } catch { /* keep defaults */ } finally { setLoading(false); }
    })();
  }, []);

  const save = async (next: Prefs) => {
    setPrefs(next);
    setSaving(true); setSaved(false); setError(null);
    try {
      const r = await fetch(`${API}/api/profile/me/update`, {
        method: "PATCH", headers: authHeaders(), body: JSON.stringify({ notificationPrefs: next }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || "Save failed"); }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof Prefs) => save({ ...prefs, [key]: !prefs[key] });

  const deleteAccount = async () => {
    if (!delPassword) { setError("Enter your password to confirm deletion."); return; }
    if (!window.confirm("This permanently deletes your account and profile. Continue?")) return;
    setDeleting(true); setError(null);
    try {
      const r = await fetch(`${API}/auth/delete-account`, {
        method: "DELETE", headers: authHeaders(), body: JSON.stringify({ password: delPassword }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || d.error || "Deletion failed");
      localStorage.clear();
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete account");
      setDeleting(false);
    }
  };

  const ROWS: { key: keyof Prefs; label: string }[] = [
    { key: "matches", label: "New Matches" },
    { key: "proposals", label: "New Proposals" },
    { key: "messages", label: "New Messages" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account preferences.</p>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {/* Notifications */}
      <Card className="border-gray-200 shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Notifications</CardTitle>
              <CardDescription>Choose what you want to be notified about by email.</CardDescription>
            </div>
            {saving ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              : saved ? <span className="text-xs text-emerald-600 inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Saved</span>
              : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : ROWS.map(row => (
            <div key={row.key} className="flex items-center justify-between">
              <Label htmlFor={`notif-${row.key}`}>{row.label}</Label>
              <Switch id={`notif-${row.key}`} checked={prefs[row.key]} onCheckedChange={() => toggle(row.key)} disabled={saving} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card className="border-gray-200 shadow-none">
        <CardHeader><CardTitle className="text-lg">Privacy &amp; Data</CardTitle></CardHeader>
        <CardContent>
          <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
            <p className="font-medium text-gray-900 mb-1">Data Retention Notice</p>
            As part of Falah-e-Khandan Center guidelines, your data is kept secure and never shared with third parties.
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-200 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Delete Account
          </CardTitle>
          <CardDescription>Permanently remove your account and profile. This cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!showDelete ? (
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setShowDelete(true)}>
              Delete my account
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="del-pass">Confirm your password</Label>
                <Input id="del-pass" type="password" value={delPassword} onChange={e => setDelPassword(e.target.value)}
                  placeholder="Your password" />
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" disabled={deleting} onClick={deleteAccount}>
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Permanently delete"}
                </Button>
                <Button variant="outline" disabled={deleting} onClick={() => { setShowDelete(false); setDelPassword(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
