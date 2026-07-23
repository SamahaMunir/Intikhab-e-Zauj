import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { getToken, getStoredUser } from '@/lib/auth';
import { AlertCircle, Copy, Trash2, Lock, Unlock, Users, UserCheck, MailPlus, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    // Check if user is authenticated as admin — read from the STAFF realm
    // (staff_user / staff_token), not the applicant realm.
    const user = getStoredUser<{ role?: string }>('staff');
    const token = getToken('staff');

    if (!user || !token) {
      setLocation('/staff-login');
      return;
    }

    if (user.role !== 'admin') {
      setLocation('/staff/dashboard');
      return;
    }

    fetchStaff();
  }, []);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = getToken('staff');
  const currentEmail = getStoredUser<{ email?: string }>('staff')?.email;

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

  const counts = {
    total:    staff.length,
    active:   staff.filter(s => s.status === 'active').length,
    invited:  staff.filter(s => s.status === 'invited').length,
  };

  // Active admin count — used to protect the last admin from removal/deactivation.
  const activeAdminCount = staff.filter(s => s.role === 'admin' && s.status === 'active').length;

  const inputCls =
    'w-full h-11 px-4 rounded-xl bg-muted border border-border text-sm text-foreground ' +
    'placeholder-muted-foreground focus:outline-none focus:border-primary focus:bg-background transition-colors';
  const labelCls = 'block text-sm font-semibold text-foreground mb-1.5';

  const statusPill = (status: StaffMember['status']) => {
    const map = {
      active:   'bg-primary/10 text-primary',
      invited:  'bg-sky-500/10 text-sky-600',
      inactive: 'bg-muted text-muted-foreground',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${map[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-7">

      {/* ── Stat chips ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Staff', value: counts.total,   icon: Users,     grad: 'from-primary/5',    ring: 'bg-primary'    },
          { label: 'Active',      value: counts.active,  icon: UserCheck, grad: 'from-sky-500/5',    ring: 'bg-sky-500'    },
          { label: 'Invited',     value: counts.invited, icon: MailPlus,  grad: 'from-amber-500/5',  ring: 'bg-amber-500'  },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label}
                 className={`relative overflow-hidden rounded-2xl border border-border shadow-sm
                             p-5 bg-linear-to-br ${s.grad} to-card`}>
              <div className={`w-10 h-10 rounded-full ${s.ring} flex items-center justify-center mb-4 shadow-sm`}>
                <Icon className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <div className="text-sm font-medium text-muted-foreground">{s.label}</div>
              <div className="text-3xl font-bold text-foreground mt-0.5">{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* ── Invite form ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invite New Staff Member</CardTitle>
        </CardHeader>
        <CardContent>
        <form onSubmit={inviteStaff} className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={newEmail} required
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="staff@example.com" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Name</label>
              <input value={newName} required
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full name" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Role</label>
              <select value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'staff' | 'admin')}
                className={inputCls + ' cursor-pointer'}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="flex gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {success && (
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl space-y-2">
              <p className="text-sm text-primary font-bold">✓ Invite sent!</p>
              <div className="flex gap-2">
                <code className="bg-background border border-border p-2.5 rounded-lg text-xs flex-1 overflow-auto">
                  {success.replace('Invite link: ', '')}
                </code>
                <Button type="button" variant="outline" size="icon"
                  onClick={() => copyLink(success.replace('Invite link: ', ''))}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <Button type="submit" disabled={loading} size="lg" className="rounded-xl">
            <Send className="w-4 h-4" />
            {loading ? 'Sending…' : 'Send Invite'}
          </Button>
        </form>
        </CardContent>
      </Card>

      {/* ── Staff list ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Staff Members <span className="text-muted-foreground font-medium">({staff.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
        {staff.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">No staff members yet.</p>
        ) : (
          <div className="space-y-3">
            {staff.map((member) => {
              const isSelf = member.email === currentEmail;
              // Protect the last active admin (and never let an admin act on self).
              const lastActiveAdmin = member.role === 'admin' && member.status === 'active' && activeAdminCount <= 1;
              const canModify = !isSelf && !lastActiveAdmin;
              return (
              <div key={member.email}
                className="flex items-center gap-4 p-4 rounded-xl border border-border
                           hover:border-primary/30 hover:shadow-sm transition-all">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center
                                justify-center text-base font-bold shrink-0">
                  {member.name?.charAt(0).toUpperCase() || '?'}
                </div>
                {/* Identity */}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground truncate">{member.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                </div>
                {/* Badges */}
                <div className="hidden sm:flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">{member.role}</Badge>
                  {statusPill(member.status)}
                  {!member.passwordSet && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600">
                      pending setup
                    </span>
                  )}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {member.status === 'invited' && (
                    <Button onClick={() => resendInvite(member.email)} variant="outline" size="sm" className="h-9">
                      Resend
                    </Button>
                  )}
                  {member.status === 'active'
                    ? canModify && (
                      <Button onClick={() => deactivateStaff(member.email)} title="Deactivate"
                        variant="outline" size="icon">
                        <Lock className="w-4 h-4" />
                      </Button>
                    )
                    : !isSelf && (
                      <Button onClick={() => activateStaff(member.email)} title="Activate"
                        variant="outline" size="icon" className="text-primary">
                        <Unlock className="w-4 h-4" />
                      </Button>
                    )}
                  {canModify && (
                    <Button onClick={() => removeStaff(member.email)} title="Remove"
                      variant="destructive" size="icon">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
}