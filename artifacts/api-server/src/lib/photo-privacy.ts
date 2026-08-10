/**
 * Female-photo privacy gate.
 *
 * Female profile photos are blurred for male applicants until the female
 * expresses interest in that specific proposal. Staff always see clear photos;
 * a profile owner always sees their own photo clear.
 *
 * Enforced SERVER-SIDE: for a blurred view we deliver a downscaled + heavily
 * blurred Cloudinary URL and never send the original, so the clear image cannot
 * be recovered from the network response (a client-only blur would leak it).
 */

/** Downscaled + heavy-blur Cloudinary transform. Original is not recoverable. */
export function blurPhotoUrl(url?: string | null): string {
  if (!url) return '';
  if (!url.includes('/upload/')) return url; // non-Cloudinary → pass through
  return url.replace('/upload/', '/upload/w_400,c_limit,e_blur:2000,q_auto,f_auto/');
}

/** Should this viewer see `target`'s photo blurred? Female photos only. */
export function shouldBlurFemalePhoto(opts: {
  targetGender?: string;
  targetId?: string;
  viewerRole?: string;
  viewerId?: string;
  revealed?: boolean; // female granted this viewer access (interested in this proposal)
}): boolean {
  const { targetGender, targetId, viewerRole, viewerId, revealed } = opts;
  if (targetGender !== 'female') return false; // only female photos are gated
  if (viewerRole === 'staff' || viewerRole === 'admin') return false; // staff see clear
  if (targetId && viewerId && targetId === viewerId) return false; // own photo
  return !revealed;
}

/**
 * Blur a candidate/profile object in place for the given viewer, and set a
 * `photoBlurred` flag the client can use to render a lock overlay.
 */
export function applyPhotoPrivacy(
  target: any,
  opts: { viewerRole?: string; viewerId?: string; revealed?: boolean }
): void {
  if (!target) return;
  if (
    shouldBlurFemalePhoto({
      targetGender: target.gender,
      targetId: target._id?.toString?.(),
      viewerRole: opts.viewerRole,
      viewerId: opts.viewerId,
      revealed: opts.revealed,
    })
  ) {
    target.photo = blurPhotoUrl(target.photo);
    target.photoBlurred = true;
  }
}
