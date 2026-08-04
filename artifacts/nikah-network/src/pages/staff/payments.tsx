import { useEffect, useState } from 'react';
import { getToken } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, ExternalLink, Inbox } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface PendingPayment {
  _id: string;
  name: string;
  email: string;
  phone: string;
  paymentMethod?: string;
  paymentReference?: string;
  paymentScreenshot?: string | null;
  paymentSubmittedAt?: string;
}

export default function StaffPayments() {
  const [items, setItems] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/staff/profiles/payments/pending`, {
        headers: { Authorization: `Bearer ${getToken('staff')}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setItems(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (id: string, action: 'payment-verify' | 'payment-reject') => {
    if (action === 'payment-reject' && !confirm('Reject this payment? The applicant will be asked to pay again.')) return;
    setBusy(id);
    setError('');
    try {
      const reason = action === 'payment-reject' ? (prompt('Reason (optional):') || '') : '';
      const res = await fetch(`${API}/api/staff/profiles/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken('staff')}` },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setItems(prev => prev.filter(p => p._id !== id)); // drop from queue
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Verification</h1>
        <p className="text-gray-500 text-sm mt-1">
          Confirm bank-transfer payments against your bank statement before granting access.
        </p>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {items.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No payments waiting for verification.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(p => (
            <Card key={p._id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{p.name}</p>
                  <p className="text-sm text-gray-500">{p.email} · {p.phone}</p>
                  <p className="text-sm mt-1">
                    <span className="text-gray-500">Transaction ID:</span>{' '}
                    <span className="font-mono font-medium">{p.paymentReference || '—'}</span>
                  </p>
                  {p.paymentSubmittedAt && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Submitted {new Date(p.paymentSubmittedAt).toLocaleString()}
                    </p>
                  )}
                  {p.paymentScreenshot && (
                    <a href={p.paymentScreenshot} target="_blank" rel="noreferrer"
                       className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                      <ExternalLink className="w-3 h-3" /> View screenshot
                    </a>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="destructive" size="sm" disabled={busy === p._id}
                          onClick={() => act(p._id, 'payment-reject')}>
                    <XCircle className="w-4 h-4 mr-1.5" /> Reject
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={busy === p._id}
                          onClick={() => act(p._id, 'payment-verify')}>
                    {busy === p._id ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                    Confirm Paid
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
