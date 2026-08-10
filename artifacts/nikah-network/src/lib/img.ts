/**
 * Cloudinary image helpers.
 *
 * We always store the ORIGINAL full photo (so the full-screen view shows face +
 * body / height). Thumbnails/avatars are derived on the fly:
 *   - if the profile has a manual crop rect (photoCrop "x,y,w,h" in natural px),
 *     use it;
 *   - else fall back to Cloudinary's face-detection crop (g_face).
 * Non-Cloudinary / empty URLs pass through untouched.
 */

function isCloudinary(url?: string | null): url is string {
  return !!url && url.includes('/upload/');
}

/** Auto face-cropped square thumbnail (Cloudinary g_face). */
export function faceThumb(url?: string | null, size = 500): string {
  if (!url) return '';
  if (!isCloudinary(url)) return url;
  return url.replace('/upload/', `/upload/c_fill,g_face,w_${size},h_${size},q_auto,f_auto/`);
}

/** Manual crop rect string "x,y,w,h" (natural px) → Cloudinary crop transform. */
function cropTransform(url: string, crop: string, size: number): string {
  const [x, y, w, h] = crop.split(',').map(n => parseInt(n, 10));
  if ([x, y, w, h].some(n => !Number.isFinite(n)) || w <= 0 || h <= 0) return faceThumb(url, size);
  return url.replace('/upload/', `/upload/c_crop,x_${x},y_${y},w_${w},h_${h}/c_fill,w_${size},h_${size},q_auto,f_auto/`);
}

/**
 * Resolve the thumbnail URL for a profile photo: manual crop if set, else auto
 * face crop. `crop` is the stored photoCrop rect ("x,y,w,h") or empty.
 */
export function thumbUrl(url?: string | null, crop?: string | null, size = 500): string {
  if (!url) return '';
  if (!isCloudinary(url)) return url;
  if (crop && crop.trim()) return cropTransform(url, crop.trim(), size);
  return faceThumb(url, size);
}
