import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Clock, LogOut } from 'lucide-react';

interface User {
  _id: string;
  email: string;
  name: string;
  profileCompletion: number;
  paymentStatus: 'pending' | 'completed';
}

export default function ApplicantDashboard() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      setLocation('/quick-register');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
    } catch (error) {
      console.error('Failed to parse user data:', error);
      setLocation('/quick-register');
    } finally {
      setLoading(false);
    }
  }, [setLocation]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setLocation('/quick-register');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Not authenticated</div>;
  }

  const profileComplete = user.profileCompletion === 100;
  const paymentComplete = user.paymentStatus === 'completed';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 p-4 py-12">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-serif">Welcome, {user.name}!</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Status Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Profile Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {profileComplete ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Profile Complete
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5 text-yellow-600" />
                    Profile Pending
                  </>
                )}
              </CardTitle>
              <CardDescription>Profile Status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${user.profileCompletion}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Completion: {user.profileCompletion}%
              </p>
              {!profileComplete && (
                <Button
                  onClick={() => setLocation('/app/profile-wizard')}
                  className="w-full"
                >
                  Complete Profile
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {paymentComplete ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Payment Completed
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5 text-yellow-600" />
                    Payment Pending
                  </>
                )}
              </CardTitle>
              <CardDescription>Payment Status - 4000 PKR</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {paymentComplete
                  ? '✅ Full access granted'
                  : '⏳ Complete payment to unlock features'}
              </p>
              {!paymentComplete && profileComplete && (
                <Button
                  onClick={() => setLocation('/app/payment')}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Proceed to Payment
                </Button>
              )}
              {!profileComplete && (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Complete your profile first
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        {profileComplete && paymentComplete && (
          <Card>
            <CardHeader>
              <CardTitle>🎯 Available Features</CardTitle>
              <CardDescription>You now have full access to:</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                👥 Browse Matches
              </Button>
              <Button variant="outline" className="w-full justify-start">
                💬 Send Messages
              </Button>
              <Button variant="outline" className="w-full justify-start">
                💌 View Proposals
              </Button>
              <Button variant="outline" className="w-full justify-start">
                ⚙️ Manage Profile
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}