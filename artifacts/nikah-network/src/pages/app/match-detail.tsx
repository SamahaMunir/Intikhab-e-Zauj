import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import matchingService from '@/services/matchingService';

export default function MatchDetail() {
  const { id } = useParams();
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMatch = async () => {
      try {
        if (!id) return;
        const data = await matchingService.getMatchDetails(id);
        setMatch(data);
      } catch (error) {
        console.error('Failed to load match:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMatch();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!match) return <div>Match not found</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Match Score: {match.score}%</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* FULL BREAKDOWN */}
          <div>
            <h3 className="font-semibold mb-2">Compatibility Breakdown:</h3>
            {match.breakdown && (
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(match.breakdown).map(([key, value]) => (
                    <tr key={key} className="border-b">
                      <td className="py-2 capitalize">{key}</td>
                      <td className="py-2 text-right">{value as number}/15</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}