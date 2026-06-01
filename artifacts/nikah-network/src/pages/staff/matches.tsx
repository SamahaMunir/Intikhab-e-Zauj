import React, { useEffect, useState } from 'react';
import ScoreBreakdownPanel from '../../components/ScoreBreakdownUI';

interface MatchRecord {
  _id: string;
  score: number;
  status: string;
  scoreBreakdown?: {
    caste: number; profession: number; ageGap: number; city: number;
    height: number; houseStatus: number; houseArea: number; total: number;
  };
  user?: { name: string; age: number; city: string; gender: string; caste?: string };
  candidate?: { name: string; age: number; city: string; profession: string; caste?: string; gender: string; photo?: string };
}

const API = 'http://localhost:5000';

export default function StaffMatches() {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  const token = localStorage.getItem('token') || '';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await fetch(`${API}/api/staff/matches/all`, { headers });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to load matches');
      setMatches(d.matches || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading matches');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const r = await fetch(`${API}/api/matches/${id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error('Failed to update match');
      setMatches(prev => prev.map(m => m._id === id ? { ...m, status } : m));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error');
    }
  };

  useEffect(() => { load(); }, []);

  const scoreColor = (s: number) =>
    s >= 75 ? 'text-green-600' : s >= 60 ? 'text-orange-500' : s >= 40 ? 'text-yellow-500' : 'text-red-500';

  const badgeClass = (s: string) =>
    s === 'approved' ? 'bg-green-100 text-green-800 border border-green-300' :
    s === 'rejected' ? 'bg-red-100 text-red-800 border border-red-300' :
    'bg-blue-100 text-blue-800 border border-blue-300';

  const counts = {
    all: matches.length,
    suggested: matches.filter(m => m.status === 'suggested').length,
    approved: matches.filter(m => m.status === 'approved').length,
    rejected: matches.filter(m => m.status === 'rejected').length,
  };

  const shown = filter === 'all' ? matches : matches.filter(m => m.status === filter);

  if (loading) return (
    <div className="flex justify-center items-center min-h-64 p-6">
      <div className="text-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-purple-600 rounded-full mx-auto mb-3" />
        <p className="text-gray-600">Loading AI match suggestions...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Match Suggestions</h1>
          <p className="text-gray-500 mt-1">
            Review compatibility scores before matches reach applicants. Only approved matches are shown to users.
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'suggested', 'approved', 'rejected'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              filter === s ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      {shown.length === 0 && !error && (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
          <p className="text-gray-500 text-lg">No matches found.</p>
          <p className="text-gray-400 text-sm mt-2">
            Go to a user profile and trigger match generation, or run the seed endpoint first.
          </p>
        </div>
      )}

      {/* Match cards */}
      <div className="space-y-4">
        {shown.map(m => {
          const score = m.scoreBreakdown?.total ?? m.score;
          return (
            <div key={m._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Card header */}
              <div className="p-5 flex items-center gap-4 flex-wrap">
                <div className="flex-1 flex items-center gap-6 min-w-0">
                  {/* User A */}
                  <div className="text-center min-w-32">
                    <p className="font-bold text-gray-900 truncate">{m.user?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {m.user?.gender} • Age {m.user?.age} • {m.user?.city}
                    </p>
                    {m.user?.caste && (
                      <p className="text-xs text-purple-600 font-medium">{m.user.caste}</p>
                    )}
                  </div>

                  {/* Score */}
                  <div className="text-center px-4 border-x border-gray-100">
                    <div className={`text-4xl font-black ${scoreColor(score)}`}>{score}</div>
                    <div className="text-xs text-gray-400 font-medium">/100 pts</div>
                  </div>

                  {/* User B */}
                  <div className="text-center min-w-32">
                    <p className="font-bold text-gray-900 truncate">{m.candidate?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {m.candidate?.gender} • Age {m.candidate?.age} • {m.candidate?.city}
                    </p>
                    {m.candidate?.caste && (
                      <p className="text-xs text-purple-600 font-medium">{m.candidate.caste}</p>
                    )}
                    {m.candidate?.profession && (
                      <p className="text-xs text-gray-400">{m.candidate.profession}</p>
                    )}
                  </div>
                </div>

                {/* Status + Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${badgeClass(m.status)}`}>
                    {m.status}
                  </span>
                  {m.status === 'suggested' && (
                    <>
                      <button
                        onClick={() => updateStatus(m._id, 'rejected')}
                        className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => updateStatus(m._id, 'approved')}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                      >
                        Approve
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Score breakdown toggle */}
              {m.scoreBreakdown && (
                <div className="border-t border-gray-100">
                  <button
                    onClick={() => setExpandedId(expandedId === m._id ? null : m._id)}
                    className="w-full px-5 py-2.5 text-left text-sm text-purple-600 font-medium hover:bg-purple-50 flex items-center gap-2"
                  >
                    <span>{expandedId === m._id ? '▼' : '▶'}</span>
                    <span>View Compatibility Breakdown (100-point scoring)</span>
                  </button>
                  {expandedId === m._id && (
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
