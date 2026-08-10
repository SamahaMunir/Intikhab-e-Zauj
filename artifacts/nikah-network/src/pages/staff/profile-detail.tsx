import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { getToken } from '@/lib/auth';
import { ProfileView, type ProfileData } from '@/components/ProfileView';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, ArrowLeft, Pencil, Save, Upload, Heart, RotateCcw } from 'lucide-react';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';
import PhotoCropModal from '@/components/PhotoCropModal';
import { thumbUrl } from '@/lib/img';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Fields staff can edit — grouped for the form layout. `type` drives the input.
const EDIT_FIELDS: { key: string; label: string; type?: 'select' | 'textarea'; options?: string[] }[] = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'gender', label: 'Gender', type: 'select', options: ['male', 'female'] },
  { key: 'age', label: 'Age' },
  { key: 'city', label: 'City / Region' },
  { key: 'society', label: 'Society / Area' },
  { key: 'caste', label: 'Caste' },
  { key: 'height', label: 'Height' },
  { key: 'education', label: 'Education' },
  { key: 'profession', label: 'Profession' },
  { key: 'designation', label: 'Designation' },
  { key: 'monthlyIncome', label: 'Monthly Income' },
  { key: 'homeOwnership', label: 'Home Ownership', type: 'select', options: ['owned', 'rented', 'family', 'mortgaged', 'other'] },
  { key: 'houseArea', label: 'House Area (e.g. 5 marla, 1 kanal)' },
  { key: 'fatherName', label: "Father's Name" },
  { key: 'fatherMobile', label: "Father's / Guardian Mobile" },
  { key: 'matchCriteria', label: 'Match Criteria', type: 'textarea' },
  { key: 'bio', label: 'Bio', type: 'textarea' },
  { key: 'notes', label: 'Staff Notes', type: 'textarea' },
];

