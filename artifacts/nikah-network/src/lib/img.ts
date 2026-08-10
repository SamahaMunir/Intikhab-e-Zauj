/**
 * Cloudinary image helpers.
 *
 * We store the ORIGINAL full photo (so the full-screen view shows face + body /
 * height). Thumbnails/avatars are derived on the fly with Cloudinary's
 * face-detection crop, so profile cards focus on the face.
 */

/** Face-cropped square thumbnail (Cloudinary g_face). Non-Cloudinary URLs pass through. */
export function faceThumb(url?: string | null, size = 500): string {
  if (!url) return '';
  if (!url.includes('/upload/')) return url; // not a Cloudinary delivery URL
  // Avoid double-transforming if a transform is already present right after /upload/.
  return url.replace('/upload/', `/upload/c_fill,g_face,w_${size},h_${size},q_auto,f_auto/`);
}
