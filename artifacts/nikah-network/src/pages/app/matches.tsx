import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import matchingService from '../../services/matchingService';
import ScoreBreakdownPanel from '../../components/ScoreBreakdownUI';

interface Match {
  _id: string;
  candidateId: string;
  score: number;
  scoreBreakdown?: {
    caste: number; profession: number; ageGap: number; city: number;
    height: number; houseStatus: number; houseArea: number; total: number;
  };
  candidate?: {
    _id: string; name: string; age: number; dob?: string;
    city: string; profession: string; photo?: string;
    gender: string; caste?: string; height?: string; education?: string;
  };
}

function dedup(raw: Match[]): Match[] {
  const seen = new Map<string, Match>();
  for (const m of raw) {
    const cid = m.candidateId || m.candidate?._id;
    if (!cid) continue;
    const existing = seen.get(cid);
    const score = m.scoreBreakdown?.total ?? m.score ?? 0;
    const existScore = existing ? (existing.scoreBreakdown?.total ?? existing.score ?? 0) : -1;
    if (!existing || score > existScore) seen.set(cid, m);
  }
  return Array.from(seen.values())
    .filter(m => m.candidate?.name && m.candidate?.city)
    .sort((a, b) => (b.scoreBreakdown?.total ?? b.score) - (a.scoreBreakdown?.total ?? a.score));
}

