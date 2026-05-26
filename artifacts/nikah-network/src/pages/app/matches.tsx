import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

import MatchingService  from '../../services/matchingService';

export default function Matches() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const storedUser = localStorage.getItem('user');
  const userId = storedUser ? JSON.parse(storedUser)?._id : null;

  useEffect(() => {
   const loadMatches = async () => {
  try {
    let res = await MatchingService.getMatches(userId);

    // Auto-generate if no matches exist yet
    if (res.total === 0) {
      console.log('No matches — generating...');
      await MatchingService.generateMatches(userId);
      res = await MatchingService.getMatches(userId);
    }

    console.log('✅ Matches:', res);
    setMatches(res.matches);
  } catch (e) {
    console.error('❌ Error loading matches:', e);
  }
};

    loadMatches();
  }, [userId]);

  if (loading) {
    return <div className="text-center py-12">Loading matches...</div>;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-red-500">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif font-bold">Suggested Matches</h1>

      {matches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No matches found yet. Check back soon!
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map(match => {
            const candidate = match.candidate || {};

            return (
              <Card key={match._id} className="hover-elevate">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    {candidate.name || 'Match'}
                    <Badge className="bg-green-500">{match.score}%</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p>{candidate.age} years • {candidate.city}</p>
                    <p>{candidate.education}</p>
                  </div>

                  {/* SCORE BREAKDOWN */}
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <p className="font-semibold mb-2">Compatibility:</p>
                    {match.breakdown && (
                      <div className="space-y-1 text-xs">
                        {Object.entries(match.breakdown).map(
                          ([key, value]) => {
                            const score = typeof value === 'number' ? value : 0;

                            return score > 0 ? (
                              <div key={key} className="flex justify-between">
                                <span className="capitalize">{key}</span>
                                <span className="font-mono">{score}/15</span>
                              </div>
                            ) : null;
                          }
                        )}
                      </div>
                    )}
                  </div>

                  <Link href={`/app/match/${match._id}`}>
                    <Button className="w-full">View Profile</Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}