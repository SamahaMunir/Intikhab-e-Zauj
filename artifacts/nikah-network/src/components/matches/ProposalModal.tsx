import { useEffect, useMemo, useState } from 'react';
import { X, Send, Users, Heart, CheckCircle2, Loader2, ChevronLeft, ChevronRight, MapPin, Briefcase } from 'lucide-react';
import type { QnaCategory } from '../../lib/qnaQuestions';

export type ProposalMode = 'user' | 'staff';

export interface ProposalQuestionResponse {
  questionId: string;
  response: string;
  respondedBy: string;
}

export type ProposalPayload =
  | {
      type: 'USER_PROPOSAL';
      recipientId?: string;
      message: string;
      matchNotes: string;
      compatibilityReason: string;
      questionResponses?: ProposalQuestionResponse[];
    }
  | { type: 'STAFF_PROPOSAL'; staffId: string; notes: string; justification: string };

export interface MatchSummary {
  name?: string;
  age?: number;
  city?: string;
  profession?: string;
  photo?: string;
}

/**
 * Shared proposal modal — one component, two modes:
 *  - 'user'  → Send Proposal (applicant/staff → recipient)
 *  - 'staff' → Make Proposal (internal staff → staff)
 *
 * When `qnaCategories` is supplied in user mode, the modal becomes a multi-step
 * flow: match card → one step per Q&A category → review → submit. Answered
 * questions are returned as `questionResponses`. Without `qnaCategories` (or in
 * staff mode) it falls back to the original single-step free-text form.
 */
