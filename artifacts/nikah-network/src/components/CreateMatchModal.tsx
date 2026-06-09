import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';

interface Profile {
  _id: string;
  name: string;
  gender: string;
  city?: string;
  age?: number;
}

interface CreateMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function CreateMatchModal({ isOpen, onClose, profiles }: CreateMatchModalProps) {
  const [maleId,  setMaleId]  = useState('');
  const [femaleId, setFemaleId] = useState('');
  const [note,    setNote]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const males   = profiles.filter(p => p.gender === 'male');
  const females = profiles.filter(p => p.gender === 'female');

  const errors: Record<string, string> = {};
  if (!maleId)   errors.male   = 'Please select a male profile.';
  if (!femaleId) errors.female = 'Please select a female profile.';

  const handleCreate = async () => {
    setError('');
    setSuccess('');
    if (!maleId || !femaleId) {
      setError('Both profiles must be selected.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/matches/generate/${maleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Match generation failed');
      setSuccess(`Match generated successfully. ${data.matchesGenerated ?? ''} match(es) created.`);
      setMaleId('');
      setFemaleId('');
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMaleId(''); setFemaleId(''); setNote('');
    setError(''); setSuccess('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-150 z-10 overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-7 pb-5 border-b-4 border-[#10B981]">
          <div className="flex items-start justify-between">
            <h2 className="text-3xl font-bold text-[#1C1917]">Create Match</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none ml-4 mt-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5">

          {/* Male profile */}
          <div>
            <label className="block text-lg font-bold text-[#1C1917] mb-2">
              Male Profile
            </label>
            <select
              value={maleId}
              onChange={e => setMaleId(e.target.value)}
              className="w-full min-h-12.5 px-4 rounded-xl border-2 border-gray-200 bg-[#FDF8F3]
                         text-xl text-[#1C1917] focus:outline-none focus:border-[#10B981] transition-colors"
            >
              <option value="">Select male profile…</option>
              {males.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name}{p.age ? ` (${p.age})` : ''}{p.city ? ` — ${p.city}` : ''}
                </option>
              ))}
            </select>
            {!maleId && error && (
              <p className="mt-1.5 text-lg text-[#EF4444]">Please select a male profile.</p>
            )}
          </div>

          {/* Female profile */}
          <div>
            <label className="block text-lg font-bold text-[#1C1917] mb-2">
              Female Profile
            </label>
            <select
              value={femaleId}
              onChange={e => setFemaleId(e.target.value)}
              className="w-full min-h-12.5 px-4 rounded-xl border-2 border-gray-200 bg-[#FDF8F3]
                         text-xl text-[#1C1917] focus:outline-none focus:border-[#10B981] transition-colors"
            >
              <option value="">Select female profile…</option>
              {females.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name}{p.age ? ` (${p.age})` : ''}{p.city ? ` — ${p.city}` : ''}
                </option>
              ))}
            </select>
            {!femaleId && error && (
              <p className="mt-1.5 text-lg text-[#EF4444]">Please select a female profile.</p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-lg font-bold text-[#1C1917] mb-2">
              Note <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note about this match…"
              className="min-h-30 text-xl bg-[#FDF8F3] border-2 border-gray-200
                         focus:border-[#10B981] rounded-xl px-4 py-3"
            />
          </div>

          {/* Error / Success */}
          {error   && <p className="text-lg text-[#EF4444] font-semibold">{error}</p>}
          {success && <p className="text-lg text-[#10B981] font-semibold">{success}</p>}
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 space-y-3">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full min-h-15 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white
                       text-2xl font-bold transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? 'Creating…' : 'Create Match'}
          </button>
          <button
            onClick={handleClose}
            disabled={loading}
            className="w-full min-h-15 rounded-xl border-2 border-[#10B981] bg-white
                       text-[#10B981] hover:bg-emerald-50 text-2xl font-bold transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
