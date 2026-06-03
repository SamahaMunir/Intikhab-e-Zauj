import { useState } from 'react';
import { cloudinaryConfig, generateUploadSignature } from '@/lib/cloudinary';

const MIN_DIM    = 200;
const MAX_BYTES  = 5 * 1024 * 1024;

// ── face-api.js Multi-source face detection ──────────────────────────────────
//
// Strategy:
// 1. Load face-api.js library + TinyFaceDetector models from multiple sources
// 2. PRIORITY: Local (/models/face-api/) → CDN fallbacks
// 3. FAIL CLOSED: If models fail to load, upload is BLOCKED (no bypass)
//
// Works in: Chrome, Firefox, Safari, Edge (all modern browsers)
// ─────────────────────────────────────────────────────────────────────────────

// face-api.js library — this CDN path IS correct (dist file, not weights)
const FACE_API_SCRIPT = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';

// Model weights — NOT in npm package. Use GitHub Pages or local copy.
// DO NOT use jsdelivr.net/.../weights — models are not bundled in npm.
const MODEL_PATHS = [
  '/models/face-api',                                              // Priority 1: local (run download script first)
  'https://justadudewhohacks.github.io/face-api.js/models',       // Priority 2: official GitHub Pages CDN
  'https://vladmandic.github.io/face-api/model',                  // Priority 3: vladmandic fork CDN
];

let faceApiReady = false;
let faceApiLoadFailed = false;
let loadingPromise: Promise<{ success: boolean; reason?: string }> | null = null;

function getFaceApi(): any {
  return (window as any).faceapi;
}

async function testModelPath(path: string): Promise<boolean> {
  try {
    console.log(`[FaceDetect] Testing model path: ${path}`);
    const manifestUrl = `${path}/tiny_face_detector_model-weights_manifest.json`;
    // GET, not HEAD — Vite SPA fallback returns 200+HTML for every HEAD request,
    // making /models/face-api look valid even when the files aren't there.
    // We must actually fetch and verify the response is JSON.
    const res = await fetch(manifestUrl);
    if (!res.ok) {
      console.log(`[FaceDetect] ✗ Model path returned ${res.status}: ${path}`);
      return false;
    }
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('text/html')) {
      console.log(`[FaceDetect] ✗ Model path returned HTML (SPA fallback, files not present): ${path}`);
      return false;
    }
    const text = await res.text();
    JSON.parse(text); // throws if not valid JSON
    console.log(`[FaceDetect] ✓ Model path accessible: ${path}`);
    return true;
  } catch (err) {
    console.log(`[FaceDetect] ✗ Model path test failed: ${path}`, err instanceof Error ? err.message : err);
    return false;
  }
}

async function findWorkingModelPath(): Promise<string | null> {
  for (const path of MODEL_PATHS) {
    if (await testModelPath(path)) return path;
  }
  console.error('[FaceDetect] ✗ No working model path found');
  return null;
}

export function resetFaceDetection(): void {
  faceApiReady = false;
  faceApiLoadFailed = false;
  loadingPromise = null;
}

async function loadFaceApiOnce(): Promise<{ success: boolean; reason?: string }> {
  if (faceApiReady) return { success: true };
  if (faceApiLoadFailed) return { success: false, reason: 'Face detection models could not load. Refresh the page and try again.' };
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      // Step 1: Load face-api.js library
      if (!getFaceApi()) {
        console.log('[FaceDetect] Loading face-api.js library…');
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector<HTMLScriptElement>(`script[data-faceapi="1"]`);
          if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('face-api.js load failed')));
            return;
          }

          const script = document.createElement('script');
          script.src = FACE_API_SCRIPT;
          script.dataset.faceapi = '1';
          script.crossOrigin = 'anonymous';
          script.onload  = () => {
            console.log('[FaceDetect] ✓ face-api.js library loaded');
            resolve();
          };
          script.onerror = () => reject(new Error('face-api.js library failed to load from CDN'));
          document.head.appendChild(script);
        });
      }

      // Step 2: Find and load TinyFaceDetector model from working path
      const fa = getFaceApi();
      if (!fa.nets.tinyFaceDetector.isLoaded) {
        console.log('[FaceDetect] TinyFaceDetector model not loaded, finding working path…');
        const modelPath = await findWorkingModelPath();
        
        if (!modelPath) {
          return { success: false, reason: 'Face detection models unavailable — no working path found' };
        }

        console.log(`[FaceDetect] Loading TinyFaceDetector model from: ${modelPath}`);
        await fa.nets.tinyFaceDetector.loadFromUri(modelPath);
        console.log('[FaceDetect] ✓ TinyFaceDetector model loaded successfully');
      }

      faceApiReady = true;
      return { success: true };
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unknown error during face detection setup';
      console.error('[FaceDetect] ✗ Setup failed:', reason);
      faceApiLoadFailed = true;
      return { success: false, reason };
    }
  })();

  return loadingPromise;
}

