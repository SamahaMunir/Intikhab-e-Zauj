import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle } from 'lucide-react';

export default function PaymentCancelPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-serif">Payment Cancelled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <XCircle className="w-14 h-14 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">
            No charge was made. You can complete your registration payment whenever you're ready.
          </p>
          <Button className="w-full" size="lg" onClick={() => setLocation('/app/payment')}>
            Try Again
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setLocation('/app/dashboard')}>
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
