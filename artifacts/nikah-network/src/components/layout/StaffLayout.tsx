import { Link, useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { Users, FileText, CheckCircle, Shield, AlertTriangle, LogOut, Settings, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { currentUser, logout } = useStore();

  const navItems = [
    { href: "/staff/dashboard", label: "Dashboard", icon: BarChart },
    { href: "/staff/profiles", label: "Profiles", icon: Users },
    { href: "/staff/matches", label: "Matches", icon: HeartIcon },
    { href: "/staff/proposals", label: "Proposals", icon: FileText },
    { href: "/staff/messages", label: "Q&A Moderation", icon: Shield },
    { href: "/staff/counselling", label: "Counselling", icon: CheckCircle },
    { href: "/staff/audit", label: "Audit Logs", icon: AlertTriangle },
    { href: "/staff/config", label: "Settings", icon: Settings },
  ];

  function HeartIcon(props: any) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    )
  }

  return (
    <div className="flex min-h-[100dvh] bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border bg-primary/10">
          <Link href="/" className="flex items-center gap-2 text-primary font-serif font-bold text-xl">
            <HeartIcon className="h-6 w-6 fill-primary" />
            Nikah Network
          </Link>
          <div className="mt-1 text-xs text-primary font-medium uppercase tracking-wider">Staff Portal</div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <span className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}>
                    <item.icon className={`h-4 w-4 ${isActive ? "" : "text-muted-foreground"}`} />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-4 px-2">
            <Avatar className="h-10 w-10 border border-primary/20">
              <AvatarImage src={currentUser?.avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground font-serif">{currentUser?.name?.charAt(0) || "S"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{currentUser?.name || "Staff"}</span>
              <span className="text-xs text-muted-foreground truncate">{currentUser?.email}</span>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={() => {
            logout();
            window.location.href = "/";
          }}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4">
          <Link href="/" className="flex items-center gap-2 text-primary font-serif font-bold text-lg">
            <HeartIcon className="h-5 w-5 fill-primary" />
            Nikah Network
          </Link>
          <div className="flex items-center gap-2">
             <Avatar className="h-8 w-8 border border-primary/20">
              <AvatarImage src={currentUser?.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary font-serif">{currentUser?.name?.charAt(0) || "S"}</AvatarFallback>
            </Avatar>
          </div>
        </header>
        
        {/* Mobile Nav */}
        <div className="md:hidden border-b bg-muted/20 overflow-x-auto flex whitespace-nowrap p-2 gap-2">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <span className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-background text-muted-foreground border shadow-sm"
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-muted/5">
          {children}
        </main>
      </div>
    </div>
  );
}