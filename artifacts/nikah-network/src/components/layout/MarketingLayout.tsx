import { Link, useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Heart, Home, Users, MessageSquare, User, Settings, Info } from "lucide-react";

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useStore();
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary font-serif font-bold text-xl">
            <Heart className="h-6 w-6 fill-primary" />
            Intikhab-e-Zauj
          </Link>
          
          <nav className="hidden md:flex gap-6 items-center">
            <Link href="/" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/" ? "text-primary" : "text-muted-foreground"}`}>Home</Link>
            <Link href="/about" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/about" ? "text-primary" : "text-muted-foreground"}`}>About Us</Link>
            <Link href="/how-it-works" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/how-it-works" ? "text-primary" : "text-muted-foreground"}`}>How it Works</Link>
            <Link href="/counselling" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/counselling" ? "text-primary" : "text-muted-foreground"}`}>Counselling</Link>
            <Link href="/pricing" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/pricing" ? "text-primary" : "text-muted-foreground"}`}>Pricing</Link>
          </nav>
          
          <div className="flex items-center gap-4">
            {currentUser ? (
              <Link href={currentUser.role === "staff" || currentUser.role === "admin" ? "/staff/dashboard" : "/app/dashboard"}>
                <Button variant="default">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">Log In</Button>
                </Link>
                <Link href="/register">
                  <Button variant="default">Register</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        {children}
      </main>
      
      <footer className="border-t bg-muted/40 py-12 md:py-16">
        <div className="container grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 text-primary font-serif font-bold text-xl mb-4">
              <Heart className="h-6 w-6 fill-primary" />
              Intikhab-e-Zauj
            </Link>
            <p className="text-muted-foreground text-sm max-w-sm">
              A secure, staff-controlled matrimonial platform by Falah Khandan Center (Women Commission, Lahore). Where families find barakah in a safe, dignified environment.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/how-it-works" className="hover:text-primary transition-colors">How it Works</Link></li>
              <li><Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
              <li><Link href="/counselling" className="hover:text-primary transition-colors">Counselling Services</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link href="/faq" className="hover:text-primary transition-colors">FAQs</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="container mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Intikhab-e-Zauj. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