export default function ProposalModal({
  open, mode, recipientName, recipientId, staffOptions = [],
  qnaCategories = [], matchSummary, currentUserId,
  onClose, onSubmit,
}: {
  open: boolean;
  mode: ProposalMode;
  recipientName?: string;
  recipientId?: string;
  staffOptions?: { id: string; name: string }[];
  qnaCategories?: QnaCategory[];
  matchSummary?: MatchSummary;
  currentUserId?: string;
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
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // staff fields
  const [staffId, setStaffId] = useState('');
  const [notes, setNotes] = useState('');
  const [justification, setJustification] = useState('');

  // Multi-step Q&A only in user mode when a question bank is provided.
  const multiStep = mode === 'user' && qnaCategories.length > 0;
  // step 0 = intro (match card + message); 1..N = categories; N+1 = review
  const lastStep = qnaCategories.length + 1;
  const [step, setStep] = useState(0);

  // Open/close lifecycle
  useEffect(() => {
    if (open) {
      setMounted(true); setDone(false); setSubmitting(false); setStep(0);
      setMessage(''); setMatchNotes(''); setCompatReason(''); setAnswers({});
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

  const questionResponses = useMemo<ProposalQuestionResponse[]>(() => {
    const out: ProposalQuestionResponse[] = [];
    for (const cat of qnaCategories) {
      for (const q of cat.questions) {
        const v = (answers[q.id] || '').trim();
        if (v) out.push({ questionId: q.id, response: v, respondedBy: currentUserId || '' });
      }
    }
    return out;
  }, [answers, qnaCategories, currentUserId]);

  if (!open) return null;

  const valid = mode === 'user' ? message.trim().length > 0 : staffId.length > 0;

  const doSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(mode === 'user'
        ? {
            type: 'USER_PROPOSAL', recipientId,
            message: message.trim(), matchNotes: matchNotes.trim(), compatibilityReason: compatReason.trim(),
            questionResponses: multiStep ? questionResponses : undefined,
          }
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

  const headerTitle = mode === 'user' ? 'Send Proposal' : 'Internal Staff Proposal';
  const headerSub = mode === 'user'
    ? recipientName ? `To ${recipientName}` : 'Forward this match to the applicant'
    : 'Suggest this match to another staff member';

  // ── Multi-step body (user mode + Q&A) ───────────────────────────────────────
  const renderMultiStep = () => {
    // Intro: match card + cover message
    if (step === 0) {
      return (
        <div className="px-6 py-5 space-y-4">
          {matchSummary && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#F4F6F5] border border-gray-100">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-emerald-50 shrink-0 flex items-center justify-center">
                {matchSummary.photo
                  ? <img src={matchSummary.photo} alt={matchSummary.name || 'Match'} className="w-full h-full object-cover" />
                  : <Heart className="w-6 h-6 text-[#10B981]" />}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[#1C1917] truncate">
                  {matchSummary.name || recipientName || 'Match'}{matchSummary.age ? `, ${matchSummary.age}` : ''}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                  {matchSummary.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{matchSummary.city}</span>}
                  {matchSummary.profession && <span className="inline-flex items-center gap-1"><Briefcase className="w-3 h-3" />{matchSummary.profession}</span>}
                </div>
              </div>
            </div>
          )}
          <div>
            <label className={lbl}>Message <span className="text-red-400">*</span></label>
            <textarea rows={3} value={message} onChange={e => setMessage(e.target.value)}
              placeholder="A short, respectful introduction message…" className={ta} />
          </div>
          <p className="text-xs text-gray-400">Next, answer a few questions to share with this match. Questions are optional.</p>
        </div>
      );
    }
    // Review
    if (step === lastStep) {
      return (
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm font-bold text-[#1C1917]">Review</p>
          <div className="p-3 rounded-xl bg-[#F4F6F5] border border-gray-100">
            <p className={lbl}>Your message</p>
            <p className="text-sm text-[#1C1917] whitespace-pre-wrap">{message.trim() || '—'}</p>
          </div>
          {questionResponses.length === 0 ? (
            <p className="text-xs text-gray-400">No questions answered. You can go back to add answers, or send as is.</p>
          ) : (
            <div className="space-y-2">
              {qnaCategories.map(cat => {
                const ans = cat.questions.filter(q => (answers[q.id] || '').trim());
                if (!ans.length) return null;
                return (
                  <div key={cat.id} className="p-3 rounded-xl border border-gray-100">
                    <p className="text-xs font-bold text-[#10B981] mb-1.5">{cat.title}</p>
                    {ans.map(q => (
                      <div key={q.id} className="mb-2 last:mb-0">
                        <p className="text-xs text-gray-500">{q.label}</p>
                        <p className="text-sm text-[#1C1917] whitespace-pre-wrap">{answers[q.id].trim()}</p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }
    // Category step
    const cat = qnaCategories[step - 1];
    return (
      <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
        <div>
          <p className="text-sm font-bold text-[#1C1917]">{cat.title}</p>
          {cat.description && <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>}
        </div>
        {cat.questions.map(q => (
          <div key={q.id}>
            <label className={lbl}>{q.label}</label>
            {q.multiline
              ? <textarea rows={2} value={answers[q.id] || ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} placeholder={q.placeholder} className={ta} />
              : <input value={answers[q.id] || ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} placeholder={q.placeholder} className={ta} />}
          </div>
        ))}
      </div>
    );
  };

  const canAdvance = step !== 0 || message.trim().length > 0;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className={`absolute inset-0 bg-[#031a0e]/45 backdrop-blur-md transition-opacity duration-200
                       ${mounted ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} aria-hidden="true" />

      {/* Card */}
      <div role="dialog" aria-modal="true" aria-label={headerTitle}
        className={`relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden
                    transition-all duration-200 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
            mode === 'user' ? 'bg-emerald-50 text-[#10B981]' : 'bg-violet-50 text-violet-600'}`}>
            {mode === 'user' ? <Heart className="w-5 h-5" /> : <Users className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-[#1C1917] leading-tight">{headerTitle}</h3>
            <p className="text-xs text-gray-500 truncate">{headerSub}</p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="ml-auto p-2 -mr-2 text-gray-400 hover:text-[#1C1917] rounded-lg hover:bg-gray-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step progress (multi-step only) */}
        {multiStep && !done && (
          <div className="flex gap-1.5 px-6 pt-4">
            {Array.from({ length: lastStep + 1 }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-[#10B981]' : 'bg-gray-200'}`} />
            ))}
          </div>
        )}

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
        ) : multiStep ? (
          <>
            {renderMultiStep()}
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
                className="h-11 px-5 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                {step === 0 ? 'Cancel' : <><ChevronLeft className="w-4 h-4" /> Back</>}
              </button>
              {step < lastStep ? (
                <button onClick={() => canAdvance && setStep(s => s + 1)} disabled={!canAdvance}
                  className="flex-1 h-11 rounded-xl bg-linear-to-r from-[#10B981] to-[#059669] text-white text-sm font-bold
                             flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:brightness-105
                             active:scale-[0.99] transition-all disabled:opacity-50 disabled:hover:shadow-md">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={doSubmit} disabled={!valid || submitting}
                  className="flex-1 h-11 rounded-xl bg-linear-to-r from-[#10B981] to-[#059669] text-white text-sm font-bold
                             flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:brightness-105
                             active:scale-[0.99] transition-all disabled:opacity-50 disabled:hover:shadow-md">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Proposal
                </button>
              )}
            </div>
          </>
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
              <button onClick={doSubmit} disabled={!valid || submitting}
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
