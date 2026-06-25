import { useState } from 'react';
import { useLocation } from 'wouter';
import { useStore } from '@/lib/store';
import { setSession } from '@/lib/auth';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  AuthModalShell, NeuSocialRow, NEU_INPUT, NEU_LABEL, NEU_BTN,
} from '@/components/AuthModalShell';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function StaffAuthModal() {
  const [, setLocation] = useLocation();
  const { login, users } = useStore();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // ── Login (logic unchanged) ──────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok && data.token) {
        // Staff realm — kept separate from any applicant session in the same browser.
        setSession('staff', data.token, data.user);
        const staffUser = users.find(
          u => u.email === data.user.email && (u.role === 'staff' || u.role === 'admin')
        );
        if (staffUser) login(staffUser.id);
        setLocation('/staff/dashboard');
        return;
      }
      setError(data.message || 'Invalid email or password');
    } catch (err) {
      console.error('Login error:', err);
      setError('Server error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthModalShell onClose={() => setLocation('/')}>
      <h2 className="text-2xl font-bold text-[#374151] mb-1">Staff sign in</h2>
      <p className="text-sm text-gray-400 mb-7">Access the moderation dashboard</p>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="st-email" className={NEU_LABEL}>E-mail</label>
          <input id="st-email" type="email" value={email} required disabled={loading}
            onChange={e => setEmail(e.target.value)}
            placeholder="staff@nikahnetwork.pk" className={NEU_INPUT} />
        </div>

        <div>
          <label htmlFor="st-password" className={NEU_LABEL}>Password</label>
          <input id="st-password" type="password" value={password} required disabled={loading}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" className={NEU_INPUT} />
        </div>

        {error && (
          <div className="flex gap-2 text-sm text-red-600 px-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-2">
          <button type="submit" disabled={loading} className={NEU_BTN}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </div>
      </form>

      <NeuSocialRow />

      <p className="mt-5 text-center text-xs text-gray-400">
        Staff access only · Authorised personnel of Falah Khandan Center
      </p>
    </AuthModalShell>
  );
}
