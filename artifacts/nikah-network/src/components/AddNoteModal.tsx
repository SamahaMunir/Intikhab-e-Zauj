import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
  existingNote?: string;
  onSaved?: (note: string) => void;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AddNoteModal({
  isOpen,
  onClose,
  profileId,
  profileName,
  existingNote = '',
  onSaved,
}: AddNoteModalProps) {
  const [note,    setNote]    = useState(existingNote);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) { setNote(existingNote); setError(''); setSuccess(''); }
  }, [isOpen, existingNote]);

  const handleSave = async () => {
    setError('');
    setSuccess('');
    if (!note.trim()) {
      setError('Note cannot be empty.');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/staff/profiles/${profileId}/note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: note.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save note');
      setSuccess('Note saved successfully.');
      onSaved?.(note.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNote(existingNote); setError(''); setSuccess('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-150 z-10 overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-7 pb-5 border-b-4 border-[#10B981]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold text-[#1C1917]">Add Note</h2>
              <p className="mt-1 text-base text-gray-500">Profile: <span className="font-semibold text-[#1C1917]">{profileName}</span></p>
            </div>
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
          <div>
            <label className="block text-lg font-bold text-[#1C1917] mb-2">
              Note
            </label>
            <Textarea
              value={note}
              onChange={e => { setNote(e.target.value); setError(''); }}
              placeholder="Write your note about this profile…"
              className="min-h-30 text-xl bg-[#FDF8F3] border-2 border-gray-200
                         focus:border-[#10B981] rounded-xl px-4 py-3"
            />
            {error   && <p className="mt-2 text-lg text-[#EF4444] font-semibold">{error}</p>}
            {success && <p className="mt-2 text-lg text-[#10B981] font-semibold">{success}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 space-y-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full min-h-15 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white
                       text-2xl font-bold transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? 'Saving…' : 'Save Note'}
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
