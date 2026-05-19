import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Mail, Phone, MapPin } from 'lucide-react';

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user from localStorage
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!savedUser || !token) {
      // Not authenticated, redirect to login
      setLocation('/login');
      return;
    }

    setUser(JSON.parse(savedUser));
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    alert('✅ Logged out successfully');
    setLocation('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Welcome, {user?.name}! 👋</h1>
            <p className="text-muted-foreground mt-2">Your Intikhab-e-Zauj Dashboard</p>
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

        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <User className="w-5 h-5 text-blue-600 mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-semibold text-lg">{user?.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Mail className="w-5 h-5 text-blue-600 mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-semibold text-lg">{user?.email}</p>
                  <Badge className="mt-2 bg-green-100 text-green-800">
                    ✅ Verified
                  </Badge>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Phone className="w-5 h-5 text-blue-600 mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-semibold text-lg">{user?.phone || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <MapPin className="w-5 h-5 text-blue-600 mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="font-semibold text-lg capitalize">{user?.role}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-semibold text-lg">📝 Complete Your Profile</h3>
              <p className="text-sm text-muted-foreground">
                Add photos, education, profession, and preferences to find better matches.
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Go to Profile
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-semibold text-lg">💑 View Suggested Matches</h3>
              <p className="text-sm text-muted-foreground">
                Explore profiles that match your preferences and interests.
              </p>
              <Button className="w-full bg-green-600 hover:bg-green-700">
                View Matches
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Status Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">🎯 Your Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span>Email Verified:</span>
                <Badge className="bg-green-100 text-green-800">✅ Yes</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Profile Status:</span>
                <Badge className="bg-yellow-100 text-yellow-800">🔄 Pending Approval</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Profile Completion:</span>
                <Badge>10%</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              ℹ️ Your profile is under review by our team. This usually takes 1-2 business days.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
