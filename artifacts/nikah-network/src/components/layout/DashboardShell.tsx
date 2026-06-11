import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { LogOut, Menu, X, Search, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { LogoMark } from '@/components/layout/PublicLayout';

export interface DashNav {
  href: string;
  label: string;
  icon: React.ElementType;
}

/**
 * Unified dashboard shell — used by StaffLayout + AppLayout so every role-based
 * dashboard shares one design system (CRM-style sidebar, green active state,
 * search header, icon sign-out). No username is displayed anywhere.
 */
export default function DashboardShell({
  navItems, portalLabel, titles, onLogout, children,
}: {
  navItems: DashNav[];
  portalLabel: string;
  titles: Record<string, string>;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);            // mobile drawer
  const [sidebarOpen, setSidebarOpen] = useState(true); // desktop collapse

  const titleFor = () => {
    for (const [p, t] of Object.entries(titles)) if (location.startsWith(p)) return t;
    return portalLabel;
  };
  const isActive = (href: string) => location === href || location.startsWith(href + '/');

  // ── Sidebar pieces ───────────────────────────────────────────────────────────
  const Brand = () => (
    <div className="flex items-center gap-3 px-5 h-16 shrink-0 border-b border-gray-100">
      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
        <LogoMark size={24} />
      </div>
      <div className="min-w-0">
        <p className="text-base font-bold text-[#1C1917] leading-none truncate">Intikhab-e-Zauj</p>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-1">
          {portalLabel}
        </p>
      </div>
    </div>
  );

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      {navItems.map((item, idx) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link key={`${item.href}-${idx}`} href={item.href}>
            <span onClick={onNavigate}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold
                          cursor-pointer transition-colors ${
                active
                  ? 'bg-emerald-50 text-[#10B981]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-[#10B981]'
              }`}>
              <Icon className={`w-5 h-5 shrink-0 transition-colors ${
                active ? 'text-[#10B981]' : 'text-gray-400 group-hover:text-[#10B981]'
              }`} />
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );

  const SignOut = () => (
    <div className="px-3 py-4 border-t border-gray-100 shrink-0">
      <button onClick={onLogout}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold
                   text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
        <LogOut className="w-5 h-5 shrink-0" />
        Sign Out
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F4F6F5]">

      {/* ── Desktop sidebar (collapsible, fade + slide) ── */}
      <aside className={`hidden md:block shrink-0 overflow-hidden
                         transition-[width] duration-[350ms] ease-in-out
                         ${sidebarOpen ? 'w-64' : 'w-0'}`}>
        <div className={`w-64 h-full flex flex-col bg-white border-r border-gray-100
                         transition-all duration-[350ms] ease-in-out
                         ${sidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}>
          <Brand />
          <NavList />
          <SignOut />
        </div>
      </aside>

      {/* ── Mobile drawer ── */}
      <div className={`md:hidden fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/40 transition-opacity duration-200
                         ${open ? 'opacity-100' : 'opacity-0'}`}
             onClick={() => setOpen(false)} aria-hidden="true" />
        <aside className={`absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-2xl
                           transition-transform duration-200 ease-out
                           ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          <button onClick={() => setOpen(false)} aria-label="Close menu"
            className="absolute top-4 right-3 p-1.5 text-gray-400 hover:text-[#1C1917] z-10">
            <X className="w-5 h-5" />
          </button>
          <Brand />
          <NavList onNavigate={() => setOpen(false)} />
          <SignOut />
        </aside>
      </div>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4
                           bg-white border-b border-gray-100 px-5 md:px-8">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {/* Mobile: open drawer */}
            <button className="md:hidden p-2 -ml-2 text-gray-500 hover:text-[#10B981]"
                    onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="w-6 h-6" />
            </button>
            {/* Desktop: collapse / expand sidebar */}
            <button
              className="hidden md:inline-flex p-2 -ml-2 rounded-lg text-gray-500
                         hover:text-[#10B981] hover:bg-emerald-50 transition-colors"
              onClick={() => setSidebarOpen(v => !v)}
              aria-label={sidebarOpen ? 'Hide dashboard menu' : 'Show dashboard menu'}
              aria-pressed={sidebarOpen}
              title={sidebarOpen ? 'Hide menu' : 'Show menu'}
            >
              {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-[#1C1917] truncate">{titleFor()}</h1>
          </div>

          {/* Search (visual) */}
          <div className="relative hidden sm:block">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search" placeholder="Search"
              className="h-11 w-56 lg:w-72 rounded-xl bg-[#F4F6F5] border border-gray-200 pl-10 pr-4
                         text-sm text-[#1C1917] placeholder-gray-400 focus:outline-none
                         focus:border-[#10B981] focus:bg-white transition-colors"
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
