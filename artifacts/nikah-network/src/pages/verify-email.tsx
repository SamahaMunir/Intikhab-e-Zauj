import { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { AlertCircle, CheckCircle2, Loader2, MailCheck, ArrowRight } from 'lucide-react';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const query = useSearch();

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(query);
    const urlToken = urlParams.get('token') || '';
    const urlEmail = urlParams.get('email') || '';
    setToken(urlToken);
    setEmail(urlEmail);
    if (urlToken && urlEmail) verifyEmail(urlEmail, urlToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const verifyEmail = async (vEmail: string, vToken: string) => {
    setVerifying(true);
    setError('');
    try {
      const response = await fetch(`${apiUrl}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: vEmail, token: vToken }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Verification failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setSuccess(true);
      // Next step after verifying is to complete the profile — land on the dashboard.
      setTimeout(() => setLocation('/app/dashboard'), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !token) { setError('Email and token are required'); return; }
    await verifyEmail(email, token);
  };

  const handleResend = async () => {
    setError(''); setInfo('');
    if (!email) { setError('Enter your email address first'); return; }
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not resend verification');
      setInfo('Verification link resent — please check your inbox.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend verification');
    } finally {
      setLoading(false);
    }
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden">
        {children}
      </div>
    </div>
  );

  if (success) {
    return (
      <Shell>
        <div className="py-14 px-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#1C1917]">Email Verified!</h2>
          <p className="text-gray-500 text-sm">Your account is confirmed. Taking you to your dashboard…</p>
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#10B981]" />
        </div>
      </Shell>
    );
  }

  if (verifying) {
    return (
      <Shell>
        <div className="py-16 px-8 text-center space-y-3">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-[#10B981]" />
          <h2 className="text-xl font-bold text-[#1C1917]">Verifying your email…</h2>
          <p className="text-gray-500 text-sm">Just a moment.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Header band */}
      <div className="bg-linear-to-r from-primary to-emerald-600 text-white px-8 py-7 text-center">
        <MailCheck className="w-10 h-10 mx-auto mb-2" />
        <h1 className="text-2xl font-serif font-bold">Verify Your Email</h1>
        <p className="text-white/85 text-sm mt-0.5">One quick step to activate your account</p>
      </div>

      <form onSubmit={handleManualVerify} className="px-6 sm:px-8 py-6 space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
          </div>
        )}
        {info && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /><span>{info}</span>
          </div>
        )}

        <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-xl text-sm text-emerald-900">
          <p className="font-semibold mb-1">📧 Check your inbox</p>
          <p>We emailed you a verification link. Click it to activate your account — or paste the details below.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com" disabled={loading}
            className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary/40 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Verification Code</label>
          <input
            value={token} onChange={e => setToken(e.target.value)}
            placeholder="From your email link" disabled={loading}
            className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary/40 outline-none"
          />
        </div>

        <button
          type="submit" disabled={loading || !email || !token}
          className="flex items-center justify-center gap-2 w-full h-12 bg-[#10B981] text-white rounded-xl font-bold hover:bg-[#059669] transition-colors disabled:opacity-50"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying…</> : <>Verify Email <ArrowRight className="w-4 h-4" /></>}
        </button>

        <p className="text-center text-sm text-gray-500">
          Didn't get the email?{' '}
          <button type="button" onClick={handleResend} disabled={loading}
            className="text-[#10B981] hover:underline font-semibold disabled:opacity-50">
            Resend link
          </button>
        </p>
      </form>
    </Shell>
  );
}