export default function StaffProfileDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const profileId = params.id;

  const [profile, setProfile]         = useState<ProfileData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionDone, setActionDone]   = useState<string | null>(null);
  const [editing, setEditing]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [form, setForm]               = useState<Record<string, string>>({});
  const [photoUrl, setPhotoUrl]       = useState('');
  const [photoCrop, setPhotoCrop]     = useState('');
  const [cropFile, setCropFile]       = useState<File | null>(null);
  const { uploadProfilePhoto, uploading, checking, error: uploadError } = useCloudinaryUpload();

  useEffect(() => {
    if (!profileId) return;
    fetchProfile();
  }, [profileId]);

  const fetchProfile = async () => {
    const token = getToken('staff');
    if (!token) { setLocation('/staff-login'); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/staff/profiles/${profileId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { setLocation('/staff-login'); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProfile(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const doAction = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectionReason.trim()) return;
    const token = getToken('staff');
    if (!token) return;

    setActionLoading(true);
    try {
      const endpoint = `${API}/api/staff/profiles/${profileId}/${action}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: action === 'reject' ? rejectionReason : 'Approved by staff' }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as any).error || `HTTP ${res.status}`);
      }
      setActionDone(action);
      await fetchProfile(); // refresh status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const startEdit = () => {
    const p = (profile || {}) as any;
    const next: Record<string, string> = {};
    for (const f of EDIT_FIELDS) {
      let v = p[f.key];
      if (f.key === 'homeOwnership') v = p.homeOwnership ?? p.houseStatus ?? '';
      next[f.key] = v == null ? '' : String(v);
    }
    setForm(next);
    setPhotoUrl(p.photo || '');
    setPhotoCrop(p.photoCrop || '');
    setEditing(true);
    setActionDone(null);
    setError(null);
  };

  const onPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setCropFile(file); // choose the profile crop first
  };
  const processPhoto = async (file: File, crop: string) => {
    const res = await uploadProfilePhoto(file);
    if (res?.url) { setPhotoUrl(res.url); setPhotoCrop(crop); }
  };

  const saveEdit = async () => {
    const token = getToken('staff');
    if (!token) { setLocation('/staff-login'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/staff/profiles/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, photo: photoUrl, photoCrop }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as any).error || `HTTP ${res.status}`);
      }
      setEditing(false);
      setActionDone('edit');
      await fetchProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const setMatched = async (matched: boolean) => {
    if (matched && !confirm('Mark this person as matched/married? They will be hidden from all match suggestions and the browse list.')) return;
    const token = getToken('staff');
    if (!token) { setLocation('/staff-login'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/staff/profiles/${profileId}/set-matched`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ matched }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as any).error || `HTTP ${res.status}`);
      }
      await fetchProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-6 bg-red-50 border border-red-200 rounded-xl text-red-800">
        <p className="font-semibold">Failed to load profile</p>
        <p className="text-sm mt-1">{error}</p>
        <button onClick={() => setLocation('/staff/profiles')} className="mt-4 text-sm text-red-600 underline">
          ← Back to profiles
        </button>
      </div>
    );
  }

  if (!profile) return null;

  const isPending  = profile.profileStatus === 'pending';
  const isApproved = profile.profileStatus === 'approved';
  const isRejected = profile.profileStatus === 'rejected';
  const isMatched  = (profile as any).matched === true;

  // "Registered Jan 2024" from the CSV date (falls back to created date).
  const regRaw = (profile as any).applicationDate || (profile as any).createdAt;
  const regD = regRaw ? new Date(regRaw) : null;
  const registeredLabel = regD && !isNaN(regD.getTime())
    ? regD.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="space-y-4 pb-10">
      <PhotoCropModal file={cropFile} open={!!cropFile}
        onCancel={() => setCropFile(null)}
        onConfirm={rect => { const f = cropFile; setCropFile(null); if (f) processPhoto(f, rect); }} />
      {/* Back navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setLocation('/staff/profiles')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Profiles
        </button>
        <span className="text-gray-300">|</span>
        <span className="text-sm text-gray-500">Reviewing: <strong className="text-gray-800">{profile.name}</strong></span>
        {registeredLabel && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
            Registered {registeredLabel}
          </span>
        )}
        {!editing && (
          <div className="ml-auto flex items-center gap-2">
            {isMatched
              ? <span className="text-xs px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-medium">Matched · hidden from pool</span>
              : <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">Available</span>}
            {isMatched
              ? <Button variant="outline" size="sm" disabled={saving} onClick={() => setMatched(false)}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Mark Available
                </Button>
              : <Button variant="outline" size="sm" disabled={saving} onClick={() => setMatched(true)}>
                  <Heart className="w-3.5 h-3.5 mr-1.5" />Mark Matched
                </Button>}
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" />Edit Profile
            </Button>
          </div>
        )}
      </div>

      {actionDone && (
        <div className={`p-4 rounded-xl border text-sm font-medium ${actionDone === 'reject' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
          {actionDone === 'approve' && '✓ Profile approved successfully.'}
          {actionDone === 'reject' && '✗ Profile rejected successfully.'}
          {actionDone === 'edit' && '✓ Profile updated successfully.'}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile photo */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-24 rounded-lg border bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
                {photoUrl
                  ? <img src={thumbUrl(photoUrl, photoCrop, 200)} alt="profile" className="w-full h-full object-cover" />
                  : <span className="text-[10px] text-gray-400 text-center px-1">No photo</span>}
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">Profile Photo</label>
                <label className="inline-flex items-center gap-2 text-sm px-3 h-9 rounded-md border border-input bg-background cursor-pointer hover:bg-accent">
                  {uploading || checking
                    ? <><Loader2 className="w-4 h-4 animate-spin" />{checking ? 'Verifying face…' : 'Uploading…'}</>
                    : <><Upload className="w-4 h-4" />{photoUrl ? 'Replace photo' : 'Upload photo'}</>}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPhotoSelect} disabled={uploading || checking} />
                </label>
                {photoUrl && (
                  <button type="button" className="block text-xs text-red-600 hover:underline" onClick={() => setPhotoUrl('')}>
                    Remove photo
                  </button>
                )}
                {uploadError && <p className="text-xs text-red-600 max-w-xs whitespace-pre-line">{uploadError.split('\n')[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {EDIT_FIELDS.map(f => (
                <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <Textarea
                      value={form[f.key] ?? ''}
                      onChange={e => setForm(s => ({ ...s, [f.key]: e.target.value }))}
                      rows={2}
                    />
                  ) : f.type === 'select' ? (
                    <select
                      value={form[f.key] ?? ''}
                      onChange={e => setForm(s => ({ ...s, [f.key]: e.target.value }))}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">—</option>
                      {f.options!.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      value={form[f.key] ?? ''}
                      onChange={e => setForm(s => ({ ...s, [f.key]: e.target.value }))}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" disabled={saving} onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" disabled={saving || uploading || checking} onClick={saveEdit}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
      /* Full profile — same component as /app/profile */
      <ProfileView
        profile={profile}
        maskCnic={false}
        showContact
        footer={
          isPending ? (
            <div className="space-y-4 mt-2">
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-sm text-red-700">Rejection Reason (required to reject)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="Will be emailed to the applicant"
                    rows={3}
                  />
                </CardContent>
              </Card>

              <div className="flex gap-4 justify-between">
                <Button
                  variant="destructive"
                  size="lg"
                  disabled={actionLoading || !rejectionReason.trim()}
                  onClick={() => doAction('reject')}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Reject Profile
                </Button>
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={actionLoading}
                  onClick={() => doAction('approve')}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Approve Profile
                </Button>
              </div>
            </div>
          ) : (
            <div className={`p-4 rounded-xl border text-sm font-medium ${isApproved ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              {isApproved ? '✓ This profile has been approved.' : '✗ This profile has been rejected.'}
            </div>
          )
        }
      />
      )}
    </div>
  );
}
