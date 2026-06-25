import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getToken } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { ProfileView } from '@/components/ProfileView';

interface PendingProfile {
  _id: string;
  name: string;
  phone: string;
  email: string;
  gender: string;
  dob: string;
  city: string;
  caste?: string;
  education: string;
  profession: string;
  designation?: string;
  monthlyIncome?: string;
  height?: string;
  religion?: string;
  sect?: string;
  cnic?: string;
  bio?: string;
  fatherName?: string;
  fatherOccupation?: string;
  motherName?: string;
  motherOccupation?: string;
  numBrothers?: number;
  numSisters?: number;
  houseStatus?: string;
  houseArea?: string;
  matchCriteria?: string;
  photo?: string;
  notes?: string;
  source?: string;
  enteredBy?: string;
  enteredAt?: string;
  createdAt: string;
}

export default function ProfileApproval() {
  const [profiles, setProfiles] = useState<PendingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPendingProfiles();
  }, []);

  const fetchPendingProfiles = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const token = getToken('staff');

      if (!token) {
        alert('⚠️ Not authenticated! Please login.');
        return;
      }
      
      // ✅ CORRECT ENDPOINT - use the profiles.ts route
      const response = await fetch(`${apiUrl}/api/staff/profiles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Fetched profiles:', data);
      
      // ✅ Filter for pending profiles on frontend
      const pendingProfiles = (data.data || []).filter((p: any) => p.profileStatus === 'pending');
      setProfiles(pendingProfiles);
    } catch (error) {
      console.error('❌ Error fetching profiles:', error);
      alert(`Failed to fetch profiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!profiles[currentIndex]) return;

    setActionLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const token = getToken('staff');

      if (!token) {
        throw new Error('No authentication token');
      }

      const profileId = profiles[currentIndex]._id;
      console.log(`📝 Approving profile: ${profileId}`);
      
      // ✅ CORRECT ENDPOINT
      const response = await fetch(`${apiUrl}/api/staff/profiles/${profileId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: 'Approved by staff',
        }),
      });

      console.log(`Response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Profile approved:', data);
      
      alert(`✅ Profile approved!\n${data.emailSent ? '📧 Email sent to user' : '⚠️ Email not sent'}`);
      
      // Move to next profile
      setCurrentIndex(prev => prev + 1);
      setRejectionReason('');
    } catch (error) {
      console.error('❌ Error approving profile:', error);
      alert(`Failed to approve profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!profiles[currentIndex] || !rejectionReason.trim()) return;

    setActionLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const token = getToken('staff');

      if (!token) {
        throw new Error('No authentication token');
      }

      const profileId = profiles[currentIndex]._id;
      console.log(`📝 Rejecting profile: ${profileId}`);
      
      // ✅ CORRECT ENDPOINT
      const response = await fetch(`${apiUrl}/api/staff/profiles/${profileId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: rejectionReason,
        }),
      });

      console.log(`Response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Profile rejected:', data);
      
      alert(`✅ Profile rejected!\n${data.emailSent ? '📧 Email sent to user' : '⚠️ Email not sent'}`);
      
      setCurrentIndex(prev => prev + 1);
      setRejectionReason('');
    } catch (error) {
      console.error('❌ Error rejecting profile:', error);
      alert(`Failed to reject profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold">All Caught Up!</h2>
        <p className="text-muted-foreground mt-2">No pending profiles to review</p>
      </div>
    );
  }

  if (currentIndex >= profiles.length) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Review Complete!</h2>
        <p className="text-muted-foreground mt-2">You've reviewed all pending profiles</p>
        <Button onClick={() => {
          setCurrentIndex(0);
          fetchPendingProfiles();
        }} className="mt-4">Refresh Profiles</Button>
      </div>
    );
  }

  const profile = profiles[currentIndex];

  return (
    <div className="space-y-6 pb-10">
      {/* Progress header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile Review</h1>
          <p className="text-gray-500 text-sm mt-1">
            {currentIndex + 1} of {profiles.length} pending profiles
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Progress</p>
          <p className="text-2xl font-bold text-green-600">
            {Math.round(((currentIndex + 1) / profiles.length) * 100)}%
          </p>
        </div>
      </div>

      {/* Full profile — identical layout to user-facing /app/profile */}
      <ProfileView
        profile={profile}
        maskCnic={false}
        footer={
          <div className="space-y-4 mt-2">
            {/* Rejection reason */}
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-sm text-red-700">Rejection Reason</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Required when rejecting — will be emailed to applicant"
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Approve / Reject actions */}
            <div className="flex gap-4 justify-between">
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
                size="lg"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject Profile
              </Button>
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" />Approve Profile</>
                )}
              </Button>
            </div>
          </div>
        }
      />
    </div>
  );
}