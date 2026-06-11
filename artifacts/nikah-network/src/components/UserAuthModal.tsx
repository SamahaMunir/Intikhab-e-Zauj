import { useState } from 'react';
import { useLocation } from 'wouter';
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import {
  AuthModalShell, NeuSocialRow, NEU_INPUT, NEU_LABEL, NEU_BTN, NEU_INSET,
} from '@/components/AuthModalShell';

type Mode = 'login' | 'signup';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function UserAuthModal({ initialMode = 'login' }: { initialMode?: Mode }) {
  const [, setLocation] = useLocation();
  const [mode, setMode]       = useState<Mode>(initialMode);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Login fields
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  // Signup fields
  const [form, setForm] = useState({
    name: '', email: '', phone: '', gender: 'male',
    dob: '', city: '', password: '', passwordConfirm: '',
  });
  const onForm = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const switchMode = (m: Mode) => { setMode(m); setError(''); setSuccess(''); };

  // ── Login (logic unchanged) ──────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API}/auth/login-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user.profileCompletion < 100)        setLocation('/app/profile-wizard');
      else if (data.user.paymentStatus === 'pending') setLocation('/app/payment');
      else                                            setLocation('/app/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Register (logic unchanged) ───────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Registration failed');

      localStorage.setItem('token', data.token || '');
      localStorage.setItem('user', JSON.stringify(data.user));

      // Account created — switch to login so they can sign in
      setSuccess('Account created! Please sign in to continue.');
      setEmail(form.email);
      setMode('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <AuthModalShell onClose={() => setLocation('/')} wide={!isLogin}>
      <h2 className="text-2xl font-bold text-[#374151] mb-1">
        {isLogin ? 'Please login to continue' : 'Create your account'}
      </h2>
      <p className="text-sm text-gray-400 mb-6">
        {isLogin ? 'Welcome back to Intikhab-e-Zauj' : 'Join in a few quick steps'}
      </p>

      {/* Toggle */}
      <div className={`relative flex bg-[#ECF0F3] rounded-full p-1 mb-6 ${NEU_INSET}`}>
        <span
          className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-[#10B981]
                      shadow-[3px_3px_8px_rgba(16,185,129,0.4)] transition-transform duration-300 ease-out
                      ${isLogin ? 'translate-x-0' : 'translate-x-[calc(100%+8px)]'}`}
          aria-hidden="true"
        />
        <button onClick={() => switchMode('login')}
          className={`relative z-10 flex-1 py-2.5 rounded-full text-sm font-bold transition-colors
                      ${isLogin ? 'text-white' : 'text-gray-500 hover:text-[#374151]'}`}>
          Login
        </button>
        <button onClick={() => switchMode('signup')}
          className={`relative z-10 flex-1 py-2.5 rounded-full text-sm font-bold transition-colors
                      ${!isLogin ? 'text-white' : 'text-gray-500 hover:text-[#374151]'}`}>
          Sign Up
        </button>
      </div>

      {/* Success */}
      {success && (
        <div className="flex gap-2 text-sm text-[#10B981] mb-4 px-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{success}</span>
        </div>
      )}

      {isLogin ? (
        // ── LOGIN ──
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="u-email" className={NEU_LABEL}>E-mail</label>
            <input id="u-email" type="email" value={email} required disabled={loading}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" className={NEU_INPUT} />
          </div>
          <div>
            <label htmlFor="u-password" className={NEU_LABEL}>Password</label>
            <input id="u-password" type="password" value={password} required disabled={loading}
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
      ) : (
        // ── SIGN UP ──
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="s-name" className={NEU_LABEL}>Full Name</label>
            <input id="s-name" name="name" value={form.name} required disabled={loading}
              onChange={onForm} placeholder="Your full name" className={NEU_INPUT} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="s-email" className={NEU_LABEL}>E-mail</label>
              <input id="s-email" name="email" type="email" value={form.email} required disabled={loading}
                onChange={onForm} placeholder="your@email.com" className={NEU_INPUT} />
            </div>
            <div>
              <label htmlFor="s-phone" className={NEU_LABEL}>Phone</label>
              <input id="s-phone" name="phone" value={form.phone} required disabled={loading}
                onChange={onForm} placeholder="03001234567" className={NEU_INPUT} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="s-gender" className={NEU_LABEL}>Gender</label>
              <select id="s-gender" name="gender" value={form.gender} disabled={loading}
                onChange={onForm} className={NEU_INPUT + ' appearance-none cursor-pointer'}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label htmlFor="s-dob" className={NEU_LABEL}>Date of Birth</label>
              <input id="s-dob" name="dob" type="date" value={form.dob} required disabled={loading}
                onChange={onForm} className={NEU_INPUT} />
            </div>
          </div>

          <div>
            <label htmlFor="s-city" className={NEU_LABEL}>City</label>
            <input id="s-city" name="city" value={form.city} required disabled={loading}
              onChange={onForm} placeholder="Lahore" className={NEU_INPUT} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="s-password" className={NEU_LABEL}>Password</label>
              <input id="s-password" name="password" type="password" value={form.password} required disabled={loading}
                onChange={onForm} placeholder="6+ characters" className={NEU_INPUT} />
            </div>
            <div>
              <label htmlFor="s-confirm" className={NEU_LABEL}>Confirm</label>
              <input id="s-confirm" name="passwordConfirm" type="password" value={form.passwordConfirm} required disabled={loading}
                onChange={onForm} placeholder="Repeat password" className={NEU_INPUT} />
            </div>
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
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </div>
        </form>
      )}

      <NeuSocialRow />
    </AuthModalShell>
  );
}
