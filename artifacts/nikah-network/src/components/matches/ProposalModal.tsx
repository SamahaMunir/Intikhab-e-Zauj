import { useEffect, useState } from 'react';
import { X, Send, Users, Heart, CheckCircle2, Loader2 } from 'lucide-react';

export type ProposalMode = 'user' | 'staff';

export type ProposalPayload =
  | { type: 'USER_PROPOSAL'; recipientId?: string; message: string; matchNotes: string; compatibilityReason: string }
  | { type: 'STAFF_PROPOSAL'; staffId: string; notes: string; justification: string };

/**
 * Shared proposal modal — one component, two modes:
 *  - 'user'  → Send Proposal (Staff → User)
 *  - 'staff' → Make Proposal (Internal Staff → Staff)
 * Frontend-only; submission is delegated to onSubmit (no backend endpoint exists yet).
 */
export default function ProposalModal({
  open, mode, recipientName, recipientId, staffOptions = [], onClose, onSubmit,
}: {
  open: boolean;
  mode: ProposalMode;
  recipientName?: string;
  recipientId?: string;
  staffOptions?: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (payload: ProposalPayload) => Promise<void> | void;
}) {
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // user fields
  const [message, setMessage] = useState('');
  const [matchNotes, setMatchNotes] = useState('');
  const [compatReason, setCompatReason] = useState('');
  // staff fields
  const [staffId, setStaffId] = useState('');
  const [notes, setNotes] = useState('');
  const [justification, setJustification] = useState('');

  // Open/close lifecycle
  useEffect(() => {
    if (open) {
      setMounted(true); setDone(false); setSubmitting(false);
      setMessage(''); setMatchNotes(''); setCompatReason('');
      setStaffId(''); setNotes(''); setJustification('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const valid = mode === 'user' ? message.trim().length > 0 : staffId.length > 0;

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(mode === 'user'
        ? { type: 'USER_PROPOSAL', recipientId, message: message.trim(), matchNotes: matchNotes.trim(), compatibilityReason: compatReason.trim() }
        : { type: 'STAFF_PROPOSAL', staffId, notes: notes.trim(), justification: justification.trim() });
      setDone(true);
      setTimeout(onClose, 1300);
    } catch {
      setSubmitting(false);
    }
  };

  const ta = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1C1917] ' +
             'placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981] transition-colors resize-none';
  const lbl = 'block text-xs font-bold text-gray-500 mb-1.5';

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className={`absolute inset-0 bg-[#031a0e]/45 backdrop-blur-md transition-opacity duration-200
                       ${mounted ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} aria-hidden="true" />

      {/* Card */}
      <div role="dialog" aria-modal="true" aria-label={mode === 'user' ? 'Send Proposal' : 'Internal Staff Proposal'}
        className={`relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden
                    transition-all duration-200 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
            mode === 'user' ? 'bg-emerald-50 text-[#10B981]' : 'bg-violet-50 text-violet-600'}`}>
            {mode === 'user' ? <Heart className="w-5 h-5" /> : <Users className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-[#1C1917] leading-tight">
              {mode === 'user' ? 'Send Proposal' : 'Internal Staff Proposal'}
            </h3>
            <p className="text-xs text-gray-500 truncate">
              {mode === 'user'
                ? recipientName ? `To ${recipientName}` : 'Forward this match to the applicant'
                : 'Suggest this match to another staff member'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="ml-auto p-2 -mr-2 text-gray-400 hover:text-[#1C1917] rounded-lg hover:bg-gray-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {done ? (
          <div className="px-6 py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
            </div>
            <p className="text-lg font-bold text-[#1C1917]">Proposal sent</p>
            <p className="text-sm text-gray-500 mt-1">
              {mode === 'user' ? 'It will be reviewed by staff before delivery.' : 'Your suggestion has been shared.'}
            </p>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {mode === 'user' ? (
                <>
                  <div>
                    <label className={lbl}>Message <span className="text-red-400">*</span></label>
                    <textarea rows={3} value={message} onChange={e => setMessage(e.target.value)}
                      placeholder="A short, respectful introduction message…" className={ta} />
                  </div>
                  <div>
                    <label className={lbl}>Match Notes</label>
                    <textarea rows={2} value={matchNotes} onChange={e => setMatchNotes(e.target.value)}
                      placeholder="Notes about this match for the record…" className={ta} />
                  </div>
                  <div>
                    <label className={lbl}>Compatibility Reason</label>
                    <textarea rows={2} value={compatReason} onChange={e => setCompatReason(e.target.value)}
                      placeholder="Why is this a strong match? (caste, profession, city…)" className={ta} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className={lbl}>Staff Member <span className="text-red-400">*</span></label>
                    <select value={staffId} onChange={e => setStaffId(e.target.value)} className={ta + ' cursor-pointer'}>
                      <option value="">Select a staff member…</option>
                      {staffOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Notes</label>
                    <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="Internal notes about this suggestion…" className={ta} />
                  </div>
                  <div>
                    <label className={lbl}>Match Justification</label>
                    <textarea rows={2} value={justification} onChange={e => setJustification(e.target.value)}
                      placeholder="Why should this match be considered?" className={ta} />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={onClose}
                className="h-11 px-5 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={!valid || submitting}
                className="flex-1 h-11 rounded-xl bg-linear-to-r from-[#10B981] to-[#059669] text-white text-sm font-bold
                           flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:brightness-105
                           active:scale-[0.99] transition-all disabled:opacity-50 disabled:hover:shadow-md">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {mode === 'user' ? 'Send Proposal' : 'Make Proposal'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
