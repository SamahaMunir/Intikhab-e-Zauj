import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ZoomIn, Check, Loader2 } from 'lucide-react';

/**
 * Square crop PICKER. Given a picked File (the original photo), the user drags to
 * pan and zooms to choose which region becomes the profile/face thumbnail. It does
 * NOT modify the image — it returns the chosen rectangle in the image's NATURAL
 * pixels ("x,y,w,h"), which is applied to the stored original via a Cloudinary
 * transform. The original full image is kept for the full-screen view.
 */
const VIEW = 320;

export default function PhotoCropModal({
  file, open, onCancel, onConfirm,
}: {
  file: File | null;
  open: boolean;
  onCancel: () => void;
  onConfirm: (rect: string) => void;   // "x,y,w,h" in natural px
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [minScale, setMinScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });   // top-left of the scaled image within the viewport
  const [ready, setReady] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);

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
      setPos({ x: (VIEW - img.width * cover) / 2, y: (VIEW - img.height * cover) / 2 });
      setReady(true);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [open, file]);

  const clamp = useCallback((p: { x: number; y: number }, s: number) => {
    const img = imgRef.current;
    if (!img) return p;
    const w = img.width * s, h = img.height * s;
    return { x: Math.min(0, Math.max(VIEW - w, p.x)), y: Math.min(0, Math.max(VIEW - h, p.y)) };
  }, []);

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
    const cx = VIEW / 2, cy = VIEW / 2;
    const rx = (cx - pos.x) / (img.width * scale);
    const ry = (cy - pos.y) / (img.height * scale);
    setScale(s);
    setPos(clamp({ x: cx - rx * img.width * s, y: cy - ry * img.height * s }, s));
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

  const confirm = () => {
    const img = imgRef.current;
    if (!img) return;
    // Natural-pixel region currently framed by the viewport.
    const x = Math.max(0, Math.round(-pos.x / scale));
    const y = Math.max(0, Math.round(-pos.y / scale));
    const size = Math.round(VIEW / scale);
    const w = Math.min(size, img.width - x);
    const h = Math.min(size, img.height - y);
    onConfirm(`${x},${y},${w},${h}`);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-label="Choose profile crop">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Choose profile crop</h3>
            <p className="text-xs text-gray-400">The full photo stays; this is just the thumbnail.</p>
          </div>
          <button onClick={onCancel} aria-label="Cancel" className="p-1.5 -mr-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center gap-4">
          <div className="relative rounded-full overflow-hidden bg-gray-100 touch-none select-none ring-2 ring-emerald-200"
            style={{ width: VIEW, height: VIEW }}>
            {!ready && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}
            <canvas ref={canvasRef} width={VIEW} height={VIEW}
              onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
              className="cursor-move" />
          </div>

          <div className="flex items-center gap-2 w-full">
            <ZoomIn className="w-4 h-4 text-gray-400 shrink-0" />
            <input type="range" min={minScale} max={minScale * 4} step={0.01} value={scale}
              onChange={e => onZoom(+e.target.value)} disabled={!ready}
              className="flex-1 accent-emerald-600" />
          </div>
          <p className="text-xs text-gray-400 text-center">Drag to reposition · slide to zoom · center the face</p>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onCancel}
            className="flex-1 h-10 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={confirm} disabled={!ready}
            className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
            <Check className="w-4 h-4" /> Set as profile
          </button>
        </div>
      </div>
    </div>
  );
}
