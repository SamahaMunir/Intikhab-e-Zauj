import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Copy, Trash2, Lock, Unlock } from 'lucide-react';

interface StaffMember {
  email: string;
  name: string;
  role: 'staff' | 'admin';
  status: 'active' | 'inactive' | 'invited';
  passwordSet: boolean;
  lastLogin?: string;
  createdAt: string;
}

export default function AdminPanel() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'staff' | 'admin'>('staff');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check if user is authenticated as admin
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');

    if (!user || !token) {
      setLocation('/staff-login');
      return;
    }

    const parsedUser = JSON.parse(user);
    if (parsedUser.role !== 'admin') {
      setLocation('/staff/dashboard');
      return;
    }

    fetchStaff();
  }, []);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('authToken');

  async function fetchStaff() {
    try {
      const response = await fetch(`${apiUrl}/api/staff/list`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setStaff(data.data);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
      setError('Failed to fetch staff list');
    }
  }

  async function inviteStaff(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/staff/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newEmail,
          name: newName,
          role: newRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to send invite');
        return;
      }

      setSuccess(`Invite link: ${data.inviteLink}`);
      setNewEmail('');
      setNewName('');
      fetchStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error sending invite');
    } finally {
      setLoading(false);
    }
  }

  async function deactivateStaff(email: string) {
    try {
      const response = await fetch(`${apiUrl}/api/staff/deactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        fetchStaff();
      }
    } catch (err) {
      console.error('Error deactivating:', err);
    }
  }

  async function activateStaff(email: string) {
    try {
      const response = await fetch(`${apiUrl}/api/staff/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        fetchStaff();
      }
    } catch (err) {
      console.error('Error activating:', err);
    }
  }

  async function removeStaff(email: string) {
    if (!confirm(`Remove ${email}?`)) return;

    try {
      const response = await fetch(`${apiUrl}/api/staff/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        fetchStaff();
      }
    } catch (err) {
      console.error('Error removing:', err);
    }
  }

  async function resendInvite(email: string) {
    try {
      const response = await fetch(`${apiUrl}/api/staff/resend-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Resent invite: ${data.inviteLink}`);
        setCopiedLink(data.inviteLink);
      }
    } catch (err) {
      console.error('Error resending:', err);
    }
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Staff Management</h1>
        <p className="text-muted-foreground">Invite and manage staff members</p>
      </div>

      {/* Invite New Staff */}
      <Card>
        <CardHeader>
          <CardTitle>Invite New Staff Member</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={inviteStaff} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="staff@example.com"
                  required
                />
              </div>
              <div>
                <Label>Name</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full name"
                  required
                />
              </div>
            </div>
            <div>
              <Label>Role</Label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'staff' | 'admin')}
                className="w-full border rounded p-2"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {error && (
              <div className="flex gap-2 text-sm text-red-600 bg-red-50 p-3 rounded">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 p-3 rounded space-y-2">
                <p className="text-sm text-green-600 font-semibold">✓ Invite sent!</p>
                <div className="flex gap-2">
                  <code className="bg-white p-2 rounded text-xs flex-1 overflow-auto">
                    {success.replace('Invite link: ', '')}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => copyLink(success.replace('Invite link: ', ''))}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Sending...' : 'Send Invite'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Members ({staff.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {staff.map((member) => (
              <div
                key={member.email}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Role: {member.role} | Status: {member.status}
                    {!member.passwordSet && ' (pending setup)'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {member.status === 'invited' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resendInvite(member.email)}
                    >
                      Resend
                    </Button>
                  )}
                  {member.status === 'active' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deactivateStaff(member.email)}
                    >
                      <Lock className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => activateStaff(member.email)}
                    >
                      <Unlock className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeStaff(member.email)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}