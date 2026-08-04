import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, CheckCircle2, Clock, Upload, Copy, ShieldCheck, Landmark } from 'lucide-react';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Company UBL details. For true "scan → amount prefilled", drop the UBL Raast
// merchant QR image at public/payment-qr.png — it replaces the generated one.
const BANK = {
  bankName:      'United Bank Limited (UBL)',
  branch:        'Gulberg Branch, Lahore',
  accountTitle:  'Falah-e-Khandan Trust',
  accountNumber: '0110 0020 1015 5404',
  iban:          'PK81 UNIL 0110 0020 1015 5404',
};
const IBAN_RAW = BANK.iban.replace(/\s/g, '');
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

// Read a fetch Response defensively — the API sometimes sits behind a proxy that
// returns an HTML error page; surface a clear message instead of a JSON-parse crash.
async function readJson(res: Response): Promise<any> {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new Error('Payment service is temporarily unreachable. Please refresh and try again, or contact support.');
  }
  return res.json();
}

export default function PaymentPage() {
  const [reference, setReference] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'pending' | 'submitted' | 'completed' | 'waived' | 'loading'>('loading');
  const [copied, setCopied] = useState('');
  const [qrImgFailed, setQrImgFailed] = useState(false);
  const { uploadFile, uploading, error: uploadError } = useCloudinaryUpload();

  const token = () => localStorage.getItem('token');

  useEffect(() => {
    const uid = getUserId();
    if (!uid) { setStatus('pending'); return; }
    fetch(`${apiUrl}/api/payment/status/${uid}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(readJson)
      .then(d => setStatus(d.paymentStatus || 'pending'))
      .catch(() => setStatus('pending'));
  }, []);

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text.replace(/\s/g, ''));
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
    if (reference.trim().length < 3) { setError('Enter the transaction ID from your bank app receipt.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/payment/bank-transfer/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ reference: reference.trim(), screenshot: screenshot || null }),
      });
      const data = await readJson(res);
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
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden">
        {children}
      </div>
    </div>
  );

  if (status === 'loading') {
    return <Shell><div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div></Shell>;
  }

  if (status === 'completed' || status === 'waived') {
    return (
      <Shell>
        <div className="py-16 px-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold">Payment Confirmed</h2>
          <p className="text-muted-foreground">You have full access. Welcome aboard!</p>
          <Button onClick={() => window.location.assign('/app/dashboard')} className="mt-2">Go to Dashboard</Button>
        </div>
      </Shell>
    );
  }

  if (status === 'submitted') {
    return (
      <Shell>
        <div className="py-16 px-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <Clock className="w-9 h-9 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold">Payment Under Review</h2>
          <p className="text-muted-foreground">
            We've received your details and are verifying the payment against our
            bank records. This usually takes a few hours — you'll get full access
            as soon as it's confirmed.
          </p>
          <Button variant="outline" onClick={() => window.location.assign('/app/dashboard')} className="mt-2">Back to Dashboard</Button>
        </div>
      </Shell>
    );
  }

  // status === 'pending' → payment instructions + form
  return (
    <Shell>
      {/* Header band */}
      <div className="bg-linear-to-r from-primary to-emerald-600 text-white px-8 py-6 text-center">
        <h1 className="text-2xl font-serif font-bold">Registration Payment</h1>
        <p className="text-white/85 text-sm mt-0.5">One-time fee to unlock full access</p>
        <div className="mt-4 inline-flex items-baseline gap-2 bg-white/15 rounded-full px-5 py-2">
          <span className="text-sm text-white/85">Amount</span>
          <span className="text-2xl font-bold">{FEE}</span>
        </div>
      </div>

      <div className="px-6 sm:px-8 py-6 space-y-6">
        {/* Step 1 — scan / transfer */}
        <div>
          <p className="font-semibold text-sm text-gray-900 mb-3">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-xs mr-2">1</span>
            Scan to pay, or transfer to the account
          </p>

          <div className="flex flex-col sm:flex-row gap-5 items-center">
            <div className="shrink-0 text-center">
              <div className="p-3 bg-white rounded-xl border shadow-sm inline-block">
                {!qrImgFailed
                  ? <img src={QR_SRC} alt="Scan to pay" width={168} height={168}
                         className="object-contain" onError={() => setQrImgFailed(true)} />
                  : <QRCodeSVG value={IBAN_RAW} size={168} level="M" />}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Scan with any banking / Raast app</p>
            </div>

            <div className="w-full rounded-xl border bg-gray-50/70 divide-y">
              <Row label="Bank" value={BANK.bankName} sub={BANK.branch} />
              <Row label="Title" value={BANK.accountTitle} onCopy={() => copy(BANK.accountTitle, 'title')} copied={copied === 'title'} />
              <Row label="Account #" value={BANK.accountNumber} mono onCopy={() => copy(BANK.accountNumber, 'acct')} copied={copied === 'acct'} />
              <Row label="IBAN" value={BANK.iban} mono onCopy={() => copy(BANK.iban, 'iban')} copied={copied === 'iban'} />
            </div>
          </div>
        </div>

        {/* Step 2 — confirm */}
        <div className="border-t pt-5">
          <p className="font-semibold text-sm text-gray-900 mb-3">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-xs mr-2">2</span>
            Confirm your transfer
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Transaction ID / Reference *</label>
              <input
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="From your bank app receipt"
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary/40 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment screenshot (optional)</label>
              <label className="inline-flex items-center gap-2 text-sm px-3 h-9 rounded-lg border border-input bg-background cursor-pointer hover:bg-accent">
                {uploading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</>
                  : <><Upload className="w-4 h-4" />{screenshot ? 'Replace screenshot' : 'Upload screenshot'}</>}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onScreenshot} disabled={uploading} />
              </label>
              {screenshot && <span className="text-xs text-green-600 ml-2">✓ attached</span>}
              {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError.split('\n')[0]}</p>}
            </div>
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

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          Our team verifies your payment against our bank records before granting access.
        </p>
      </div>
    </Shell>
  );
}

function Row({ label, value, sub, mono, onCopy, copied }: {
  label: string; value: string; sub?: string; mono?: boolean; onCopy?: () => void; copied?: boolean;
}) {
  return (
    <div className="flex justify-between items-center gap-2 px-3 py-2.5">
      <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1.5">
        {label === 'Bank' && <Landmark className="w-3.5 h-3.5" />}{label}
      </span>
      <span className="text-right">
        <span className={`font-medium text-sm ${mono ? 'font-mono' : ''} inline-flex items-center gap-1.5`}>
          {value}
          {onCopy && (
            <button type="button" onClick={onCopy} className="text-primary hover:opacity-70" title="Copy">
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </span>
        {sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
      </span>
    </div>
  );
}
