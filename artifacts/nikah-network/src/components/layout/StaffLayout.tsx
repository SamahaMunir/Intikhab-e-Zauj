import { useStore } from "@/lib/store";
import {
  LayoutDashboard, Users, Heart, FileText, ShieldCheck,
  HeartHandshake, ClipboardList, Settings, UserCog,
} from "lucide-react";
import DashboardShell, { type DashNav } from "@/components/layout/DashboardShell";

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

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, logout } = useStore();

  const isAdmin =
    currentUser?.role === 'admin' ||
    (typeof window !== 'undefined' &&
      JSON.parse(localStorage.getItem('user') || '{}')?.role === 'admin');

  const baseNavItems: DashNav[] = [
    { href: "/staff/dashboard",   label: "Dashboard",      icon: LayoutDashboard },
    { href: "/staff/profiles",    label: "Profiles",       icon: Users           },
    { href: "/staff/matches",     label: "Matches",        icon: Heart           },
    { href: "/staff/proposals",   label: "Proposals",      icon: FileText        },
    { href: "/staff/messages",    label: "Q&A Moderation", icon: ShieldCheck     },
    { href: "/staff/counselling", label: "Counselling",    icon: HeartHandshake  },
    { href: "/staff/audit",       label: "Audit Logs",     icon: ClipboardList   },
    { href: "/staff/config",      label: "Settings",       icon: Settings        },
  ];

  const navItems: DashNav[] = isAdmin
    ? [{ href: "/staff/admin-panel", label: "Staff Management", icon: UserCog }, ...baseNavItems]
    : baseNavItems;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    logout();
    window.location.href = "/staff-login";
  };

  return (
    <DashboardShell
      navItems={navItems}
      portalLabel={isAdmin ? 'Admin Portal' : 'Staff Portal'}
      titles={PAGE_TITLES}
      onLogout={handleLogout}
    >
      {children}
    </DashboardShell>
  );
}
