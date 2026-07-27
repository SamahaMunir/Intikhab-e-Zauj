import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

type State = 'verifying' | 'paid' | 'pending' | 'error';

export default function PaymentSuccessPage() {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<State>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Safepay appends ?tracker=track_xxxx on redirect. Never trust the redirect
    // alone — verify server-side before treating the user as paid.
    const tracker = new URLSearchParams(window.location.search).get('tracker');
    if (!tracker) {
      setState('error');
      setMessage('Missing payment reference. If you were charged, contact support.');
      return;
    }

    let cancelled = false;

    const verifyOnce = async (): Promise<'paid' | 'pending'> => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/payment/verify/${tracker}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      return data.status === 'paid' ? 'paid' : 'pending';
    };

    (async () => {
      // Safepay finalizes the tracker a beat after redirect — poll a few times
      // before giving up to "pending" (with a manual re-check button).
      const delays = [0, 2000, 3000, 4000, 5000];
      try {
        for (let i = 0; i < delays.length; i++) {
          if (cancelled) return;
          if (delays[i]) await new Promise(r => setTimeout(r, delays[i]));
          const result = await verifyOnce();
          if (cancelled) return;
          if (result === 'paid') {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            user.paymentStatus = 'completed';
            localStorage.setItem('user', JSON.stringify(user));
            setState('paid');
            return;
          }
        }
        setState('pending');
      } catch (err) {
        if (cancelled) return;
        setState('error');
        setMessage(err instanceof Error ? err.message : 'Verification failed');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-serif">
            {state === 'paid' ? 'Payment Confirmed' : state === 'error' ? 'Something Went Wrong' : 'Confirming Payment'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          {state === 'verifying' && (
            <>
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Verifying your payment with Safepay…</p>
            </>
          )}

          {state === 'paid' && (
            <>
              <CheckCircle2 className="w-14 h-14 mx-auto text-primary" />
              <p className="font-semibold">You're all set — full access is unlocked.</p>
              <Button className="w-full" size="lg" onClick={() => setLocation('/app/dashboard')}>
                Go to Dashboard
              </Button>
            </>
          )}

          {state === 'pending' && (
            <>
              <Loader2 className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                Your payment is still processing. This can take a moment — we'll unlock access
                as soon as Safepay confirms it.
              </p>
              <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                Check Again
              </Button>
            </>
          )}

          {state === 'error' && (
            <>
              <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
              <p className="text-muted-foreground">{message}</p>
              <Button variant="outline" className="w-full" onClick={() => setLocation('/app/payment')}>
                Back to Payment
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
