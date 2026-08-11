/**
 * Pass-through wrapper. Every marketing page now supplies its own chrome via
 * PublicLayout (shared PublicNavbar + PublicFooter) — the landing page uses its
 * own matching copy. This keeps one consistent navbar/footer across the site and
 * avoids the earlier double-chrome on legal pages.
 */
export function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
