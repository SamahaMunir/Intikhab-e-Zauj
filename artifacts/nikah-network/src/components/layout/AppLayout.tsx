import { useStore } from "@/lib/store";
import {
  LayoutDashboard, Heart, Clock, MessageCircle, User, Settings,
} from "lucide-react";
import DashboardShell, { type DashNav } from "@/components/layout/DashboardShell";

const navItems: DashNav[] = [
  { href: "/app/dashboard",   label: "Dashboard",         icon: LayoutDashboard },
  { href: "/app/matches",     label: "Matches",           icon: Heart           },
  { href: "/app/proposals",   label: "Proposals",         icon: Clock           },
  { href: "/app/counselling", label: "Counselling",       icon: MessageCircle   },
  { href: "/app/profile",     label: "My Profile",        icon: User            },
  { href: "/app/settings",    label: "Settings",          icon: Settings        },
];

const PAGE_TITLES: Record<string, string> = {
  '/app/dashboard':       'Dashboard',
  '/app/matches':         'Matches',
  '/app/match-detail':    'Match Details',
  '/app/proposals':       'Proposals',
  '/app/counselling':     'Counselling',
  '/app/profile':         'My Profile',
  '/app/profile-wizard':  'Complete Profile',
  '/app/payment':         'Payment',
  '/app/settings':        'Settings',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useStore();

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  return (
    <DashboardShell
      navItems={navItems}
      portalLabel="Applicant Portal"
      titles={PAGE_TITLES}
      onLogout={handleLogout}
    >
      {children}
    </DashboardShell>
  );
}
