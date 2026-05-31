import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import matchingService from '../../services/matchingService';

interface Match {
  _id: string;
  candidateId: string;
  score: number;
  scoreBreakdown?: {
    caste: number;
    profession: number;
    ageGap: number;
    city: number;
    height: number;
    houseStatus: number;
    houseArea: number;
    total: number;
  };
  candidate?: {
    _id: string;
    name: string;
    age: number;
    city: string;
    profession: string;
    photo?: string;
    gender: string;
  };
}

const Matches: React.FC = () => {
  const [, setLocation] = useLocation();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const userId = user?._id;

  useEffect(() => {
    if (!userId) {
      setError('User not authenticated');
      setIsLoading(false);
      return;
    }

    loadMatches();
  }, [userId]);

  const loadMatches = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let res = await matchingService.getMatches(userId);

      if (res.total === 0) {
        console.log('No matches — generating...');
        await matchingService.generateMatches(userId);
        res = await matchingService.getMatches(userId);
      }

      console.log('✅ Matches:', res);
      setMatches(res.matches || []);
    } catch (e) {
      console.error('❌ Error loading matches:', e);
      setError(e instanceof Error ? e.message : 'Failed to load matches');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Matches</h1>
          <p className="text-gray-600">
            {matches.length} compatible profile{matches.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* No Matches */}
        {matches.length === 0 && !error && (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600 mb-4">No matches found yet.</p>
            <button
              onClick={loadMatches}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Matches Grid */}
        <div className="space-y-6">
          {matches.map((match) => (
            <div
              key={match._id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Match Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between gap-4">
                  {/* Profile Info */}
                  <div className="flex-1 flex gap-4">
                    {/* Photo */}
                    {match.candidate?.photo ? (
                      <img
                        src={match.candidate.photo}
                        alt={match.candidate.name}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-gray-300 flex items-center justify-center">
                        <span className="text-gray-500">No Photo</span>
                      </div>
                    )}

                    {/* Details */}
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {match.candidate?.name || 'Profile'}
                      </h3>
                      <div className="text-gray-600 text-sm space-y-1 mt-2">
                        <p>
                          📅 Age: <strong>{match.candidate?.age}</strong>
                        </p>
                        <p>
                          📍 City: <strong>{match.candidate?.city}</strong>
                        </p>
                        <p>
                          💼 Profession: <strong>{match.candidate?.profession}</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Score Badge */}
                  <div className="text-center">
                    <div
                      className={`text-4xl font-bold ${
                        match.score >= 75
                          ? 'text-green-600'
                          : match.score >= 60
                          ? 'text-orange-600'
                          : 'text-red-600'
                      }`}
                    >
                      {match.score}
                    </div>
                    <p className="text-gray-600 text-sm">Match Score</p>
                  </div>
                </div>
              </div>

              {/* Score Breakdown */}
              {match.scoreBreakdown && (
                <div className="p-6 bg-gray-50">
                  <button
                    onClick={() =>
                      setExpandedMatch(
                        expandedMatch === match._id ? null : match._id
                      )
                    }
                    className="flex items-center gap-2 text-green-600 font-medium hover:text-green-700 mb-4"
                  >
                    <span>
                      {expandedMatch === match._id
                        ? '▼ Hide Score Breakdown'
                        : '▶ View Score Breakdown'}
                    </span>
                  </button>

                  {expandedMatch === match._id && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {Object.entries(match.scoreBreakdown).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between rounded-md bg-white px-3 py-2">
                          <span className="capitalize text-gray-600">{key}</span>
                          <strong>{value}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="p-6 bg-white border-t border-gray-200 flex gap-4">
                <button
                  onClick={() =>
                    setLocation(`/app/match-detail/${match.candidateId}`)
                  }
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  View Full Profile
                </button>
                <button
                  onClick={() =>
                    setLocation(`/app/send-proposal/${match.candidateId}`)
                  }
                  className="flex-1 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 font-medium"
                >
                  Send Proposal
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Refresh Button */}
        {matches.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={loadMatches}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Refresh Matches
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Matches;
