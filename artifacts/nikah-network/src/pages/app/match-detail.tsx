import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { ProfileView, type ProfileData } from '@/components/ProfileView';
import ScoreBreakdownPanel from '@/components/ScoreBreakdownUI';
import { Loader2, ArrowLeft, Heart } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface MatchScore {
  total: number;
  caste: number;
  profession: number;
  ageGap: number;
  city: number;
  height: number;
  houseStatus: number;
  houseArea: number;
}

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();   // id = candidateId
  const [, setLocation] = useLocation();

  const [profile, setProfile]       = useState<ProfileData | null>(null);
  const [scoreBreakdown, setScore]  = useState<MatchScore | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLocation('/login'); return; }

    setLoading(true);
    setError(null);
    try {
      // Fetch candidate's profile by ID
      const res = await fetch(`${API}/api/profile/view/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { setLocation('/login'); return; }
      if (res.status === 403) {
        setError('This profile is not yet available for viewing.');
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProfile(data.profile);

      // Also try to get the score from matches (best-effort — may not exist)
      const storedUser = localStorage.getItem('user');
      const userId = storedUser ? JSON.parse(storedUser)._id : null;
      if (userId) {
        try {
          const mRes = await fetch(`${API}/api/matches/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (mRes.ok) {
            const mData = await mRes.json();
            const match = (mData.matches || []).find(
              (m: any) => m.candidateId?.toString() === id || m.candidate?._id?.toString() === id
            );
            if (match?.scoreBreakdown) setScore(match.scoreBreakdown);
          }
        } catch {}
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-6 bg-red-50 border border-red-200 rounded-xl">
        <p className="font-semibold text-red-800">{error}</p>
        <button onClick={() => setLocation('/app/matches')}
          className="mt-4 text-sm text-red-600 underline">
          ← Back to matches
        </button>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="pb-10">
      {/* Back nav */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => setLocation('/app/matches')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Matches
        </button>
      </div>

      {/* Score banner (if available) */}
      {scoreBreakdown && (
        <div className="mb-5 bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" />
              Compatibility Score
            </h2>
            <span className={`text-3xl font-black ${
              scoreBreakdown.total >= 75 ? 'text-green-600' :
              scoreBreakdown.total >= 60 ? 'text-orange-500' :
              scoreBreakdown.total >= 40 ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {scoreBreakdown.total}<span className="text-sm font-normal text-gray-400">/100</span>
            </span>
          </div>
          <ScoreBreakdownPanel scoreBreakdown={scoreBreakdown} />
        </div>
      )}

      {/* Full profile — read-only, same layout as /app/profile */}
      <ProfileView
        profile={profile}
        maskCnic={true}
        /* No photoAction, no sectionAction → read-only */
        footer={
          <div className="flex gap-4 mt-2">
            <button
              onClick={() => setLocation(`/app/send-proposal/${id}`)}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold text-sm"
            >
              Send Proposal
            </button>
            <button
              onClick={() => setLocation('/app/matches')}
              className="flex-1 py-3 border-2 border-green-600 text-green-700 rounded-xl hover:bg-green-50 font-semibold text-sm"
            >
              Back to Matches
            </button>
          </div>
        }
      />
    </div>
  );
}
