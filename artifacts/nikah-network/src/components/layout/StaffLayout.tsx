import { Link, useLocation } from "wouter";
import { useStore } from "@/lib/store";

const PAGE_TITLES: Record<string, string> = {
  '/staff/dashboard':        'Dashboard',
  '/staff/profiles':         'Applicant Profiles',
  '/staff/matches':          'Staff Matches',
  '/staff/proposals':        'Proposals',
  '/staff/messages':         'Q&A Moderation',
  '/staff/counselling':      'Counselling',
  '/staff/audit':            'Audit Logs',
  '/staff/config':           'Settings',
  '/staff/admin-panel':      'Staff Management',
  '/staff/data-entry':       'Data Entry',
  '/staff/profile-approval': 'Profile Approval',
};

function getPageTitle(loc: string): string {
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (loc.startsWith(path)) return title;
  }
  return 'Staff Portal';
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function IslamicPattern({ id }: { id: string }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={id} x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M18 2 L21.5 14.5 L34 18 L21.5 21.5 L18 34 L14.5 21.5 L2 18 L14.5 14.5 Z"
            fill="none" stroke="white" strokeWidth="0.7" opacity="0.45" />
          <circle cx="18" cy="18" r="2.5" fill="white" opacity="0.25" />
          <circle cx="0"  cy="0"  r="1"   fill="white" opacity="0.18" />
          <circle cx="36" cy="0"  r="1"   fill="white" opacity="0.18" />
          <circle cx="0"  cy="36" r="1"   fill="white" opacity="0.18" />
          <circle cx="36" cy="36" r="1"   fill="white" opacity="0.18" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { currentUser, logout } = useStore();

  const isAdmin =
    currentUser?.role === 'admin' ||
    (typeof window !== 'undefined' &&
      JSON.parse(localStorage.getItem('user') || '{}')?.role === 'admin');

  const baseNavItems = [
    { href: "/staff/dashboard",      label: "Dashboard" },
    { href: "/staff/profiles",       label: "Profiles" },
    { href: "/staff/matches",        label: "Matches" },
    { href: "/staff/proposals",      label: "Proposals" },
    { href: "/staff/messages",       label: "Q&A Moderation" },
    { href: "/staff/counselling",    label: "Counselling" },
    { href: "/staff/audit",          label: "Audit Logs" },
    { href: "/staff/config",         label: "Settings" },
  ];

  const navItems = isAdmin
    ? [{ href: "/staff/admin-panel", label: "Staff Management" }, ...baseNavItems]
    : baseNavItems;

  const user =
    currentUser ||
    (typeof window !== 'undefined' && JSON.parse(localStorage.getItem('user') || '{}'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    logout();
    window.location.href = "/staff-login";
  };

  return (
    <div className="flex min-h-screen bg-[#FDF8F3]">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-72 shrink-0 flex-col bg-white border-r border-[#E8DED3] shadow-warm">

        {/* Brand header — Islamic treatment */}
        <div className="relative overflow-hidden px-6 py-7
                        bg-linear-to-br from-[#059669] via-[#10B981] to-[#065F46]">
          <IslamicPattern id="geo-staff-sidebar" />
          <div className="relative z-10">
            <p className="font-amiri text-white/55 text-sm mb-1.5 text-center tracking-widest">
              بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
            </p>
            <Link href="/">
              <span className="block text-2xl font-bold text-white tracking-tight cursor-pointer
                               hover:text-white/90 transition-colors">
                Intikhab-e-Zauj
              </span>
            </Link>
            <p className="mt-1.5 text-xs font-semibold text-white/55 uppercase tracking-[0.15em]">
              {isAdmin ? 'Admin Portal' : 'Staff Portal'}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <span className={`flex items-center px-5 py-3.5 rounded-xl text-base font-semibold
                                  transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#10B981] text-white shadow-sm"
                    : "text-[#1C1917] hover:bg-[#FEF9EE] hover:text-[#059669]"
                }`}>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white mr-3 shrink-0 opacity-80" />
                  )}
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Decorative divider */}
        <div className="mx-4 h-px bg-linear-to-r from-transparent via-[#E8DED3] to-transparent" />

        {/* User block */}
        <div className="px-4 py-5">
          <div className="mb-3 px-3 py-3 rounded-xl bg-[#FDF8F3] border border-[#E8DED3]">
            <p className="text-base font-bold text-[#1C1917] truncate">{user?.name || 'Staff'}</p>
            <p className="text-sm text-stone-400 truncate">{user?.email}</p>
            <p className="mt-0.5 text-sm font-semibold text-[#10B981] capitalize">
              {user?.role || 'staff'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full min-h-12.5 px-5 rounded-xl text-base font-semibold
                       text-red-600 bg-red-50 hover:bg-red-100 transition-colors text-left"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 flex h-16 items-center justify-between
                           bg-white border-b border-[#E8DED3] px-5 shadow-warm">
          <Link href="/">
            <span className="text-xl font-bold text-[#10B981] cursor-pointer font-amiri">
              Intikhab-e-Zauj
            </span>
          </Link>
          <span className="text-sm font-semibold text-[#1C1917]">{user?.name || 'Staff'}</span>
        </header>

        {/* Mobile nav strip */}
        <div className="md:hidden bg-white border-b border-[#E8DED3] overflow-x-auto flex
                        whitespace-nowrap px-3 py-2 gap-2">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold
                                  whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? "bg-[#10B981] text-white"
                    : "bg-[#FDF8F3] text-[#1C1917] hover:bg-[#FEF9EE] hover:text-[#059669]"
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Desktop content header */}
        <div className="hidden md:flex h-20 shrink-0 items-center justify-between
                        bg-white border-b border-[#E8DED3] px-8
                        shadow-[0_2px_0_0_#10B981] border-b-4 border-b-[#10B981]">
          <p className="text-3xl font-bold text-[#1C1917] font-amiri">
            {getPageTitle(location)}
          </p>
          <div className="flex items-center gap-8">
            <span className="text-base text-stone-400">{todayLabel()}</span>
            <div className="text-right">
              <p className="text-base font-bold text-[#1C1917]">{user?.name || 'Staff'}</p>
              <p className="text-sm font-semibold text-[#10B981] capitalize">{user?.role || 'staff'}</p>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#FDF8F3]">
          {children}
        </main>
      </div>
    </div>
  );
}
