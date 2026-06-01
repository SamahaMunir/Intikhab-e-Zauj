import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, CheckCircle2, LogOut, BarChart3 } from 'lucide-react';

export default function StaffDashboard() {
  const [, setLocation] = useLocation();
  const [matchStats, setMatchStats] = useState({ total: 0, suggested: 0, approved: 0 });

  useEffect(() => {
    const tok = localStorage.getItem('token') || '';
    fetch('http://localhost:5000/api/staff/matches/all', {
      headers: { Authorization: `Bearer ${tok}` },
    })
      .then(r => r.json())
      .then(d => {
        const all: any[] = d.matches || [];
        setMatchStats({
          total: all.length,
          suggested: all.filter(m => m.status === 'suggested').length,
          approved: all.filter(m => m.status === 'approved').length,
        });
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    alert('✅ Logged out successfully');
    setLocation('/staff-login');
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Staff Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome, <strong>{user.name || 'Staff'}</strong></p>
            <p className="text-sm text-gray-500 mt-1">Role: <span className="font-semibold capitalize">{user.role}</span></p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Data Entry */}
          <Card className="hover:shadow-lg transition-shadow border-purple-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center text-purple-900">
                <Plus className="w-5 h-5 mr-2 text-purple-600" />
                Offline Data Entry
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Create new user profiles from offline sources (WhatsApp, paper forms, etc.)
              </p>
              <Button 
                onClick={() => setLocation('/staff/data-entry')}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                Start Data Entry
              </Button>
            </CardContent>
          </Card>

          {/* Profile Approval */}
          <Card className="hover:shadow-lg transition-shadow border-green-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center text-green-900">
                <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" />
                Profile Approvals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Review and approve pending profiles submitted by applicants
              </p>
              <Button
                onClick={() => setLocation('/staff/profile-approval')}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Review Profiles
              </Button>
            </CardContent>
          </Card>

          {/* AI Match Suggestions */}
          <Card className="hover:shadow-lg transition-shadow border-blue-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-900">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                AI Match Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Review AI-generated compatibility matches before applicants see them.
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-yellow-50 rounded-lg p-2">
                  <div className="text-xl font-bold text-yellow-700">{matchStats.suggested}</div>
                  <div className="text-xs text-yellow-600">Pending</div>
                </div>
                <div className="bg-green-50 rounded-lg p-2">
                  <div className="text-xl font-bold text-green-700">{matchStats.approved}</div>
                  <div className="text-xs text-green-600">Approved</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xl font-bold text-gray-700">{matchStats.total}</div>
                  <div className="text-xs text-gray-600">Total</div>
                </div>
              </div>
              <Button
                onClick={() => setLocation('/staff/matches')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Review Matches
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 mb-3">📋 Complete Workflow:</h3>
            <ol className="text-sm text-blue-800 space-y-2">
              <li><strong>1. Data Entry:</strong> Create user profiles from offline sources (WhatsApp, paper forms)</li>
              <li><strong>2. Profile Creation:</strong> Profile saved with "pending" status</li>
              <li><strong>3. Approval Review:</strong> Review pending profiles and approve/reject with reason</li>
              <li><strong>4. Email Notification:</strong> User receives approval/rejection email automatically</li>
              <li><strong>5. Activation:</strong> Approved profiles appear in applicant list</li>
              <li><strong>6. Dashboard Access:</strong> Approved users can login and browse matches</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}