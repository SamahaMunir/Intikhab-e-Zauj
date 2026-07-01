import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { getToken, getStoredUser } from '@/lib/auth';
import { AlertCircle, Copy, Trash2, Lock, Unlock, Users, UserCheck, MailPlus, Send } from 'lucide-react';

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
    'w-full h-11 px-4 rounded-xl bg-[#F4F6F5] border border-gray-200 text-sm text-[#1C1917] ' +
    'placeholder-gray-400 focus:outline-none focus:border-[#10B981] focus:bg-white transition-colors';
  const labelCls = 'block text-sm font-semibold text-[#1C1917] mb-1.5';

  const statusPill = (status: StaffMember['status']) => {
    const map = {
      active:   'bg-emerald-50 text-[#10B981]',
      invited:  'bg-sky-50 text-sky-600',
      inactive: 'bg-gray-100 text-gray-500',
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
          { label: 'Total Staff', value: counts.total,   icon: Users,     grad: 'from-emerald-50', ring: 'bg-[#10B981]' },
          { label: 'Active',      value: counts.active,  icon: UserCheck, grad: 'from-sky-50',     ring: 'bg-sky-500'   },
          { label: 'Invited',     value: counts.invited, icon: MailPlus,  grad: 'from-amber-50',   ring: 'bg-[#D97706]' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label}
                 className={`relative overflow-hidden rounded-2xl border border-gray-100 shadow-sm
                             p-5 bg-linear-to-br ${s.grad} to-white`}>
              <div className={`w-10 h-10 rounded-full ${s.ring} flex items-center justify-center mb-4 shadow-sm`}>
                <Icon className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <div className="text-sm font-medium text-gray-500">{s.label}</div>
              <div className="text-3xl font-bold text-[#1C1917] mt-0.5">{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* ── Invite form ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#1C1917] mb-5">Invite New Staff Member</h2>
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
            <div className="flex gap-2 text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl space-y-2">
              <p className="text-sm text-[#10B981] font-bold">✓ Invite sent!</p>
              <div className="flex gap-2">
                <code className="bg-white border border-gray-100 p-2.5 rounded-lg text-xs flex-1 overflow-auto">
                  {success.replace('Invite link: ', '')}
                </code>
                <button type="button"
                  onClick={() => copyLink(success.replace('Invite link: ', ''))}
                  className="px-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <Copy className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="h-11 px-6 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold
                       transition-colors disabled:opacity-60 flex items-center gap-2">
            <Send className="w-4 h-4" />
            {loading ? 'Sending…' : 'Send Invite'}
          </button>
        </form>
      </div>

      {/* ── Staff list ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#1C1917] mb-5">
          Staff Members <span className="text-gray-400 font-medium">({staff.length})</span>
        </h2>

        {staff.length === 0 ? (
          <p className="text-center py-10 text-gray-400">No staff members yet.</p>
        ) : (
          <div className="space-y-2.5">
            {staff.map((member) => {
              const isSelf = member.email === currentEmail;
              // Protect the last active admin (and never let an admin act on self).
              const lastActiveAdmin = member.role === 'admin' && member.status === 'active' && activeAdminCount <= 1;
              const canModify = !isSelf && !lastActiveAdmin;
              return (
              <div key={member.email}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-100
                           hover:border-gray-200 hover:shadow-sm transition-all">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-emerald-50 text-[#10B981] flex items-center
                                justify-center text-base font-bold shrink-0">
                  {member.name?.charAt(0).toUpperCase() || '?'}
                </div>
                {/* Identity */}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#1C1917] truncate">{member.name}</p>
                  <p className="text-sm text-gray-400 truncate">{member.email}</p>
                </div>
                {/* Badges */}
                <div className="hidden sm:flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold capitalize bg-gray-100 text-gray-600">
                    {member.role}
                  </span>
                  {statusPill(member.status)}
                  {!member.passwordSet && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-[#D97706]">
                      pending setup
                    </span>
                  )}
                </div>
                {/* Actions */}
                <div className="flex gap-1.5 shrink-0">
                  {member.status === 'invited' && (
                    <button onClick={() => resendInvite(member.email)}
                      className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-bold text-gray-600
                                 hover:bg-gray-50 transition-colors">
                      Resend
                    </button>
                  )}
                  {member.status === 'active'
                    ? canModify && (
                      <button onClick={() => deactivateStaff(member.email)} title="Deactivate"
                        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center
                                   text-gray-500 hover:bg-gray-50 transition-colors">
                        <Lock className="w-4 h-4" />
                      </button>
                    )
                    : !isSelf && (
                      <button onClick={() => activateStaff(member.email)} title="Activate"
                        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center
                                   text-[#10B981] hover:bg-emerald-50 transition-colors">
                        <Unlock className="w-4 h-4" />
                      </button>
                    )}
                  {canModify && (
                    <button onClick={() => removeStaff(member.email)} title="Remove"
                      className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center
                                 hover:bg-red-100 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}