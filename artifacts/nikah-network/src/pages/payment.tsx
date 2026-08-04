import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, CheckCircle2, Clock, Upload, Copy } from 'lucide-react';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Company UBL details. Drop the Raast/UBL receive-QR image into public/payment-qr.png.
const BANK = {
  bankName:      'United Bank Limited (UBL) — Gulberg Branch, Lahore',
  accountTitle:  'Falah-e-Khandan Trust',
  accountNumber: '0110 0020 1015 5404',
  iban:          'PK81 UNIL 0110 0020 1015 5404',
};
const QR_SRC = '/payment-qr.png';
const FEE = '4,000 PKR';

function getUserId(): string | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u?.id || u?._id || null;
  } catch { return null; }
}

export default function PaymentPage() {
  const [reference, setReference] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'pending' | 'submitted' | 'completed' | 'waived' | 'loading'>('loading');
  const [copied, setCopied] = useState('');
  const { uploadFile, uploading, error: uploadError } = useCloudinaryUpload();

  const token = () => localStorage.getItem('token');

  useEffect(() => {
    const uid = getUserId();
    if (!uid) { setStatus('pending'); return; }
    fetch(`${apiUrl}/api/payment/status/${uid}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => setStatus(d.paymentStatus || 'pending'))
      .catch(() => setStatus('pending'));
  }, []);

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 1500);
  };

  const onScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const res = await uploadFile(file, 'general', 'payment-proofs');
    if (res?.url) setScreenshot(res.url);
  };

  const submit = async () => {
    setError('');
    if (reference.trim().length < 3) { setError('Enter the transaction ID from your bank app.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/payment/bank-transfer/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ reference: reference.trim(), screenshot: screenshot || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit payment');
      if (data.alreadyPaid) { setStatus(data.paymentStatus); return; }
      setStatus('submitted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">{children}</Card>
    </div>
  );

  if (status === 'loading') {
    return <Shell><CardContent className="py-16 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></CardContent></Shell>;
  }

  if (status === 'completed' || status === 'waived') {
    return (
      <Shell>
        <CardContent className="py-14 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
          <h2 className="text-2xl font-bold">Payment Confirmed</h2>
          <p className="text-muted-foreground">You have full access. Enjoy!</p>
          <Button onClick={() => window.location.assign('/app/dashboard')} className="mt-2">Go to Dashboard</Button>
        </CardContent>
      </Shell>
    );
  }

  if (status === 'submitted') {
    return (
      <Shell>
        <CardContent className="py-14 text-center space-y-3">
          <Clock className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-2xl font-bold">Payment Under Review</h2>
          <p className="text-muted-foreground">
            We've received your transaction details. Our team is verifying your
            payment against our bank records — this usually takes a few hours.
            You'll get access as soon as it's confirmed.
          </p>
          <Button variant="outline" onClick={() => window.location.assign('/app/dashboard')} className="mt-2">Back to Dashboard</Button>
        </CardContent>
      </Shell>
    );
  }

  // status === 'pending' → show payment instructions + form
  return (
    <Shell>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-serif">Registration Payment</CardTitle>
        <CardDescription>Pay the one-time fee to unlock full access</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="bg-muted rounded-lg p-4 flex justify-between items-center">
          <span className="font-semibold">Registration Fee</span>
          <span className="font-bold text-xl">{FEE}</span>
        </div>

        {/* Step 1 — pay */}
        <div className="space-y-3">
          <p className="font-semibold text-sm">Step 1 — Send {FEE} to our account</p>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <img
              src={QR_SRC}
              alt="Scan to pay"
              className="w-40 h-40 rounded-lg border object-contain bg-white"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="text-sm space-y-1.5 w-full">
              <Row label="Bank" value={BANK.bankName} />
              <Row label="Title" value={BANK.accountTitle} onCopy={() => copy(BANK.accountTitle, 'title')} copied={copied === 'title'} />
              <Row label="Account #" value={BANK.accountNumber} onCopy={() => copy(BANK.accountNumber, 'acct')} copied={copied === 'acct'} />
              <Row label="IBAN" value={BANK.iban} onCopy={() => copy(BANK.iban, 'iban')} copied={copied === 'iban'} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Scan the QR with any banking / Raast app, or transfer manually using the details above.
          </p>
        </div>

        {/* Step 2 — confirm */}
        <div className="space-y-3 border-t pt-5">
          <p className="font-semibold text-sm">Step 2 — Enter your transaction details</p>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Transaction ID / Reference *</label>
            <input
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="e.g. from your bank app receipt"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Payment screenshot (optional)</label>
            <label className="inline-flex items-center gap-2 text-sm px-3 h-9 rounded-md border border-input bg-background cursor-pointer hover:bg-accent">
              {uploading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</>
                : <><Upload className="w-4 h-4" />{screenshot ? 'Replace screenshot' : 'Upload screenshot'}</>}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onScreenshot} disabled={uploading} />
            </label>
            {screenshot && <span className="text-xs text-green-600 ml-2">✓ attached</span>}
            {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError.split('\n')[0]}</p>}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button onClick={submit} disabled={submitting || uploading} size="lg" className="w-full">
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</> : 'Submit Payment for Verification'}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Our team verifies your payment against our bank records before granting access.
        </p>
      </CardContent>
    </Shell>
  );
}

function Row({ label, value, onCopy, copied }: { label: string; value: string; onCopy?: () => void; copied?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right flex items-center gap-1.5">
        {value}
        {onCopy && (
          <button type="button" onClick={onCopy} className="text-primary hover:opacity-70" title="Copy">
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </span>
    </div>
  );
}
