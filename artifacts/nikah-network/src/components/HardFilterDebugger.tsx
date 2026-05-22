import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import matchingService from '@/services/matchingService';

export default function HardFilterDebugger() {
  const [userId, setUserId] = useState('');
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleDebug = async () => {
    try {
      setLoading(true);
      const data = await matchingService.getDebugInfo(userId);
      setDebugData(data);
    } catch (error) {
      console.error('Debug error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Hard Filter Debugger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="text"
            placeholder="Enter User ID"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <button
            onClick={handleDebug}
            disabled={loading}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            {loading ? 'Analyzing...' : 'Analyze Filters'}
          </button>
        </CardContent>
      </Card>

      {debugData && (
        <Card>
          <CardHeader>
            <CardTitle>{debugData.user?.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {debugData.passed}
                </p>
                <p className="text-sm text-muted-foreground">Passed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {debugData.rejected}
                </p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{debugData.passRate}</p>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
              </div>
            </div>

            {debugData.rejectionReasons && Object.keys(debugData.rejectionReasons).length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Rejection Reasons:</h4>
                {Object.entries(debugData.rejectionReasons).map(([reason, count]) => {
                  const total = typeof count === 'number' ? count : Number(count) || 0;

                  return (
                    <div key={reason} className="flex justify-between text-sm">
                      <span>{reason}</span>
                      <span className="font-mono">{total} users</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}