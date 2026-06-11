import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  AlertCircle, CheckCircle2, Clock, Loader2, CreditCard, UserCircle,
  Heart, MessageSquare, ArrowRight, Trash2,
} from 'lucide-react';

interface User {
  _id: string;
  email: string;
  name: string;
  profileCompletion: number;
  paymentStatus: 'pending' | 'completed';
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ApplicantDashboard() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) { setLocation('/user-login'); return; }
    try {
      setUser(JSON.parse(userStr));
    } catch {
      setLocation('/user-login');
    } finally {
      setLoading(false);
    }
  }, [setLocation]);

  const handleDeleteAccount = async () => {
    if (!deletePassword) { alert('Please enter your password'); return; }
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/auth/delete-account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete account');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setLocation('/');
    } catch (error) {
      alert(`${error instanceof Error ? error.message : 'Error deleting account'}`);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-[#10B981]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm
                      p-12 text-center mt-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-lg font-bold text-[#1C1917]">Not Authenticated</p>
        <p className="text-gray-500 mb-5">Please login to continue</p>
        <Button onClick={() => setLocation('/user-login')}
          className="bg-[#10B981] hover:bg-[#059669]">Go to Login</Button>
      </div>
    );
  }

  const profileComplete = user.profileCompletion === 100;
  const paymentComplete = user.paymentStatus === 'completed';

  const features = [
    { label: 'Browse Matches',  icon: Heart,        to: '/app/matches'   },
    { label: 'View Proposals',  icon: MessageSquare,to: '/app/proposals' },
    { label: 'Manage Profile',  icon: UserCircle,   to: '/app/profile'   },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-7">

      {/* ── Status cards ── */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Profile */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              profileComplete ? 'bg-emerald-50 text-[#10B981]' : 'bg-amber-50 text-[#D97706]'
            }`}>
              {profileComplete ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1C1917]">
                {profileComplete ? 'Profile Complete' : 'Profile Pending'}
              </h3>
              <p className="text-sm text-gray-400">Profile Status</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
            <div className="bg-[#10B981] h-2 rounded-full transition-all"
                 style={{ width: `${user.profileCompletion}%` }} />
          </div>
          <p className="text-sm text-gray-500 mb-4">Completion: {user.profileCompletion}%</p>
          {!profileComplete && (
            <Button onClick={() => setLocation('/app/profile-wizard')}
              className="w-full bg-[#10B981] hover:bg-[#059669]">
              Complete Profile
            </Button>
          )}
        </div>

        {/* Payment */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              paymentComplete ? 'bg-emerald-50 text-[#10B981]' : 'bg-amber-50 text-[#D97706]'
            }`}>
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1C1917]">
                {paymentComplete ? 'Payment Completed' : 'Payment Pending'}
              </h3>
              <p className="text-sm text-gray-400">Subscription — PKR 4,000</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            {paymentComplete ? 'Full access granted.' : 'Complete payment to unlock all features.'}
          </p>
          {!paymentComplete && profileComplete && (
            <Button onClick={() => setLocation('/app/payment')}
              className="w-full bg-[#10B981] hover:bg-[#059669]">
              Proceed to Payment
            </Button>
          )}
          {!profileComplete && (
            <div className="flex items-center gap-2 text-sm text-[#D97706] bg-amber-50
                            border border-amber-100 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Complete your profile first
            </div>
          )}
        </div>
      </div>

      {/* ── Features ── */}
      {profileComplete && paymentComplete && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-[#1C1917] mb-1">Available Features</h2>
          <p className="text-sm text-gray-500 mb-5">You now have full access.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {features.map(f => {
              const Icon = f.icon;
              return (
                <button key={f.label} onClick={() => setLocation(f.to)}
                  className="flex items-center gap-3 p-4 rounded-xl border border-gray-100
                             hover:border-[#10B981] hover:bg-emerald-50 transition-colors text-left group">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <span className="text-sm font-semibold text-[#1C1917] flex-1">{f.label}</span>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#10B981]" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Danger zone ── */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-red-600 mb-1">Danger Zone</h2>
        <p className="text-sm text-gray-500 mb-4">
          Once deleted, your account cannot be recovered. All data is permanently removed.
        </p>
        <button onClick={() => setShowDeleteDialog(true)}
          className="flex items-center gap-2 h-11 px-5 rounded-xl bg-red-50 text-red-600
                     hover:bg-red-100 text-sm font-bold transition-colors">
          <Trash2 className="w-4 h-4" />
          Delete My Account
        </button>
      </div>

      {/* Delete dialog */}
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
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
              ) : 'Yes, Delete My Account'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
