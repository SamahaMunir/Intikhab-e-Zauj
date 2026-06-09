import { Link, useLocation } from "wouter";
import { useStore } from "@/lib/store";
import {
  Home, Users, Heart, Clock, MessageCircle, User, Settings, LogOut,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: "/app/dashboard",   label: "Dashboard",          icon: Home          },
  { href: "/app/matches",     label: "All Applicants",     icon: Users         },
  { href: "/app/matches",     label: "My Matches",         icon: Heart         },
  { href: "/app/proposals",   label: "Pending Proposals",  icon: Clock         },
  { href: "/app/counselling", label: "Messages",           icon: MessageCircle },
  { href: "/app/profile",     label: "My Profile",         icon: User          },
  { href: "/app/settings",    label: "Settings",           icon: Settings      },
];

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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { currentUser, logout } = useStore();

  const user = currentUser;
  const displayName = user?.name || "User";

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  return (
    <div className="flex min-h-screen bg-[#FDF8F3]">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-70 shrink-0 flex-col bg-white border-r border-[#E8DED3] shadow-warm">

        {/* Brand header */}
        <div className="relative overflow-hidden px-6 py-7
                        bg-linear-to-br from-[#059669] via-[#10B981] to-[#065F46]">
          <IslamicPattern id="geo-app-sidebar" />
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
              Applicant Portal
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-0.5">
          {navItems.map((item, idx) => {
            const isActive = location === item.href || location.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link key={`${item.href}-${idx}`} href={item.href}>
                <span className={`flex items-center gap-4 rounded-xl cursor-pointer transition-all
                                   font-semibold text-xl min-h-15 px-5 ${
                  isActive
                    ? "bg-[#10B981] text-white border-l-4 border-[#059669] shadow-sm"
                    : "text-[#1C1917] border-l-4 border-transparent hover:bg-[#FEF9EE] hover:text-[#059669]"
                }`}>
                  <Icon className="w-5 h-5 shrink-0" />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Decorative divider */}
        <div className="mx-4 h-px bg-linear-to-r from-transparent via-[#E8DED3] to-transparent" />

        {/* User + Sign Out */}
        <div className="px-4 py-5">
          <div className="mb-3 px-3 py-3 rounded-xl bg-[#FDF8F3] border border-[#E8DED3]">
            <p className="text-base font-bold text-[#1C1917] truncate">{displayName}</p>
            <p className="text-sm text-stone-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 min-h-12.5 px-5 rounded-xl
                       text-base font-semibold text-red-600 bg-red-50
                       hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
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
          <span className="text-sm font-semibold text-[#1C1917]">{displayName}</span>
        </header>

        {/* Mobile nav strip */}
        <div className="md:hidden bg-white border-b border-[#E8DED3] overflow-x-auto flex
                        whitespace-nowrap px-3 py-2 gap-2">
          {navItems.map((item, idx) => {
            const isActive = location === item.href || location.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link key={`mob-${item.href}-${idx}`} href={item.href}>
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full
                                  text-sm font-semibold whitespace-nowrap cursor-pointer
                                  transition-colors ${
                  isActive
                    ? "bg-[#10B981] text-white"
                    : "bg-[#FDF8F3] text-[#1C1917] hover:bg-[#FEF9EE] hover:text-[#059669]"
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
