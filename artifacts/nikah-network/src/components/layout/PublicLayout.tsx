/**
 * Shared chrome for public marketing pages (/, /about, …).
 * Exports: LogoMark, GeoPattern, RevealWrapper, PublicNavbar, PublicFooter, PublicLayout.
 * Nav/footer match the landing page exactly.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { Menu, X, Shield, Phone, Mail, MapPin } from 'lucide-react';

// ── Logo mark — Islamic star + heart + crescent ──────────────────────────────
export function LogoMark({ size = 38, light = false }: { size?: number; light?: boolean }) {
  const fill   = light ? 'white'                  : '#10B981';
  const faded  = light ? 'rgba(255,255,255,0.15)' : 'rgba(16,185,129,0.12)';
  const stroke = light ? 'rgba(255,255,255,0.3)'  : 'rgba(16,185,129,0.35)';
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none"
         xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M22 2 L25.5 12.5 L36 9.5 L33 20 L43.5 22 L33 24 L36 34.5 L25.5 31.5 L22 42 L18.5 31.5 L8 34.5 L11 24 L0.5 22 L11 20 L8 9.5 L18.5 12.5 Z"
            fill={faded} stroke={stroke} strokeWidth="0.6"/>
      <path d="M22 11 L31 22 L22 33 L13 22 Z" fill={faded} stroke={stroke} strokeWidth="0.5"/>
      <path d="M22 30.5 C16.5 26.5 11 21.5 11 16.5 C11 13 13.3 10.5 16.5 10.5 C18.5 10.5 20.3 11.6 22 13.4 C23.7 11.6 25.5 10.5 27.5 10.5 C30.7 10.5 33 13 33 16.5 C33 21.5 27.5 26.5 22 30.5 Z"
            fill={fill}/>
      <path d="M25.5 13.5 C25.5 16.8 22.9 19.5 19.5 19.5 C18.4 19.5 17.5 19.2 16.7 18.7 C18.2 21.2 20.9 22.8 24 22.8 C28.4 22.8 32 19.2 32 14.8 C32 12 30.5 9.5 28.2 8.3 C27.2 9.9 25.5 11.5 25.5 13.5 Z"
            fill="white" fillOpacity={light ? 0.35 : 0.55}/>
    </svg>
  );
}

// ── Islamic geometric SVG ─────────────────────────────────────────────────────
export function GeoPattern({ id, opacity = 0.08 }: { id: string; opacity?: number }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none select-none"
         xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id={id} x="0" y="0" width="44" height="44" patternUnits="userSpaceOnUse">
          <path d="M22 2 L26.5 17.5 L42 22 L26.5 26.5 L22 42 L17.5 26.5 L2 22 L17.5 17.5 Z"
                fill="none" stroke="white" strokeWidth="0.7" opacity="0.6"/>
          <circle cx="22" cy="22" r="3" fill="white" opacity="0.3"/>
          <circle cx="0"  cy="0"  r="1.5" fill="white" opacity="0.2"/>
          <circle cx="44" cy="0"  r="1.5" fill="white" opacity="0.2"/>
          <circle cx="0"  cy="44" r="1.5" fill="white" opacity="0.2"/>
          <circle cx="44" cy="44" r="1.5" fill="white" opacity="0.2"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} opacity={opacity}/>
    </svg>
  );
}

// ── Scroll-reveal wrapper ─────────────────────────────────────────────────────
export function RevealWrapper({
  children, delay = 0, className = '',
}: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const t = setTimeout(() => {
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
        { threshold: 0.08 }
      );
      obs.observe(el);
      return () => obs.disconnect();
    }, delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${
      vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
    } ${className}`}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC NAVBAR
// ─────────────────────────────────────────────────────────────────────────────
type NavLink = { label: string; href: string; page?: boolean };

const NAV_LINKS: NavLink[] = [
  { label: 'About Us',        href: '/about',  page: true },
  { label: 'How It Works',    href: '#how'                },
  { label: 'Q&A System',      href: '#qa'                 },
  { label: 'Success Stories', href: '#stats'              },
  { label: 'Counselling',     href: '#counsel'            },
  { label: 'Contact',         href: '#contact'            },
];

export function PublicNavbar({ alwaysSolid = false }: { alwaysSolid?: boolean }) {
  const [scrolled, setScrolled] = useState(alwaysSolid);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (alwaysSolid) return;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => { setScrolled(window.scrollY > 20); ticking = false; });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [alwaysSolid]);

  const handleLink = (l: NavLink) => {
    setOpen(false);
    if (l.page) { window.location.href = l.href; return; }
    // Anchor: scroll if section exists on this page, else jump to landing + hash
    const el = document.querySelector(l.href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else window.location.href = '/' + l.href;
  };

  const solid  = 'bg-white/96 backdrop-blur-md shadow-[0_2px_20px_rgba(180,120,40,0.10)]';
  const trans  = 'bg-transparent';
  const txtNav = scrolled ? 'text-[#1C1917]' : 'text-white';
  const hover  = scrolled ? 'hover:text-[#10B981] hover:bg-[#FEF9EE]' : 'hover:text-white hover:bg-white/10';

  return (
    <nav className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? solid : trans}`}
         role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-5 h-18 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/">
          <span className="flex items-center gap-3 cursor-pointer shrink-0">
            <div className={`rounded-xl p-1 transition-colors ${
              scrolled ? 'bg-[#10B981]' : 'bg-white/15 backdrop-blur-sm'
            }`}>
              <LogoMark size={34} light />
            </div>
            <div>
              <span className={`font-amiri text-xl font-bold leading-none transition-colors ${
                scrolled ? 'text-[#10B981]' : 'text-white'
              }`}>Intikhab-e-Zauj</span>
              <p className={`text-xs font-semibold uppercase tracking-wider leading-none mt-1 ${
                scrolled ? 'text-stone-400' : 'text-white/50'
              }`}>Staff-Mediated Matrimonial</p>
            </div>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-0.5" role="menubar">
          {NAV_LINKS.map(l => (
            <button key={l.href} onClick={() => handleLink(l)} role="menuitem"
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${txtNav} ${hover}`}>
              {l.label}
            </button>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden lg:flex items-center gap-2.5 shrink-0">
          <Link href="/staff-login">
            <span className={`cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-lg
                              text-sm font-semibold transition-colors ${txtNav} ${hover}`}>
              <Shield className="w-4 h-4" aria-hidden="true"/> Staff Login
            </span>
          </Link>
          <Link href="/login">
            <span className={`cursor-pointer px-5 py-2.5 rounded-xl text-sm font-bold
                              border-2 transition-colors ${
              scrolled ? 'border-[#10B981] text-[#10B981] hover:bg-emerald-50'
                       : 'border-white/50 text-white hover:bg-white/10'
            }`}>Login</span>
          </Link>
          <Link href="/quick-register">
            <span className="cursor-pointer px-5 py-2.5 rounded-xl text-sm font-bold text-white
                             bg-[#D97706] hover:bg-[#B45309] transition-all shadow-sm
                             hover:scale-[1.02] hover:shadow-[0_4px_16px_rgba(217,119,6,0.35)]">
              Register Free
            </span>
          </Link>
        </div>

        {/* Hamburger */}
        <button className={`lg:hidden p-2 rounded-lg transition-colors ${txtNav}`}
                onClick={() => setOpen(o => !o)} aria-expanded={open}
                aria-controls="pub-mobile-menu" aria-label="Toggle menu">
          {open ? <X className="w-6 h-6"/> : <Menu className="w-6 h-6"/>}
        </button>
      </div>

      {/* Mobile menu */}
      <div id="pub-mobile-menu"
           className={`lg:hidden overflow-hidden transition-all duration-300 ${
             open ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
           } bg-white border-t border-[#E8DED3] shadow-lg`}>
        <div className="px-5 py-4 space-y-1">
          {NAV_LINKS.map(l => (
            <button key={l.href} onClick={() => handleLink(l)}
              className="w-full text-left px-4 py-3 rounded-xl text-base font-semibold
                         text-[#1C1917] hover:bg-[#FEF9EE] hover:text-[#10B981] transition-colors">
              {l.label}
            </button>
          ))}
          <Link href="/staff-login">
            <span className="flex items-center gap-2 px-4 py-3 rounded-xl text-base font-semibold
                             text-[#1C1917] hover:bg-[#FEF9EE] hover:text-[#10B981] transition-colors cursor-pointer">
              <Shield className="w-4 h-4" aria-hidden="true"/> Staff Login
            </span>
          </Link>
          <div className="flex gap-3 pt-3 mt-2 border-t border-[#E8DED3]">
            <Link href="/login">
              <span className="flex-1 block text-center py-3 rounded-xl font-bold border-2
                               border-[#10B981] text-[#10B981] hover:bg-emerald-50 cursor-pointer">
                Login
              </span>
            </Link>
            <Link href="/quick-register">
              <span className="flex-1 block text-center py-3 rounded-xl font-bold
                               bg-[#D97706] text-white hover:bg-[#B45309] cursor-pointer">
                Register
              </span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC FOOTER
// ─────────────────────────────────────────────────────────────────────────────
export function PublicFooter() {
  const cols = {
    Platform: ['About', 'How It Works', 'Success Stories', 'Pricing'],
    Support:  ['Counselling', 'Contact Us', 'Staff Assistance', 'FAQ'],
    Legal:    ['Privacy Policy', 'Terms of Service', 'Community Guidelines'],
  };

  return (
    <footer id="contact" aria-label="Footer" className="bg-[#0A2619] text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <p className="font-amiri text-white/40 text-sm mb-2 tracking-widest" lang="ar">
              بِسْمِ اللَّهِ
            </p>
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-[#10B981]/20 p-1.5 border border-[#10B981]/25">
                <LogoMark size={38} light />
              </div>
              <span className="font-amiri text-2xl font-bold text-white">Intikhab-e-Zauj</span>
            </div>
            <p className="text-white/45 text-sm leading-relaxed mb-5">
              A staff-mediated Islamic matrimonial platform committed to family values,
              transparency, and halal connections.
            </p>
            <p className="text-white/30 text-xs">
              Affiliated with<br/>
              <span className="text-white/50 font-semibold">Falah Khandan Center</span><br/>
              Women Commission, Lahore
            </p>

            <div className="mt-6 space-y-2">
              <a href="mailto:info@intikhab-e-zauj.pk"
                 className="flex items-center gap-2 text-white/40 hover:text-[#10B981]
                            text-sm transition-colors">
                <Mail className="w-4 h-4" aria-hidden="true"/>
                info@intikhab-e-zauj.pk
              </a>
              <a href="tel:+924200000000"
                 className="flex items-center gap-2 text-white/40 hover:text-[#10B981]
                            text-sm transition-colors">
                <Phone className="w-4 h-4" aria-hidden="true"/>
                +92 42 000 0000
              </a>
              <p className="flex items-start gap-2 text-white/40 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true"/>
                Falah Khandan Center, Lahore, Pakistan
              </p>
            </div>
          </div>

          {/* Link cols */}
          {Object.entries(cols).map(([colTitle, links]) => (
            <div key={colTitle}>
              <h3 className="text-sm font-bold text-white/70 mb-5 uppercase tracking-wider">
                {colTitle}
              </h3>
              <ul className="space-y-3">
                {links.map(l => (
                  <li key={l}>
                    <a href="#" className="text-white/40 hover:text-[#10B981] text-sm transition-colors">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-linear-to-r from-transparent via-white/10 to-transparent mb-8"/>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <p className="text-white/25 text-sm">
            © {new Date().getFullYear()} Intikhab-e-Zauj · All rights reserved
          </p>
          <p className="font-amiri text-white/20 text-base" lang="ar">
            وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً
          </p>
          <div className="flex gap-5">
            <Link href="/staff-login">
              <span className="text-white/25 hover:text-white/55 text-sm cursor-pointer transition-colors">
                Staff Portal
              </span>
            </Link>
            <Link href="/login">
              <span className="text-white/25 hover:text-white/55 text-sm cursor-pointer transition-colors">
                Applicant Login
              </span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Wrapper ───────────────────────────────────────────────────────────────────
export default function PublicLayout({
  children, navAlwaysSolid = false,
}: { children: React.ReactNode; navAlwaysSolid?: boolean }) {
  return (
    <>
      <PublicNavbar alwaysSolid={navAlwaysSolid} />
      {children}
      <PublicFooter />
    </>
  );
}
