import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle, CheckCircle2, Clock, LogOut, Loader2 } from 'lucide-react';

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      setLocation('/user-login');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
    } catch (error) {
      console.error('Failed to parse user data:', error);
      setLocation('/user-login');
    } finally {
      setLoading(false);
    }
  }, [setLocation]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setLocation('/user-login');
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      alert('Please enter your password');
      return;
    }

    setDeleting(true);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      const response = await fetch(`${apiUrl}/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete account');
      }

      alert('✅ Your account has been permanently deleted');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setLocation('/quick-register');
    } catch (error) {
      alert(`❌ ${error instanceof Error ? error.message : 'Error deleting account'}`);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-100 to-purple-100">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-100 to-purple-100">
        <Card className="w-full max-w-md">
          <CardContent className="pt-12 pb-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <p className="text-lg font-semibold">Not Authenticated</p>
            <p className="text-muted-foreground mb-4">Please login to continue</p>
            <Button onClick={() => setLocation('/user-login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profileComplete = user.profileCompletion === 100;
  const paymentComplete = user.paymentStatus === 'completed';

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-100 to-purple-100 p-4 py-12">
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

        {/* Danger Zone */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Once deleted, your account cannot be recovered. All data will be permanently removed.
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              🗑️ Delete My Account
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Your account and all data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Enter your password to confirm"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              disabled={deleting}
            />
          </div>

          <div className="flex gap-3">
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleting || !deletePassword}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Yes, Delete My Account'
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}