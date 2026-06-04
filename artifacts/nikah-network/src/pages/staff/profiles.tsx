import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface Profile {
  _id: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  city: string;
  education: string;
  profession: string;
  profileStatus: 'pending' | 'approved' | 'rejected';
  photo?: string;
  notes?: string;
  enteredBy?: string;
  createdAt: string;
}

export default function StaffProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // 📥 FETCH PROFILES FROM BACKEND
  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');

      if (!token) {
        alert('⚠️ Not authenticated! Please login.');
        return;
      }

      console.log('📥 Fetching profiles from backend...');

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

      // Set all profiles (pending + approved + rejected)
      setProfiles(data.data || []);
    } catch (error) {
      console.error('❌ Error fetching profiles:', error);
      alert(`Failed to fetch profiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (profile: Profile) => {
    setSelectedProfile(profile);
    setAction('approve');
    setReason('');
  };

  const handleReject = (profile: Profile) => {
    setSelectedProfile(profile);
    setAction('reject');
    setReason('');
  };

  const submitAction = async () => {
    if (!selectedProfile || !action) return;

    setActionLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token');
      }

      const endpoint = action === 'approve'
        ? `${apiUrl}/api/staff/profiles/${selectedProfile._id}/approve`
        : `${apiUrl}/api/staff/profiles/${selectedProfile._id}/reject`;

      console.log(`📝 ${action === 'approve' ? 'Approving' : 'Rejecting'} profile: ${selectedProfile._id}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: action === 'reject' ? reason : 'Approved by staff' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process profile');
      }

      const data = await response.json();
      console.log('✅ Action completed:', data);

      alert(`✅ Profile ${action === 'approve' ? 'approved' : 'rejected'}!${data.emailSent ? '\n📧 Email sent to user' : ''}`);

      // Refresh profiles list
      await fetchProfiles();

      // Close dialog
      setSelectedProfile(null);
      setAction(null);
      setReason('');
    } catch (error) {
      console.error('❌ Error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold">Applicant Profiles</h1>
          <p className="text-muted-foreground">Review and manage all registered applicants.</p>
          <p className="text-sm text-blue-600 mt-2">📊 Total profiles: <strong>{profiles.length}</strong></p>
        </div>
        <Button onClick={fetchProfiles} variant="outline">
          🔄 Refresh
        </Button>
      </div>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-muted-foreground">No profiles found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Profession</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map(profile => (
                  <TableRow key={profile._id}>
                    <TableCell>
                      {profile.photo ? (
                        <img src={profile.photo} alt={profile.name}
                          className="w-9 h-9 rounded-full object-cover border border-gray-200"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">?</div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>{profile.name}</div>
                      <div className="text-xs text-muted-foreground">{profile.email}</div>
                    </TableCell>
                    <TableCell className="capitalize">{profile.gender}</TableCell>
                    <TableCell>{profile.city}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{profile.profession}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          profile.profileStatus === 'approved'
                            ? 'default'
                            : profile.profileStatus === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="capitalize"
                      >
                        {profile.profileStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {profile.profileStatus === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(profile)}
                            className="bg-green-50 hover:bg-green-100"
                          >
                            ✅ Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(profile)}
                            className="bg-red-50 hover:bg-red-100"
                          >
                            ❌ Reject
                          </Button>
                        </>
                      )}
                      <Link href={`/staff/profiles/${profile._id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Approval/Rejection Dialog */}
      <Dialog open={action !== null} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? '✅ Approve Profile' : '❌ Reject Profile'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p>
              <strong>User:</strong> {selectedProfile?.name}
            </p>
            <p>
              <strong>Email:</strong> {selectedProfile?.email}
            </p>

            {action === 'reject' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Rejection Reason
                </label>
                <Textarea
                  placeholder="Explain why the profile was rejected..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-24"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAction(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={submitAction}
              disabled={actionLoading || (action === 'reject' && !reason.trim())}
              className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {actionLoading
                ? 'Processing...'
                : action === 'approve'
                ? 'Approve'
                : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}