import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ZoomIn, Check, Loader2 } from 'lucide-react';

/**
 * Dependency-free square photo cropper. Give it a picked File; the user drags to
 * pan and uses the slider to zoom, then Confirm returns a cropped JPEG File
 * (800×800). The image always covers the viewport (no empty edges).
 */
const VIEW = 320;   // on-screen viewport (px)
const OUT  = 800;   // exported image size (px)

export default function PhotoCropModal({
  file, open, onCancel, onCropped,
}: {
  file: File | null;
  open: boolean;
  onCancel: () => void;
  onCropped: (cropped: File) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [minScale, setMinScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });   // top-left offset of the scaled image within the viewport
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);

  // Load the picked file into an Image and fit it to "cover" the viewport.
  useEffect(() => {
    if (!open || !file) return;
    setReady(false);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const cover = Math.max(VIEW / img.width, VIEW / img.height);
      setMinScale(cover);
      setScale(cover);
      // center
      setPos({ x: (VIEW - img.width * cover) / 2, y: (VIEW - img.height * cover) / 2 });
      setReady(true);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [open, file]);

  // Clamp so the image always covers the viewport (no gaps).
  const clamp = useCallback((p: { x: number; y: number }, s: number) => {
    const img = imgRef.current;
    if (!img) return p;
    const w = img.width * s, h = img.height * s;
    return {
      x: Math.min(0, Math.max(VIEW - w, p.x)),
      y: Math.min(0, Math.max(VIEW - h, p.y)),
    };
  }, []);

  // Redraw the preview whenever the transform changes.
  useEffect(() => {
    const canvas = canvasRef.current, img = imgRef.current;
    if (!canvas || !img || !ready) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, VIEW, VIEW);
    ctx.drawImage(img, pos.x, pos.y, img.width * scale, img.height * scale);
  }, [pos, scale, ready]);

  const onZoom = (s: number) => {
    const img = imgRef.current;
    if (!img) return;
    // keep the viewport centre fixed while zooming
    const cx = VIEW / 2, cy = VIEW / 2;
    const rx = (cx - pos.x) / (img.width * scale);
    const ry = (cy - pos.y) / (img.height * scale);
    const np = { x: cx - rx * img.width * s, y: cy - ry * img.height * s };
    setScale(s);
    setPos(clamp(np, s));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setPos(clamp({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }, scale));
  };
  const onPointerUp = () => { drag.current = null; };

  const confirm = async () => {
    const img = imgRef.current;
    if (!img) return;
    setBusy(true);
    try {
      const out = document.createElement('canvas');
      out.width = OUT; out.height = OUT;
      const ctx = out.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, OUT, OUT);
      const k = OUT / VIEW; // scale viewport math up to output resolution
      ctx.drawImage(img, pos.x * k, pos.y * k, img.width * scale * k, img.height * scale * k);
      const blob: Blob | null = await new Promise(res => out.toBlob(res, 'image/jpeg', 0.9));
      if (!blob) throw new Error('crop failed');
      const cropped = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
      onCropped(cropped);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-label="Crop photo">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Crop photo</h3>
          <button onClick={onCancel} aria-label="Cancel" className="p-1.5 -mr-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center gap-4">
          <div className="relative rounded-xl overflow-hidden bg-gray-100 touch-none select-none"
            style={{ width: VIEW, height: VIEW }}>
            {!ready && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}
            <canvas ref={canvasRef} width={VIEW} height={VIEW}
              onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
              className="cursor-move" />
            {/* Framing guide */}
            <div className="pointer-events-none absolute inset-0 ring-1 ring-black/10 rounded-xl" />
          </div>

          <div className="flex items-center gap-2 w-full">
            <ZoomIn className="w-4 h-4 text-gray-400 shrink-0" />
            <input type="range" min={minScale} max={minScale * 4} step={0.01} value={scale}
              onChange={e => onZoom(+e.target.value)} disabled={!ready}
              className="flex-1 accent-emerald-600" />
          </div>
          <p className="text-xs text-gray-400 text-center">Drag to reposition · slide to zoom</p>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onCancel} disabled={busy}
            className="flex-1 h-10 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={confirm} disabled={!ready || busy}
            className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Use photo</>}
          </button>
        </div>
      </div>
    </div>
  );
}
