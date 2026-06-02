import { useState } from 'react';
import { cloudinaryConfig, generateUploadSignature } from '@/lib/cloudinary';

const MIN_DIM   = 200;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// ── Upload type ───────────────────────────────────────────────────────────────
// 'profile_photo' → face detection REQUIRED, stored in 'profiles/' folder
// 'certificate'   → no face detection, stored in 'documents/' folder
// 'general'       → no face detection, stored in specified folder
export type UploadType = 'profile_photo' | 'certificate' | 'general';

// ── Face detection ────────────────────────────────────────────────────────────
//
// STRICT: only Chrome/Edge (window.FaceDetector) is supported.
// Firefox/Safari → upload is BLOCKED with a clear browser message.
// No heuristic fallback — unreliable pixel analysis gave too many false positives.
//
// Correct usage: draw ImageBitmap → HTMLCanvasElement → detect(canvas)
// Directly passing ImageBitmap to detect() silently fails in some Chrome builds.
// ─────────────────────────────────────────────────────────────────────────────

export type FaceCheckResult =
  | { method: 'api';           hasFace: boolean }
  | { method: 'unsupported';   hasFace: false; message: string }
  | { method: 'corrupt';       hasFace: false; message: string };

function isFaceDetectorSupported(): boolean {
  return typeof window !== 'undefined' && 'FaceDetector' in window;
}

async function drawToCanvas(file: File): Promise<HTMLCanvasElement | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width  = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close(); return null; }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    return canvas;
  } catch {
    return null;
  }
}

async function detectFace(file: File): Promise<FaceCheckResult> {
  // Hard block: no FaceDetector → upload refused
  if (!isFaceDetectorSupported()) {
    return {
      method: 'unsupported',
      hasFace: false,
      message:
        'Face verification requires Google Chrome or Microsoft Edge (version 70+). ' +
        'Please open this page in Chrome or Edge to upload your profile photo.',
    };
  }

  // Draw to canvas (most reliable input for FaceDetector across Chrome versions)
  const canvas = await drawToCanvas(file);
  if (!canvas) {
    return {
      method: 'corrupt',
      hasFace: false,
      message: 'Image file is corrupted or cannot be opened. Please try a different photo.',
    };
  }

  try {
    // @ts-expect-error – experimental Shape Detection API
    const fd = new window.FaceDetector({ fastMode: false, maxDetectedFaces: 10 });
    const faces: unknown[] = await fd.detect(canvas);
    return { method: 'api', hasFace: faces.length > 0 };
  } catch (err) {
    // FaceDetector threw (e.g. SecurityError on some builds) — block rather than bypass
    return {
      method: 'unsupported',
      hasFace: false,
      message:
        'Face detection failed unexpectedly. Please try again or use a different browser. ' +
        `(${err instanceof Error ? err.message : 'unknown error'})`,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export interface UploadResult {
  publicId:  string;
  url:       string;
  size:      number;
  type:      string;
  faceCheck: FaceCheckResult | null;
}

export function useCloudinaryUpload() {
  const [uploading,  setUploading]  = useState(false);
  const [checking,   setChecking]   = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [progress,   setProgress]   = useState(0);
  const [faceStatus, setFaceStatus] = useState<FaceCheckResult | null>(null);

  /**
   * uploadFile
   * @param file     File to upload
   * @param type     'profile_photo' | 'certificate' | 'general'
   * @param folder   Cloudinary folder override (optional)
   */
  const uploadFile = async (
    file: File,
    type: UploadType = 'general',
    folder?: string
  ): Promise<UploadResult | null> => {
    try {
      setUploading(true);
      setError(null);
      setProgress(0);
      setFaceStatus(null);

      // Resolve folder from type
      const cloudFolder = folder ?? (
        type === 'profile_photo' ? 'profiles' :
        type === 'certificate'   ? 'documents' :
        'general'
      );

      // ── 1. File type validation ────────────────────────────────────────
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (type === 'certificate') {
        // Certificates may also be PDF
        allowedTypes.push('application/pdf');
      }
      if (!allowedTypes.includes(file.type)) {
        throw new Error(
          type === 'certificate'
            ? 'Invalid file type. Certificates must be JPEG, PNG, WebP, or PDF.'
            : 'Invalid file type. Profile photo must be JPEG, PNG, or WebP.'
        );
      }

      // ── 2. Size validation ─────────────────────────────────────────────
      if (file.size > MAX_BYTES) {
        throw new Error(
          `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum 5 MB allowed.`
        );
      }

      setProgress(10);

      // ── 3. Image dimension validation (skip for PDF) ───────────────────
      if (file.type !== 'application/pdf') {
        const bmp = await createImageBitmap(file).catch(() => null);
        if (!bmp) throw new Error('Image is corrupted or cannot be opened.');
        const { width: w, height: h } = bmp;
        bmp.close();
        if (w < MIN_DIM || h < MIN_DIM) {
          throw new Error(
            `Image resolution too low (${w}×${h}px). Minimum ${MIN_DIM}×${MIN_DIM}px required.`
          );
        }
      }

      setProgress(20);

      // ── 4. Face detection (profile photos only — strictly enforced) ────
      let localFaceCheck: FaceCheckResult | null = null;

      if (type === 'profile_photo') {
        setChecking(true);
        localFaceCheck = await detectFace(file);
        setFaceStatus(localFaceCheck);
        setChecking(false);

        if (!localFaceCheck.hasFace) {
          const msg =
            localFaceCheck.method === 'api'
              ? 'No human face detected in your photo.\n\n' +
                'Profile photos must show a real person\'s face clearly.\n' +
                'Please upload a selfie or portrait photo. The following are NOT accepted:\n' +
                '• Certificates or documents\n• Logos or icons\n• Animals or objects\n' +
                '• Screenshots\n• Blurry or dark images'
              : (localFaceCheck as { message: string }).message;
          throw new Error(msg);
        }
      }

      setProgress(40);

      // ── 5. Cloudinary signature ────────────────────────────────────────
      const { signature, timestamp } = await generateUploadSignature(cloudFolder);
      setProgress(55);

      // ── 6. Upload to Cloudinary ────────────────────────────────────────
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', cloudFolder);
      if (signature && timestamp) {
        formData.append('signature', signature);
        formData.append('timestamp', timestamp.toString());
        formData.append('api_key', cloudinaryConfig.apiKey);
      } else {
        formData.append('upload_preset', 'intikhab_unsigned');
      }

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/auto/upload`,
        { method: 'POST', body: formData }
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
      return { publicId, url: secureUrl, size: data.bytes as number, type: data.resource_type as string, faceCheck: localFaceCheck };

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      return null;
    } finally {
      setUploading(false);
      setChecking(false);
    }
  };

  // Convenience wrappers
  const uploadProfilePhoto = (file: File) => uploadFile(file, 'profile_photo');
  const uploadCertificate  = (file: File) => uploadFile(file, 'certificate');

  return {
    uploadFile, uploadProfilePhoto, uploadCertificate,
    uploading, checking, error, progress, faceStatus,
    isFaceDetectionSupported: isFaceDetectorSupported(),
  };
}