interface DetectionResult {
  hasFace: boolean;
  count: number;
  confidence: number;
  error?: string;
  skipped?: boolean;
  available: boolean; // ← NEW: indicates if detection was actually performed
}

async function detectHumanFace(file: File): Promise<DetectionResult> {
  try {
    console.log('[FaceDetect] Starting face detection…');
    const loadResult = await loadFaceApiOnce();

    // Fail closed: if models failed to load, block upload
    if (!loadResult.success) {
      console.error(`[FaceDetect] ✗ Detection unavailable: ${loadResult.reason}`);
      return {
        hasFace: false,
        count: 0,
        confidence: 0,
        skipped: false,
        available: false,
        error: loadResult.reason,
      };
    }

    const fa = getFaceApi();
    if (!fa) throw new Error('face-api.js not available');

    // Draw to canvas — avoids any cross-origin issues
    const bitmap = await createImageBitmap(file);
    const scale  = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(bitmap.width  * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const options = new fa.TinyFaceDetectorOptions({
      inputSize:       320,
      scoreThreshold:  0.4,
    });

    console.log('[FaceDetect] Running detection on canvas…');
    const detections = await fa.detectAllFaces(canvas, options);
    const count      = detections.length;
    const confidence = count > 0 ? Math.max(...detections.map((d: any) => d.score)) : 0;

    console.log(`[FaceDetect] ✓ Detection complete: ${count} face(s), confidence ${(confidence * 100).toFixed(1)}%`);

    return { hasFace: count > 0, count, confidence, available: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[FaceDetect] ✗ Detection error:', msg);

    // Fail closed: any detection error blocks upload
    return {
      hasFace: false,
      count: 0,
      confidence: 0,
      error: msg,
      skipped: false,
      available: false,
    };
  }
}

// ── Upload types ──────────────────────────────────────────────────────────────
export type UploadType = 'profile_photo' | 'certificate' | 'general';

export interface UploadResult {
  publicId:  string;
  url:       string;
  size:      number;
  type:      string;
  detection: DetectionResult | null;
}

// ─────────────────────────────────────────────────────────────────────────────

export function useCloudinaryUpload() {
  const [uploading,  setUploading]  = useState(false);
  const [checking,   setChecking]   = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [progress,   setProgress]   = useState(0);
  const [detection,  setDetection]  = useState<DetectionResult | null>(null);

  const uploadFile = async (
    file: File,
    type: UploadType = 'general',
    folder?: string
  ): Promise<UploadResult | null> => {
    try {
      setUploading(true);
      setError(null);
      setProgress(0);
      setDetection(null);

      const cloudFolder = folder ?? (
        type === 'profile_photo' ? 'profiles' :
        type === 'certificate'   ? 'documents' :
        'general'
      );

      // ── 1. File type ───────────────────────────────────────────────────
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (type === 'certificate') allowedTypes.push('application/pdf');

      if (!allowedTypes.includes(file.type)) {
        throw new Error(
          type === 'certificate'
            ? 'Invalid file type. Certificates must be JPEG, PNG, WebP, or PDF.'
            : 'Invalid file type. Profile photo must be JPEG, PNG, or WebP.'
        );
      }

      // ── 2. Size ────────────────────────────────────────────────────────
      if (file.size > MAX_BYTES) {
        throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum 5 MB allowed.`);
      }

      setProgress(10);

      // ── 3. Dimension check (images only) ──────────────────────────────
      if (file.type !== 'application/pdf') {
        const bmp = await createImageBitmap(file).catch(() => null);
        if (!bmp) throw new Error('Image file is corrupted or unreadable.');
        const { width: w, height: h } = bmp;
        bmp.close();
        if (w < MIN_DIM || h < MIN_DIM) {
          throw new Error(`Image resolution too low (${w}×${h}px). Minimum ${MIN_DIM}×${MIN_DIM}px required.`);
        }
      }

      setProgress(20);

      // ── 4. Face detection (profile photos only) ────────────────────────
      let localDetection: DetectionResult | null = null;

      if (type === 'profile_photo') {
        setChecking(true);
        console.log('[Upload] Face detection step…');
        localDetection = await detectHumanFace(file);
        setDetection(localDetection);
        setChecking(false);

        // Case 1: Detection failed to initialise (models unavailable) → BLOCK
        if (!localDetection.available) {
          throw new Error(
            'Face verification could not run.\n\n' +
            'This is usually a network issue loading the detection models.\n' +
            'Please:\n' +
            '• Check your internet connection\n' +
            '• Refresh the page and try again\n\n' +
            'Profile photos cannot be uploaded without face verification.'
          );
        }
        // Case 2: Detection ran but no face found → BLOCK
        if (!localDetection.hasFace) {
          throw new Error(
            'No human face detected in your photo.\n\n' +
            'Profile photos must clearly show your face.\n' +
            'The following are NOT accepted:\n' +
            '• Certificates or documents\n' +
            '• Logos or icons\n' +
            '• Animals or objects\n' +
            '• Screenshots or edited images\n' +
            '• Blurry or very dark photos\n\n' +
            'Please upload a clear selfie or portrait photo.'
          );
        }
        // Case 3: Face detected → allow
        console.log(`[Upload] ✓ Face verified — ${localDetection.count} face(s), confidence ${(localDetection.confidence * 100).toFixed(1)}%`);
      }

      setProgress(40);

      // ── 5. Cloudinary signature ────────────────────────────────────────
      const { signature, timestamp } = await generateUploadSignature(cloudFolder);
      setProgress(55);

      // ── 6. Upload ──────────────────────────────────────────────────────
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', cloudFolder);
      if (signature && timestamp) {
        fd.append('signature', signature);
        fd.append('timestamp', timestamp.toString());
        fd.append('api_key', cloudinaryConfig.apiKey);
      } else {
        fd.append('upload_preset', 'intikhab_unsigned');
      }

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/auto/upload`,
        { method: 'POST', body: fd }
      );
      const text = await response.text();
      if (!response.ok) throw new Error(`Upload failed (${response.status}): ${response.statusText}`);

      let data: Record<string, unknown>;
      try { data = JSON.parse(text); }
      catch { throw new Error('Unexpected response from Cloudinary. Please try again.'); }

      const publicId  = data.public_id as string;
      const secureUrl = data.secure_url as string;
      if (!publicId || !secureUrl) throw new Error('Cloudinary returned no URL. Please try again.');

      setProgress(100);
      console.log(`[Upload] ✅ Uploaded to Cloudinary: ${secureUrl.slice(0, 60)}…`);

      return {
        publicId, url: secureUrl,
        size: data.bytes as number,
        type: data.resource_type as string,
        detection: localDetection,
      };

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setError(msg);
      console.error('[Upload] ❌', msg.split('\n')[0]);
      return null;
    } finally {
      setUploading(false);
      setChecking(false);
    }
  };

  const uploadProfilePhoto = (file: File) => uploadFile(file, 'profile_photo');
  const uploadCertificate  = (file: File) => uploadFile(file, 'certificate');

  return {
    uploadFile, uploadProfilePhoto, uploadCertificate,
    uploading, checking, error, progress, detection,
    // Always true — face detection works in all browsers via face-api.js
    isFaceDetectionSupported: true,
  };
}
