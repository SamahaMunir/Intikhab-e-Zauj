import { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const query = useSearch();
  
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    // Get token from URL params
    const urlParams = new URLSearchParams(query);
    const urlToken = urlParams.get('token') || '';
    const urlEmail = urlParams.get('email') || '';

    setToken(urlToken);
    setEmail(urlEmail);

    // If token is in URL, auto-verify
    if (urlToken && urlEmail) {
      verifyEmail(urlEmail, urlToken);
    }
  }, [query]);

  const verifyEmail = async (verifyEmail: string, verifyToken: string) => {
    setVerifying(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      const response = await fetch(`${apiUrl}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: verifyEmail,
          token: verifyToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      // ✅ SAVE TOKEN
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setSuccess(true);
      console.log('✅ Email verified! Redirecting...');

      // Redirect after 2 seconds
      setTimeout(() => {
        setLocation('/applicant/dashboard');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !token) {
      setError('Email and token are required');
      return;
    }
    await verifyEmail(email, token);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-100 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-12 pb-12 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
            <h2 className="text-2xl font-bold">Email Verified!</h2>
            <p className="text-muted-foreground">
              Your email has been successfully verified.
            </p>
            <p className="text-sm text-blue-600">
              Redirecting to your dashboard in 2 seconds...
            </p>
            <Loader2 className="w-4 h-4 animate-spin mx-auto mt-2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-12 pb-12 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" />
            <h2 className="text-xl font-bold">Verifying Email...</h2>
            <p className="text-muted-foreground">
              Please wait while we verify your email address.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-100 to-purple-100 flex items-center justify-center p-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-serif">Verify Email</CardTitle>
          <CardDescription>Complete your registration</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleManualVerify} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-900">
              <p className="font-semibold mb-2">📧 Check Your Email</p>
              <p>We've sent a verification link to your email address. Click the link to verify your account.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Verification Token</label>
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste token from email link"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !email || !token}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Email'
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Didn't receive the email?{' '}
              <a href="/resend-verification" className="text-primary hover:underline font-semibold">
                Resend Link
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}