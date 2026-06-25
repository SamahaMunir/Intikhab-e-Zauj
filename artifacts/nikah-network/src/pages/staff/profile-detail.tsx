import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { getToken } from '@/lib/auth';
import { ProfileView, type ProfileData } from '@/components/ProfileView';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

  return (
    <div className="space-y-4 pb-10">
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
      </div>

      {actionDone && (
        <div className={`p-4 rounded-xl border text-sm font-medium ${actionDone === 'approve' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          ✓ Profile {actionDone === 'approve' ? 'approved' : 'rejected'} successfully.
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      {/* Full profile — same component as /app/profile */}
      <ProfileView
        profile={profile}
        maskCnic={false}
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
    </div>
  );
}