const Matches: React.FC = () => {
  const [, setLocation] = useLocation();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterScore, setFilterScore] = useState<number>(0);

  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const userId = user?._id;

  const profileCompletion = user?.profileCompletion ?? 0;
  const profileComplete = profileCompletion >= 100;

  useEffect(() => {
    if (!userId) {
      setError('Please log in to view matches.');
      setIsLoading(false);
      return;
    }
    if (!profileComplete) {
      // Don't call API — profile not complete
      setIsLoading(false);
      return;
    }
    loadMatches();
  }, [userId, profileComplete]);

  const loadMatches = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Always regenerate on first load — ensures gender-correct matches
      // (repairs any DB corruption, clears stale records from prev session)
      console.log(`🔄 Regenerating matches for user ${userId} (gender: ${user?.gender || 'unknown'})`);
      await matchingService.generateMatches(userId);

      const res = await matchingService.getMatches(userId);
      setMatches(dedup(res.matches || []));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load matches');
    } finally {
      setIsLoading(false);
    }
  };

  const generateMatches = async () => {
    try {
      setIsGenerating(true);
      setIsLoading(false);
      setError(null);
      await matchingService.generateMatches(userId);
      const res = await matchingService.getMatches(userId);
      setMatches(dedup(res.matches || []));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate matches');
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredMatches = matches.filter(
    m => (m.scoreBreakdown?.total ?? m.score) >= filterScore
  );

  const getQuality = (s: number) =>
    s >= 75 ? 'Excellent' : s >= 60 ? 'Good' : s >= 40 ? 'Fair' : 'Low';
  const getScoreColor = (s: number) =>
    s >= 75 ? 'text-green-600' : s >= 60 ? 'text-orange-500' : s >= 40 ? 'text-yellow-500' : 'text-red-500';
  const getBorderColor = (s: number) =>
    s >= 75 ? 'border-l-green-500' : s >= 60 ? 'border-l-orange-400' : s >= 40 ? 'border-l-yellow-400' : 'border-l-red-400';
  const getBgColor = (s: number) =>
    s >= 75 ? 'bg-green-50' : s >= 60 ? 'bg-orange-50' : s >= 40 ? 'bg-yellow-50' : 'bg-gray-50';

  // ── PROFILE INCOMPLETE GATE ───────────────────────────────────────────────
  if (!profileComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-md max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Matchmaking Locked</h2>
          <p className="text-gray-600 mb-4">
            Complete your profile to unlock matchmaking and view potential matches.
          </p>
          <div className="bg-gray-100 rounded-lg p-3 mb-6">
            <div className="flex justify-between text-sm text-gray-700 mb-1">
              <span>Profile completion</span>
              <span className="font-bold">{profileCompletion}%</span>
            </div>
            <div className="h-2 bg-gray-300 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Required: profile photo, name, gender, caste, city, and profession.
          </p>
          <a
            href="/profile-wizard"
            className="block w-full py-3 px-6 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Complete My Profile
          </a>
        </div>
      </div>
    );
  }

  if (isLoading || isGenerating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-200 border-t-green-600 mx-auto" />
          <div>
            <p className="text-gray-800 font-semibold text-lg">
              {isGenerating ? 'Finding your matches...' : 'Loading matches...'}
            </p>
            {isGenerating && (
              <p className="text-gray-500 text-sm mt-1">Applying compatibility criteria from your profile</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Matches</h1>
            <p className="text-gray-500 mt-1">
              {filteredMatches.length} compatible profile{filteredMatches.length !== 1 ? 's' : ''} found
              {filterScore > 0 ? ` with score ≥ ${filterScore}` : ''}
            </p>
          </div>
          <button
            onClick={generateMatches}
            disabled={isGenerating}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            Refresh Matches
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <p className="font-medium">{error}</p>
            <button onClick={loadMatches} className="text-sm underline mt-1">Try again</button>
          </div>
        )}

        {/* Score filter */}
        {matches.length > 0 && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm font-medium text-gray-600 mb-3">Filter by compatibility score:</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'All', value: 0, active: 'bg-gray-700 text-white' },
                { label: 'Fair  40+', value: 40, active: 'bg-yellow-500 text-white' },
                { label: 'Good  60+', value: 60, active: 'bg-orange-500 text-white' },
                { label: 'Excellent  75+', value: 75, active: 'bg-green-600 text-white' },
              ].map(({ label, value, active }) => (
                <button
                  key={value}
                  onClick={() => setFilterScore(value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterScore === value ? active : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {filteredMatches.length === 0 && !error && (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {matches.length === 0 ? 'No matches found yet' : `No matches with score ≥ ${filterScore}`}
            </h3>
            <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
              {matches.length === 0
                ? 'Complete your profile wizard and await staff approval to start seeing matches.'
                : 'Lower the score filter to see more profiles.'}
            </p>
            {matches.length === 0 ? (
              <button onClick={generateMatches} className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium">
                Generate Matches
              </button>
            ) : (
              <button onClick={() => setFilterScore(0)} className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium">
                Show All Matches
              </button>
            )}
          </div>
        )}

        {/* Match cards */}
        <div className="space-y-5">
          {filteredMatches.map((match, idx) => {
            const score = match.scoreBreakdown?.total ?? match.score;
            const cardId = match._id || `${match.candidateId}-${idx}`;
            const isExpanded = expandedId === cardId;

            return (
              <div key={cardId} className={`bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 ${getBorderColor(score)} hover:shadow-md transition-shadow`}>

                {/* Header */}
                <div className={`p-6 ${getBgColor(score)}`}>
                  <div className="flex items-start gap-5">
                    <div className="shrink-0">
                      {match.candidate?.photo ? (
                        <img src={match.candidate.photo} alt={match.candidate.name}
                          crossOrigin={match.candidate.photo?.includes('cloudinary.com') ? 'anonymous' : undefined}
                          className="w-20 h-20 rounded-xl object-cover shadow-sm" />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-gray-200 flex items-center justify-center text-3xl text-gray-400">👤</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-gray-900">{match.candidate?.name || 'Profile'}</h3>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span>📅 Age: <strong>{match.candidate?.age || '—'}</strong></span>
                        <span>📍 <strong>{match.candidate?.city || '—'}</strong></span>
                        <span>💼 <strong>{match.candidate?.profession || '—'}</strong></span>
                        {match.candidate?.caste && <span>🏛️ <strong>{match.candidate.caste}</strong></span>}
                        {match.candidate?.education && <span>🎓 <strong>{match.candidate.education}</strong></span>}
                        {match.candidate?.height && <span>📏 <strong>{match.candidate.height}ft</strong></span>}
                      </div>
                    </div>

                    <div className="shrink-0 text-center">
                      <div className={`text-5xl font-black ${getScoreColor(score)}`}>{score}</div>
                      <div className="text-gray-400 text-xs mt-0.5">/100 pts</div>
                      <div className={`text-xs font-bold mt-1 ${getScoreColor(score)}`}>{getQuality(score)}</div>
                    </div>
                  </div>
                </div>

                {/* Score breakdown toggle */}
                {match.scoreBreakdown && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : cardId)}
                      className="w-full px-6 py-3 text-left flex items-center gap-2 text-green-700 font-medium text-sm hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                      <span>Compatibility Breakdown — 100-point scoring</span>
                    </button>
                    {isExpanded && (
                      <div className="px-6 pb-6">
                        <ScoreBreakdownPanel scoreBreakdown={match.scoreBreakdown} />
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="px-6 py-4 bg-white border-t border-gray-100 flex gap-3">
                  <button
                    onClick={() => setLocation(`/app/match-detail/${match.candidateId}`)}
                    className="flex-1 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium text-sm"
                  >
                    View Full Profile
                  </button>
                  <button
                    onClick={() => setLocation(`/app/send-proposal/${match.candidateId}`)}
                    className="flex-1 py-2.5 border-2 border-green-600 text-green-700 rounded-xl hover:bg-green-50 font-medium text-sm"
                  >
                    Send Proposal
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Matches;
