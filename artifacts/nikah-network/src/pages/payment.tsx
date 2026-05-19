import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function PaymentPage() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentInitiated, setPaymentInitiated] = useState(false);

  const initiatePayment = async () => {
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      const response = await fetch(`${apiUrl}/api/payment/initiate-jazzcash`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Payment initiation failed');
      }

      console.log('✅ Payment initiated:', data.payment.transactionId);
      setPaymentInitiated(true);

      // In real implementation, redirect to JazzCash gateway
      // For now, simulate payment success after 3 seconds
      setTimeout(() => {
        completePayment(data.payment.transactionId);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const completePayment = async (transactionId: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      const response = await fetch(`${apiUrl}/api/payment/confirm-jazzcash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          status: 'success',
        }),
      });

      if (response.ok) {
        alert('✅ Payment successful! You now have full access!');
        setLocation('/dashboard');
      }
    } catch (err) {
      setError('Payment confirmation failed');
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-green-100 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-serif">Complete Payment</CardTitle>
          <CardDescription>Final step to unlock full access</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Registration Fee</span>
              <span className="font-bold text-lg">4,000 PKR</span>
            </div>
            <p className="text-sm text-muted-foreground">
              ✅ Access to all profiles<br/>
              ✅ Send & receive proposals<br/>
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

          {paymentInitiated ? (
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" />
              <p className="font-semibold">Processing payment...</p>
              <p className="text-sm text-muted-foreground">Please wait while we process your payment</p>
            </div>
          ) : (
            <Button
              onClick={initiatePayment}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Initiating Payment...
                </>
              ) : (
                'Pay Now with JazzCash (4000 PKR)'
              )}
            </Button>
          )}

          <div className="text-center text-sm text-muted-foreground">
            <p>💳 Payment powered by JazzCash</p>
            <p className="text-xs mt-1">Secure and encrypted transaction</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}