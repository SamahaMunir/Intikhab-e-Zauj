import { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function VerifyAuto() {
  const [, setLocation] = useLocation();
  const query = useSearch();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    verifyEmail();
  }, [query]);

  const verifyEmail = async () => {
    try {
      const urlParams = new URLSearchParams(query);
      const token = urlParams.get('token');
      const email = urlParams.get('email');

      if (!token || !email) {
        setError('Invalid verification link');
        setLoading(false);
        return;
      }

      console.log('🔄 Verifying email...', { email, token });

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      const response = await fetch(`${apiUrl}/auth/verify-auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      console.log('✅ Email verified!', data);

      // ✅ SAVE TOKEN
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setSuccess(true);

      // ✅ REDIRECT TO PROFILE WIZARD
      setTimeout(() => {
        setLocation('/profile-wizard');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-12 pb-12 space-y-4">
          {success ? (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
              <h2 className="text-2xl font-bold">Email Verified!</h2>
              <p className="text-muted-foreground">Redirecting to profile completion...</p>
              <Loader2 className="w-4 h-4 animate-spin mx-auto mt-2" />
            </>
          ) : error ? (
            <>
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto" />
              <h2 className="text-2xl font-bold">Verification Failed</h2>
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button onClick={() => setLocation('/quick-register')} className="w-full">
                Register Again
              </Button>
            </>
          ) : (
            <>
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" />
              <h2 className="text-2xl font-bold">Verifying Email...</h2>
              <p className="text-muted-foreground">Please wait...</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}