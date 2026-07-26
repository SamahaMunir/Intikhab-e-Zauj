import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PaymentPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startPayment = async () => {
    setError('');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated. Please log in again.');

      const response = await fetch(`${apiUrl}/api/payment/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Could not start payment');

      // Already paid (or waived) — skip the gateway.
      if (data.alreadyPaid) {
        window.location.assign('/app/dashboard');
        return;
      }
      if (!data.checkoutUrl) throw new Error('No checkout URL returned');

      // Hand off to Safepay's hosted checkout page.
      window.location.assign(data.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-serif">Complete Payment</CardTitle>
          <CardDescription>Final step to unlock full access</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Registration Fee</span>
              <span className="font-bold text-lg">4,000 PKR</span>
            </div>
            <p className="text-sm text-muted-foreground">
              ✅ Access to all profiles<br/>
              ✅ Send &amp; receive proposals<br/>
              ✅ Direct messaging<br/>
              ✅ Premium features
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button onClick={startPayment} disabled={loading} size="lg" className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Redirecting to Safepay…
              </>
            ) : (
              'Pay Now (4,000 PKR)'
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <p className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" /> Secured by Safepay
            </p>
            <p className="text-xs mt-1">You'll be redirected to Safepay's secure page to pay.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}