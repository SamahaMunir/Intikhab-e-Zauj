import { Link, useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { Heart, Home, Users, MessageSquare, User, Settings, Info, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { currentUser, logout } = useStore();

  const navItems = [
    { href: "/app/dashboard", label: "Dashboard", icon: Home },
    { href: "/app/matches", label: "Matches", icon: Heart },
    { href: "/app/proposals", label: "Proposals", icon: MessageSquare },
    { href: "/app/profile", label: "Profile", icon: User },
    { href: "/app/counselling", label: "Counselling", icon: Users },
    { href: "/app/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-[100dvh] bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar">
        <div className="p-6 border-b border-sidebar-border bg-primary/5">
          <Link href="/" className="flex items-center gap-2 text-primary font-serif font-bold text-xl">
            <Heart className="h-6 w-6 fill-primary" />
            Intikhab-e-Zauj
          </Link>
          <div className="mt-1 text-xs text-muted-foreground font-medium uppercase tracking-wider">Applicant Portal</div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <span className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive 
                      ? "bg-primary text-primary-foreground" 
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
              <AvatarFallback className="bg-primary/10 text-primary font-serif">{currentUser?.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{currentUser?.name || "User"}</span>
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
            <Heart className="h-5 w-5 fill-primary" />
            Intikhab-e-Zauj
          </Link>
          <div className="flex items-center gap-2">
             <Avatar className="h-8 w-8 border border-primary/20">
              <AvatarImage src={currentUser?.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary font-serif">{currentUser?.name?.charAt(0) || "U"}</AvatarFallback>
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

        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-muted/10">
          {children}
        </main>
      </div>
    </div>
  );
}
