import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Full-screen image viewer. Click a photo to open; click backdrop, the ✕, or
 * press Esc to close. Pure/dependency-free.
 */
export default function ImageLightbox({
  src, alt, open, onClose,
}: {
  src?: string | null;
  alt?: string;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  if (!open || !src) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose} role="dialog" aria-modal="true" aria-label="Full profile photo">
      <button onClick={onClose} aria-label="Close"
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
        <X className="w-6 h-6" />
      </button>
      <img
        src={src}
        alt={alt || 'Profile photo'}
        onClick={e => e.stopPropagation()}
        crossOrigin={src.includes('cloudinary.com') ? 'anonymous' : undefined}
        className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl"
      />
    </div>
  );
}
