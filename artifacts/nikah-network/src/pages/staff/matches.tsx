import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import ScoreBreakdownPanel from '../../components/ScoreBreakdownUI';

type ProfileType = 'user' | 'staff';

interface ProfileSide {
  _id?: string;
  name?: string;
  age?: number;
  city?: string;
  gender?: string;
  caste?: string;
  profession?: string;
  photo?: string;
  source?: string;
}

interface MatchRecord {
  _id: string;
  score: number;
  status: string;
  leftProfileType?: ProfileType;
  rightProfileType?: ProfileType;
  scoreBreakdown?: {
    caste: number; profession: number; ageGap: number; city: number;
    height: number; houseStatus: number; houseArea: number; total: number;
  };
  user?: ProfileSide;
  candidate?: ProfileSide;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function typeBadge(t: ProfileType) {
  return t === 'staff'
    ? <span className="px-2 py-0.5 text-xs font-bold bg-purple-100 text-purple-700 rounded-full border border-purple-200">Staff</span>
    : <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded-full border border-blue-200">User</span>;
}

function pairLabel(left?: ProfileType, right?: ProfileType) {
  const l = left  === 'staff' ? 'Staff' : 'User';
  const r = right === 'staff' ? 'Staff' : 'User';
  const color = (left === 'staff' && right === 'staff')
    ? 'bg-purple-50 border-purple-200 text-purple-800'
    : 'bg-blue-50 border-blue-200 text-blue-800';
  return (
    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${color}`}>
      {l} ↔ {r}
    </span>
  );
}

export default function StaffMatches() {
  const [, setLocation] = useLocation();
  const [matches,     setMatches]     = useState<MatchRecord[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [generating,  setGenerating]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [filter,      setFilter]      = useState<'all' | 'suggested' | 'approved' | 'rejected'>('all');
  const [typeFilter,  setTypeFilter]  = useState<'all' | 'staff-staff' | 'staff-user'>('all');

  const token = localStorage.getItem('token') || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await fetch(`${API}/api/staff/matches/staff-view`, { headers });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to load matches');
      setMatches(d.matches || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading matches');
    } finally {
      setLoading(false);
    }
  };

  const generateStaffMatches = async () => {
    try {
      setGenerating(true);
      setError(null);
      const r = await fetch(`${API}/api/staff/matches/generate-all-staff`, {
        method: 'POST',
        headers,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Generation failed');
      console.log(`✅ Generated ${d.matchesGenerated} matches for ${d.staffProfilesProcessed} staff profiles`);
      await load(); // reload after generation
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation error');
      setGenerating(false);
    }
  };

useEffect(() => { load(); }, []);

  const scoreColor = (s: number) =>
    s >= 75 ? 'text-green-600' : s >= 60 ? 'text-orange-500' : s >= 40 ? 'text-yellow-500' : 'text-red-500';

  const statusBadge = (s: string) =>
    s === 'approved' ? 'bg-green-100 text-green-800 border-green-300' :
    s === 'rejected' ? 'bg-red-100 text-red-800 border-red-300' :
    'bg-blue-100 text-blue-800 border-blue-300';

  // Apply filters
  const filtered = matches
    .filter(m => filter === 'all' || m.status === filter)
    .filter(m => {
      if (typeFilter === 'all') return true;
      if (typeFilter === 'staff-staff') return m.leftProfileType === 'staff' && m.rightProfileType === 'staff';
      if (typeFilter === 'staff-user')  return (m.leftProfileType === 'staff') !== (m.rightProfileType === 'staff'); // XOR
      return true;
    });

  const counts = {
    all:       matches.length,
    suggested: matches.filter(m => m.status === 'suggested').length,
    approved:  matches.filter(m => m.status === 'approved').length,
    rejected:  matches.filter(m => m.status === 'rejected').length,
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-64 p-6">
      <div className="text-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-purple-600 rounded-full mx-auto mb-3" />
        <p className="text-gray-600">Loading staff matches…</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Matches</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Shows Staff↔Staff and Staff↔User only. User↔User matches are excluded.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
            Refresh
          </button>
          <button
            onClick={generateStaffMatches}
            disabled={generating}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
          >
            {generating ? 'Generating…' : 'Generate Staff Matches'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'suggested', 'approved', 'rejected'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              filter === s ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-xs text-gray-500 self-center">Type:</span>
        {([
          { key: 'all',        label: 'All' },
          { key: 'staff-staff', label: 'Staff ↔ Staff' },
          { key: 'staff-user',  label: 'Staff ↔ User' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setTypeFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              typeFilter === key ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && !error && (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
          <p className="text-gray-500 text-lg mb-2">
            {matches.length === 0 ? 'No staff matches yet.' : 'No matches for selected filters.'}
          </p>
          {matches.length === 0 && (
            <p className="text-gray-400 text-sm mb-6">
              Click "Generate Staff Matches" to generate matches for all staff-created profiles.
            </p>
          )}
        </div>
      )}

      {/* Match cards */}
      <div className="space-y-4">
        {filtered.map(m => {
          const score      = m.scoreBreakdown?.total ?? m.score;
          const isExpanded = expandedId === m._id;

          // Always display male on left, female on right
          const maleProfile   = m.user?.gender === 'male' ? m.user      : m.candidate;
          const femaleProfile = m.user?.gender === 'male' ? m.candidate : m.user;
          const maleType      = m.user?.gender === 'male'
            ? (m.leftProfileType  ?? 'user')
            : (m.rightProfileType ?? 'user');
          const femaleType    = m.user?.gender === 'male'
            ? (m.rightProfileType ?? 'user')
            : (m.leftProfileType  ?? 'user');
          const bothStaff     = maleType === 'staff' && femaleType === 'staff';

          return (
            <div key={m._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

              {/* Card header */}
              <div className="p-5">
                <div className="flex items-start gap-4 flex-wrap">

                  {/* Male profile — left */}
                  <div className="flex-1 min-w-40">
                    <div className="flex items-center gap-1.5 mb-1">
                      {typeBadge(maleType as ProfileType)}
                      <span className="text-xs text-blue-500 font-medium">♂</span>
                      {maleProfile?.photo && (
                        <img src={maleProfile.photo} alt={maleProfile.name}
                          className="w-6 h-6 rounded-full object-cover border border-gray-200 ml-1"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                    </div>
                    <p className="font-bold text-gray-900">{maleProfile?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      Age {maleProfile?.age} · {maleProfile?.city}
                    </p>
                    {maleProfile?.caste && <p className="text-xs text-purple-600 font-medium">{maleProfile.caste}</p>}
                    {maleProfile?.profession && <p className="text-xs text-gray-400">{maleProfile.profession}</p>}
                  </div>

                  {/* Score + pair type */}
                  <div className="text-center px-4 shrink-0">
                    <div className={`text-4xl font-black ${scoreColor(score)}`}>{score}</div>
                    <div className="text-xs text-gray-400 font-medium">/100</div>
                    <div className="mt-1">{pairLabel(maleType as ProfileType, femaleType as ProfileType)}</div>
                  </div>

                  {/* Female profile — right */}
                  <div className="flex-1 min-w-40">
                    <div className="flex items-center gap-1.5 mb-1">
                      {typeBadge(femaleType as ProfileType)}
                      <span className="text-xs text-pink-500 font-medium">♀</span>
                      {femaleProfile?.photo && (
                        <img src={femaleProfile.photo} alt={femaleProfile.name}
                          className="w-6 h-6 rounded-full object-cover border border-gray-200 ml-1"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                    </div>
                    <p className="font-bold text-gray-900">{femaleProfile?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      Age {femaleProfile?.age} · {femaleProfile?.city}
                    </p>
                    {femaleProfile?.caste && <p className="text-xs text-purple-600 font-medium">{femaleProfile.caste}</p>}
                    {femaleProfile?.profession && <p className="text-xs text-gray-400">{femaleProfile.profession}</p>}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize border ${statusBadge(m.status)}`}>
                      {m.status}
                    </span>

                    {/* View Profile buttons */}
                    <div className="flex gap-1.5">
                      {maleProfile?._id && (
                        <button
                          onClick={() => setLocation(`/staff/profiles/${maleProfile._id}`)}
                          className="px-2.5 py-1 text-xs border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 font-medium"
                        >
                          View ♂
                        </button>
                      )}
                      {femaleProfile?._id && (
                        <button
                          onClick={() => setLocation(`/staff/profiles/${femaleProfile._id}`)}
                          className="px-2.5 py-1 text-xs border border-pink-200 text-pink-700 rounded-lg hover:bg-pink-50 font-medium"
                        >
                          View ♀
                        </button>
                      )}
                    </div>

                    {/* Proposal button */}
                    <button
                      onClick={() => {
                        alert(`Proposal workflow coming soon. Match: ${m._id}`);
                      }}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium"
                    >
                      {bothStaff ? 'Make Proposal' : 'Send Proposal'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Score breakdown toggle */}
              {m.scoreBreakdown && (
                <div className="border-t border-gray-100">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : m._id)}
                    className="w-full px-5 py-2.5 text-left text-sm text-purple-600 font-medium hover:bg-purple-50 flex items-center gap-2"
                  >
                    <span>{isExpanded ? '▼' : '▶'}</span>
                    <span>Compatibility Breakdown — 100-point scoring</span>
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5">
                      <ScoreBreakdownPanel scoreBreakdown={m.scoreBreakdown} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
