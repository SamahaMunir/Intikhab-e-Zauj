/**
 * Neumorphic (soft-UI) auth modal shell — green accent.
 * Shared by StaffAuthModal + UserAuthModal.
 * Exports reusable neumorphic class strings so both modals stay visually identical.
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

// ── Neumorphic class tokens (base #ECF0F3) ───────────────────────────────────
export const NEU_RAISED = 'shadow-[4px_4px_7px_#cdd2d9,-4px_-4px_7px_#ffffff]';
export const NEU_INSET  = 'shadow-[inset_3px_3px_5px_#cdd2d9,inset_-3px_-3px_5px_#ffffff]';

export const NEU_INPUT =
  'w-full min-h-13 px-5 rounded-2xl bg-[#ECF0F3] ' + NEU_INSET +
  ' text-base text-[#374151] placeholder-gray-400 focus:outline-none ' +
  'focus:shadow-[inset_4px_4px_8px_#d1d5db,inset_-4px_-4px_8px_#ffffff,0_0_0_2px_rgba(16,185,129,0.35)] ' +
  'transition-shadow disabled:opacity-60';

export const NEU_LABEL = 'block text-sm font-bold text-[#4b5563] mb-1.5 ml-1';

// Green pill button (raised, with soft green glow)
export const NEU_BTN =
  'w-full min-h-13 rounded-full bg-[#10B981] text-white text-base font-bold ' +
  'shadow-[5px_5px_14px_rgba(16,185,129,0.4),-4px_-4px_10px_#ffffff] ' +
  'hover:bg-[#059669] hover:shadow-[6px_6px_16px_rgba(16,185,129,0.5),-4px_-4px_10px_#ffffff] ' +
  'active:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.2)] ' +
  'transition-all disabled:opacity-60 flex items-center justify-center gap-2';

// ── Modal shell ──────────────────────────────────────────────────────────────
export function AuthModalShell({
  onClose, children, wide = false,
}: {
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center p-4 transition-opacity duration-200
                  ${visible ? 'opacity-100' : 'opacity-0'}`}
      role="dialog" aria-modal="true" aria-label="Authentication"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-[#031a0e]/45 backdrop-blur-md" onClick={handleClose} aria-hidden="true" />

      {/* Card */}
      <div
        className={`relative z-10 w-full ${wide ? 'max-w-lg' : 'max-w-md'} max-h-[92vh] overflow-y-auto
                    rounded-3xl bg-[#ECF0F3] p-8 md:p-10 ring-1 ring-white/70 ${NEU_RAISED}
                    transition-all duration-200 ease-out
                    ${visible ? 'opacity-100 scale-100 translate-y-0'
                              : 'opacity-0 scale-95 translate-y-4'}`}
      >
        {/* Close */}
        <button onClick={handleClose} aria-label="Close"
          className={`absolute top-5 right-5 w-9 h-9 rounded-full bg-[#ECF0F3] ${NEU_RAISED}
                      flex items-center justify-center text-gray-400 hover:text-[#10B981]
                      active:${NEU_INSET} transition-all`}>
          <X className="w-4 h-4" />
        </button>

        {children}
      </div>
    </div>
  );
}

// ── Decorative social row (Google only; not wired) ──────────────────────────
export function NeuSocialRow() {
  return (
    <>
      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-linear-to-r from-transparent to-gray-300" />
        <span className="text-xs font-semibold text-gray-400">or continue with</span>
        <div className="flex-1 h-px bg-linear-to-r from-gray-300 to-transparent" />
      </div>
      <div className="flex justify-center">
        <button type="button" aria-label="Continue with Google"
          className={`flex items-center gap-3 px-6 h-12 rounded-2xl bg-[#ECF0F3] ${NEU_RAISED}
                      text-sm font-bold text-[#374151] active:${NEU_INSET} transition-all`}>
          <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    </>
  );
}
