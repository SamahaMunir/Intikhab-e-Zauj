import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import {
  Shield, CheckCircle2, BarChart3, Star, Heart, Leaf, Users, MapPin,
  FileText, Eye, Sparkles, Send, MessageCircle, Lock, Clock,
  TrendingUp, Calculator, AlertCircle, Check, Award, Menu, X,
  Phone, Mail, ChevronDown,
} from 'lucide-react';

// ── Logo mark SVG — Islamic star + heart + crescent ──────────────────────────
function LogoMark({ size = 38, light = false }: { size?: number; light?: boolean }) {
  const fill   = light ? 'white' : '#10B981';
  const faded  = light ? 'rgba(255,255,255,0.15)' : 'rgba(16,185,129,0.12)';
  const stroke = light ? 'rgba(255,255,255,0.3)'  : 'rgba(16,185,129,0.35)';
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none"
         xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* 8-pointed star — Islamic geometric background */}
      <path
        d="M22 2 L25.5 12.5 L36 9.5 L33 20 L43.5 22 L33 24 L36 34.5 L25.5 31.5 L22 42 L18.5 31.5 L8 34.5 L11 24 L0.5 22 L11 20 L8 9.5 L18.5 12.5 Z"
        fill={faded} stroke={stroke} strokeWidth="0.6"
      />
      {/* Inner connecting diamond */}
      <path d="M22 11 L31 22 L22 33 L13 22 Z"
            fill={faded} stroke={stroke} strokeWidth="0.5"/>
      {/* Heart — main mark */}
      <path
        d="M22 30.5 C16.5 26.5 11 21.5 11 16.5 C11 13 13.3 10.5 16.5 10.5 C18.5 10.5 20.3 11.6 22 13.4 C23.7 11.6 25.5 10.5 27.5 10.5 C30.7 10.5 33 13 33 16.5 C33 21.5 27.5 26.5 22 30.5 Z"
        fill={fill}
      />
      {/* Crescent moon cutout — overlaid on heart to give Islamic feel */}
      <path
        d="M25.5 13.5 C25.5 16.8 22.9 19.5 19.5 19.5 C18.4 19.5 17.5 19.2 16.7 18.7 C18.2 21.2 20.9 22.8 24 22.8 C28.4 22.8 32 19.2 32 14.8 C32 12 30.5 9.5 28.2 8.3 C27.2 9.9 25.5 11.5 25.5 13.5 Z"
        fill="white" fillOpacity={light ? 0.35 : 0.55}
      />
    </svg>
  );
}

// ── Scroll-reveal wrapper (avoids hooks-in-map violation) ─────────────────────
function RevealWrapper({
  children, delay = 0, className = '',
}: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref  = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const t = setTimeout(() => {
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
        { threshold: 0.1 }
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

// ── Islamic geometric SVG ─────────────────────────────────────────────────────
function GeoPattern({ id, opacity = 0.08 }: { id: string; opacity?: number }) {
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

// ── Score bar (for matching algorithm section) ────────────────────────────────
function ScoreBar({ label, pts, color }: { label: string; pts: number; color: string }) {
  const [animated, setAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setAnimated(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-[#1C1917]">{label}</span>
        <span className="font-bold text-[#10B981]">{pts} pts</span>
      </div>
      <div className="h-2.5 bg-[#E8DED3] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
          style={{ width: animated ? `${pts}%` : '0%' }} />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// NAVBAR
// ═════════════════════════════════════════════════════════════════════════════
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => { setScrolled(window.scrollY > 20); ticking = false; });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  type NavLink = { label: string; href: string; page?: boolean };
  const links: NavLink[] = [
    { label: 'About Us',        href: '/about',   page: true  },
    { label: 'How It Works',    href: '#how'                  },
    { label: 'Q&A System',      href: '#qa'                   },
    { label: 'Success Stories', href: '#stats'                },
    { label: 'Counselling',     href: '#counsel'              },
    { label: 'Contact',         href: '#contact'              },
  ];

  const handleLink = (l: NavLink) => {
    setOpen(false);
    if (l.page) { window.location.href = l.href; }
    else { document.querySelector(l.href)?.scrollIntoView({ behavior: 'smooth' }); }
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
          {links.map(l => (
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
                aria-controls="mobile-menu" aria-label="Toggle menu">
          {open ? <X className="w-6 h-6"/> : <Menu className="w-6 h-6"/>}
        </button>
      </div>

      {/* Mobile menu */}
      <div id="mobile-menu"
           className={`lg:hidden overflow-hidden transition-all duration-300 ${
             open ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
           } bg-white border-t border-[#E8DED3] shadow-lg`}>
        <div className="px-5 py-4 space-y-1">
          {links.map(l => (
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

// ═════════════════════════════════════════════════════════════════════════════
// HERO
// ═════════════════════════════════════════════════════════════════════════════
function Hero() {
  return (
    <section aria-label="Hero" className="relative min-h-screen flex items-center justify-center overflow-hidden
                                          bg-linear-to-br from-[#052e16] via-[#065F46] to-[#10B981]">
      <GeoPattern id="hero-geo" opacity={0.07}/>

      {/* Decorative circles */}
      <div className="absolute right-0 top-0 w-[600px] h-[600px] rounded-full
                      border border-white/5 -translate-y-1/3 translate-x-1/3"/>
      <div className="absolute right-0 top-0 w-[400px] h-[400px] rounded-full
                      border border-white/8 -translate-y-1/4 translate-x-1/4"/>
      <div className="absolute left-0 bottom-0 w-72 h-72 rounded-full
                      bg-[#D97706]/10 blur-3xl -translate-x-1/2 translate-y-1/3"/>

      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-48
                      bg-linear-to-t from-[#FDF8F3] to-transparent pointer-events-none"/>

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto pt-28 pb-36">
        {/* Bismillah */}
        <p className="font-amiri text-white/55 text-xl mb-6 tracking-[0.2em]"
           lang="ar" aria-label="Bismillah ar-Rahman ar-Raheem">
          بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
        </p>

        {/* Trust pill */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8
                        bg-white/12 border border-white/20 backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse"/>
          <span className="text-white/80 text-sm font-semibold">
            Official Platform of Falah Khandan Center, Lahore
          </span>
        </div>

        {/* H1 */}
        <h1 className="font-amiri text-5xl md:text-7xl font-bold text-white leading-[1.1] mb-6">
          Guided Nikah,<br/>
          <span className="text-[#D97706]">Family Values</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
          A staff-mediated matrimonial platform that honours Islamic values,
          ensures transparency, and brings families together with confidence.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/quick-register">
            <span className="cursor-pointer inline-block px-9 py-4 rounded-2xl font-bold text-lg
                             text-white bg-[#D97706] hover:bg-[#B45309] transition-all
                             shadow-[0_4px_24px_rgba(217,119,6,0.45)]
                             hover:shadow-[0_6px_32px_rgba(217,119,6,0.55)]
                             hover:-translate-y-0.5 hover:scale-[1.02]">
              Start Your Journey
            </span>
          </Link>
          <button
            onClick={() => document.querySelector('#how')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-9 py-4 rounded-2xl border-2 border-white/35 text-white font-bold text-lg
                       hover:bg-white/10 hover:border-white/50 transition-all backdrop-blur-sm">
            How It Works
          </button>
        </div>

        {/* Scroll indicator */}
        <div className="mt-20 flex justify-center">
          <button
            onClick={() => document.querySelector('#trust')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex flex-col items-center gap-2 text-white/40 hover:text-white/70
                       transition-colors group" aria-label="Scroll down">
            <span className="text-xs font-semibold uppercase tracking-widest">Discover More</span>
            <ChevronDown className="w-5 h-5 animate-bounce" aria-hidden="true"/>
          </button>
        </div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TRUST BAR
// ═════════════════════════════════════════════════════════════════════════════
function TrustBar() {
  const items = [
    { icon: Shield,      label: '100% Staff-Reviewed'        },
    { icon: Users,       label: '2,400+ Profiles Approved'   },
    { icon: Star,        label: '600+ Success Stories'       },
    { icon: CheckCircle2,label: 'PKR 4,000 / Year — No Hidden Fees' },
  ];
  return (
    <section id="trust" aria-label="Trust indicators"
             className="bg-white border-b border-[#E8DED3]">
      <div className="max-w-6xl mx-auto px-6 py-5">
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-3">
          {items.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-sm font-semibold text-stone-500">
              <Icon className="w-4 h-4 text-[#10B981] shrink-0" aria-hidden="true"/>
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// VALUE PROPS
// ═════════════════════════════════════════════════════════════════════════════
function ValueProps() {
  const cards = [
    {
      icon: Shield,
      label: '01',
      title: 'Staff-Approved Matching',
      desc: 'Every profile is reviewed and verified by our trained team before it goes live. No fake profiles. No shortcuts. Your safety is non-negotiable.',
    },
    {
      icon: BarChart3,
      label: '02',
      title: 'Transparent 100-Point Scoring',
      desc: 'See exactly how each match is calculated — caste, profession, age gap, location, height, and more. No mystery. Full clarity.',
    },
    {
      icon: Heart,
      label: '03',
      title: 'Islamic-First Design',
      desc: 'Moderated Q&A only. No media sharing. Family involvement at every stage. We built this for nikah, not dating.',
    },
    {
      icon: Users,
      label: '04',
      title: 'Accessible & Affordable',
      desc: 'PKR 4,000/year. Walk-in staff assistance for those who need it. Our team can fill your profile for you — no tech experience required.',
    },
  ];

  return (
    <section id="about" aria-labelledby="value-heading" className="py-24 bg-[#FDF8F3]">
      <div className="max-w-6xl mx-auto px-6">
        <RevealWrapper className="text-center mb-14">
          <p className="font-amiri text-[#D97706] text-lg mb-2 tracking-wide">Why Families Trust Us</p>
          <h2 id="value-heading" className="text-4xl font-bold text-[#1C1917] mb-4">
            Built Different, On Purpose
          </h2>
          <p className="text-lg text-stone-500 max-w-2xl mx-auto">
            Every design decision reflects our commitment to serving families — not users.
          </p>
        </RevealWrapper>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map((c, i) => {
            const Icon = c.icon;
            return (
              <RevealWrapper key={c.title} delay={i * 90}>
                <article className="bg-white rounded-2xl border border-[#E8DED3] p-6 h-full
                                    shadow-warm hover:-translate-y-1.5 hover:shadow-md
                                    transition-all duration-300 group">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-[#10B981]/20
                                  flex items-center justify-center mb-5 group-hover:bg-[#10B981]
                                  transition-colors duration-300">
                    <Icon className="w-6 h-6 text-[#10B981] group-hover:text-white transition-colors duration-300"
                          aria-hidden="true"/>
                  </div>
                  <p className="font-amiri text-4xl font-bold text-[#10B981]/15 mb-2 leading-none">
                    {c.label}
                  </p>
                  <h3 className="text-xl font-bold text-[#1C1917] mb-3">{c.title}</h3>
                  <p className="text-base text-stone-500 leading-relaxed">{c.desc}</p>
                </article>
              </RevealWrapper>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// HOW IT WORKS
// ═════════════════════════════════════════════════════════════════════════════
function HowItWorks() {
  const steps = [
    {
      n: 1, icon: FileText,
      title: 'Complete Your Profile',
      desc: 'Register online or visit our office. Our staff can complete your entire profile from a paper form, WhatsApp, or phone call — no tech needed.',
    },
    {
      n: 2, icon: Eye,
      title: 'Staff Review & Approval',
      desc: 'Our team manually verifies every profile for authenticity, completeness, and compliance. You receive email confirmation once approved.',
    },
    {
      n: 3, icon: Sparkles,
      title: 'Receive Curated Matches',
      desc: 'Our 100-point algorithm suggests compatible profiles. Staff review and forward proposals to families — always with complete transparency.',
    },
  ];

  return (
    <section id="how" aria-labelledby="how-heading" className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <RevealWrapper className="text-center mb-16">
          <p className="font-amiri text-[#D97706] text-lg mb-2 tracking-wide">Simple Process</p>
          <h2 id="how-heading" className="text-4xl font-bold text-[#1C1917] mb-4">
            How It Works
          </h2>
          <p className="text-lg text-stone-500 max-w-xl mx-auto">
            From registration to a staff-mediated proposal in three steps.
          </p>
        </RevealWrapper>

        <div className="relative">
          {/* Desktop connector */}
          <div aria-hidden="true"
               className="hidden md:block absolute top-14 left-[calc(16.7%+28px)] right-[calc(16.7%+28px)]
                          h-px bg-linear-to-r from-[#10B981] via-[#D97706] to-[#10B981] opacity-25"/>

          <div className="grid md:grid-cols-3 gap-10">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <RevealWrapper key={s.n} delay={i * 130} className="text-center">
                  <div className="relative inline-flex items-center justify-center w-28 h-28 mb-6">
                    <div className="absolute inset-0 rounded-full border-2 border-[#10B981]/20"/>
                    <div className="w-20 h-20 rounded-full bg-linear-to-br from-[#10B981] to-[#065F46]
                                    flex items-center justify-center
                                    shadow-[0_4px_20px_rgba(16,185,129,0.35)]">
                      <Icon className="w-8 h-8 text-white" aria-hidden="true"/>
                    </div>
                    <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-[#D97706]
                                     text-white text-xs font-black flex items-center justify-center">
                      {s.n}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[#1C1917] mb-3">{s.title}</h3>
                  <p className="text-base text-stone-500 leading-relaxed">{s.desc}</p>
                </RevealWrapper>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PROPOSAL & Q&A SYSTEM
// ═════════════════════════════════════════════════════════════════════════════
function ProposalSystem() {
  const flow = [
    { icon: Send,          label: 'Proposal Sent'     },
    { icon: CheckCircle2,  label: 'Both Accept'       },
    { icon: MessageCircle, label: 'Q&A Opens'         },
    { icon: Clock,         label: '48-Hr Chat'        },
    { icon: Lock,          label: 'Staff Closes'      },
  ];

  const questions = [
    'What qualities matter most to you in a life partner?',
    'Describe your ideal family life in five years.',
    'How do you practice your faith in daily life?',
    'What career path are you on, and where do you see it going?',
    'How do you feel about living arrangements after marriage?',
    'What role do family and parents play in your decisions?',
  ];

  const rules = [
    'Text-only Q&A — no photos, no videos, no voice notes',
    'Pre-curated questions by experienced counsellors',
    'Staff monitor every conversation for appropriate conduct',
    '48-hour time-bound window — no open-ended chatting',
    'Both families can view and guide the conversation',
  ];

  return (
    <section id="qa" aria-labelledby="qa-heading" className="py-24 bg-[#FDF8F3]">
      <div className="max-w-6xl mx-auto px-6">
        <RevealWrapper className="text-center mb-12">
          <p className="font-amiri text-[#D97706] text-lg mb-2 tracking-wide">
            Communication, the Halal Way
          </p>
          <h2 id="qa-heading" className="text-4xl font-bold text-[#1C1917] mb-4">
            The Proposal & Q&A System
          </h2>
          <p className="text-lg text-stone-500 max-w-2xl mx-auto">
            No open chat. No media sharing. Every conversation is staff-curated,
            time-bound, and family-inclusive.
          </p>
        </RevealWrapper>

        {/* 5-step flow strip */}
        <RevealWrapper className="mb-10">
          <div className="bg-white rounded-2xl border border-[#E8DED3] shadow-warm px-6 py-6">
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center
                            justify-between gap-4">
              {/* Connector — desktop only */}
              <div aria-hidden="true"
                   className="hidden sm:block absolute top-5 left-[calc(10%+20px)] right-[calc(10%+20px)]
                              h-px bg-linear-to-r from-[#10B981]/25 via-[#D97706]/25 to-[#10B981]/25"/>
              {flow.map(({ icon: Icon, label }, i) => (
                <div key={label} className="relative flex flex-row sm:flex-col
                                            items-center gap-3 sm:gap-2 flex-1 sm:text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 border-2 border-[#10B981]/30
                                  flex items-center justify-center shrink-0 relative z-10 bg-white">
                    <Icon className="w-4 h-4 text-[#10B981]" aria-hidden="true"/>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-400 block mb-0.5">0{i + 1}</span>
                    <span className="text-sm font-semibold text-[#1C1917]">{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </RevealWrapper>

        {/* Rules + Q&A grid */}
        <div className="grid lg:grid-cols-2 gap-8">

          {/* Rules */}
          <RevealWrapper>
            <div className="bg-white rounded-2xl border border-[#E8DED3] p-7 h-full shadow-warm">
              <h3 className="text-xl font-bold text-[#1C1917] mb-5">Conversation Rules</h3>
              <ul className="space-y-3 mb-7">
                {rules.map(pt => (
                  <li key={pt} className="flex items-start gap-3 text-base text-stone-600">
                    <Check className="w-4 h-4 text-[#10B981] mt-0.5 shrink-0" aria-hidden="true"/>
                    {pt}
                  </li>
                ))}
              </ul>
              <Link href="/quick-register">
                <span className="cursor-pointer inline-block px-6 py-3 rounded-xl font-bold text-sm
                                 bg-[#10B981] hover:bg-[#059669] text-white transition-colors">
                  Register to See the System
                </span>
              </Link>
            </div>
          </RevealWrapper>

          {/* Sample questions */}
          <RevealWrapper delay={100}>
            <div className="bg-white rounded-2xl border border-[#E8DED3] p-7 h-full shadow-warm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold text-[#1C1917]">Sample Q&A Questions</h3>
                <span className="px-3 py-1 rounded-full bg-emerald-50 border border-[#10B981]/20
                                 text-[#10B981] text-xs font-bold">Staff-Curated</span>
              </div>
              <div className="space-y-2.5">
                {questions.map((q, i) => (
                  <div key={i}
                       className="flex items-start gap-3 p-3.5 rounded-xl bg-[#FDF8F3]
                                  border border-[#E8DED3] hover:border-[#10B981]/30 transition-colors">
                    <span className="w-7 h-7 rounded-lg bg-[#10B981]/10 text-[#10B981] text-xs
                                     font-black flex items-center justify-center shrink-0 mt-0.5">
                      Q{i + 1}
                    </span>
                    <p className="text-sm text-stone-600 leading-relaxed">{q}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-stone-400 text-center">
                10–15 categories · families answer in writing · staff review before sharing
              </p>
            </div>
          </RevealWrapper>
        </div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MATCHING ALGORITHM
// ═════════════════════════════════════════════════════════════════════════════
function MatchingAlgorithm() {
  const scores = [
    { label: 'Caste / Background',    pts: 25, color: 'bg-[#10B981]' },
    { label: 'Profession',            pts: 15, color: 'bg-[#059669]' },
    { label: 'Age Gap',               pts: 15, color: 'bg-[#D97706]' },
    { label: 'City / Location',       pts: 15, color: 'bg-[#10B981]' },
    { label: 'Height Preference',     pts: 10, color: 'bg-[#059669]' },
    { label: 'House Status',          pts: 10, color: 'bg-[#D97706]' },
    { label: 'House Area',            pts: 10, color: 'bg-[#10B981]' },
  ];

  return (
    <section aria-labelledby="algo-heading" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left — scores */}
          <RevealWrapper>
            <div className="bg-[#FDF8F3] rounded-2xl border border-[#E8DED3] p-8 shadow-warm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-[#1C1917]">Compatibility Breakdown</h3>
                <span className="font-amiri text-3xl font-bold text-[#10B981]">100</span>
              </div>
              <p className="text-sm text-stone-400 mb-7">Total points. Every match shows this breakdown.</p>
              <div className="space-y-4">
                {scores.map(s => <ScoreBar key={s.label} {...s}/>)}
              </div>
            </div>
          </RevealWrapper>

          {/* Right — explanation */}
          <RevealWrapper delay={120}>
            <p className="font-amiri text-[#D97706] text-lg mb-2 tracking-wide">
              No Mystery Matches
            </p>
            <h2 id="algo-heading" className="text-4xl font-bold text-[#1C1917] mb-5">
              How We Score Compatibility
            </h2>
            <p className="text-lg text-stone-500 mb-6 leading-relaxed">
              Our 100-point algorithm weighs seven factors — each chosen based on what
              Pakistani families consistently prioritise. The result is a transparent,
              explainable score that both families can see and understand.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                { icon: TrendingUp,  text: 'Higher score = stronger natural compatibility' },
                { icon: Calculator,  text: 'Hard filters remove fundamentally incompatible pairs first' },
                { icon: AlertCircle, text: 'No match is forced — both families always choose' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-[#10B981]/20
                                  flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#10B981]" aria-hidden="true"/>
                  </div>
                  <p className="text-base text-stone-600 mt-1">{text}</p>
                </li>
              ))}
            </ul>
            <Link href="/how-it-works">
              <span className="cursor-pointer inline-block px-6 py-3 rounded-xl font-bold text-sm
                               border-2 border-[#10B981] text-[#10B981] hover:bg-emerald-50 transition-colors">
                Read the Full Methodology
              </span>
            </Link>
          </RevealWrapper>
        </div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STAFF VETTING
// ═════════════════════════════════════════════════════════════════════════════
function StaffVetting() {
  const steps = [
    { icon: FileText,    title: 'Submitted',   desc: 'Applicant submits form (digital or paper)' },
    { icon: Eye,         title: 'Verified',    desc: 'Phone & CNIC cross-referenced by staff'    },
    { icon: AlertCircle, title: 'Checked',     desc: 'Duplicates, fake photos, and issues flagged' },
    { icon: CheckCircle2,title: 'Approved',    desc: 'Profile goes live with full compliance'   },
    { icon: Shield,      title: 'Protected',   desc: 'Data encrypted, never shared with third parties' },
  ];

  return (
    <section aria-labelledby="vetting-heading" className="py-24 bg-[#FDF8F3]">
      <div className="max-w-6xl mx-auto px-6">
        <RevealWrapper className="text-center mb-14">
          <p className="font-amiri text-[#D97706] text-lg mb-2 tracking-wide">Quality Assurance</p>
          <h2 id="vetting-heading" className="text-4xl font-bold text-[#1C1917] mb-4">
            Why Staff Review Matters
          </h2>
          <p className="text-lg text-stone-500 max-w-2xl mx-auto">
            Every profile goes through a manual, multi-step verification process
            before any family ever sees it.
          </p>
        </RevealWrapper>

        {/* Flow */}
        <div className="relative">
          {/* Connector line */}
          <div aria-hidden="true"
               className="hidden md:block absolute top-9 left-[calc(10%+18px)] right-[calc(10%+18px)]
                          h-px bg-linear-to-r from-[#10B981]/30 via-[#D97706]/30 to-[#10B981]/30"/>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <RevealWrapper key={s.title} delay={i * 80} className="text-center">
                  <div className="relative inline-flex items-center justify-center w-18 h-18 mb-4">
                    <div className="w-16 h-16 rounded-full bg-white border-2 border-[#E8DED3]
                                    shadow-warm flex items-center justify-center
                                    group-hover:border-[#10B981] transition-colors">
                      <Icon className="w-7 h-7 text-[#10B981]" aria-hidden="true"/>
                    </div>
                    {i < steps.length - 1 && (
                      <div aria-hidden="true"
                           className="md:hidden absolute -right-3 top-1/2 -translate-y-1/2
                                      text-[#E8DED3] text-lg">›</div>
                    )}
                  </div>
                  <h4 className="text-base font-bold text-[#1C1917] mb-1">{s.title}</h4>
                  <p className="text-xs text-stone-400 leading-relaxed">{s.desc}</p>
                </RevealWrapper>
              );
            })}
          </div>
        </div>

        {/* Footer note */}
        <RevealWrapper className="mt-12">
          <div className="bg-white rounded-2xl border border-[#E8DED3] p-6 shadow-warm
                          flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-[#10B981]/20
                            flex items-center justify-center shrink-0 mx-auto md:mx-0">
              <Shield className="w-7 h-7 text-[#10B981]" aria-hidden="true"/>
            </div>
            <div>
              <h4 className="text-lg font-bold text-[#1C1917] mb-1">Privacy-First by Design</h4>
              <p className="text-base text-stone-500">
                All data is hosted in Pakistan, never shared with third parties, encrypted at rest.
                Passwords are hashed. Photos are verified for authenticity. Zero tolerance for fake profiles.
              </p>
            </div>
          </div>
        </RevealWrapper>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PRICING
// ═════════════════════════════════════════════════════════════════════════════
function Pricing() {
  const includes = [
    'Complete profile with photo',
    'Unlimited suggested matches',
    'Staff-curated Q&A access',
    'Proposal send and receive',
    'One counselling consultation',
    'Email support & staff assistance',
    'No hidden fees, ever',
  ];

  return (
    <section aria-labelledby="pricing-heading" className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <RevealWrapper className="text-center mb-12">
          <p className="font-amiri text-[#D97706] text-lg mb-2 tracking-wide">Simple & Transparent</p>
          <h2 id="pricing-heading" className="text-4xl font-bold text-[#1C1917] mb-4">
            One Plan. No Surprises.
          </h2>
          <p className="text-lg text-stone-500 max-w-xl mx-auto">
            While competitors charge PKR 10,000–50,000, we believe matrimonial services
            should be accessible to every family.
          </p>
        </RevealWrapper>

        <RevealWrapper>
          <div className="max-w-lg mx-auto bg-white rounded-3xl border-2 border-[#10B981]
                          shadow-[0_8px_40px_rgba(16,185,129,0.15)] overflow-hidden">
            {/* Header */}
            <div className="relative bg-linear-to-br from-[#065F46] to-[#10B981] px-8 pt-8 pb-10 text-center overflow-hidden">
              <GeoPattern id="pricing-geo" opacity={0.08}/>
              <div className="relative z-10">
                <span className="inline-block px-4 py-1.5 rounded-full bg-white/20 text-white text-sm
                                 font-semibold mb-4">Annual Subscription</span>
                <div className="flex items-end justify-center gap-2">
                  <span className="text-white/60 text-xl font-semibold">PKR</span>
                  <span className="font-amiri text-6xl font-bold text-white leading-none">4,000</span>
                  <span className="text-white/60 text-xl font-semibold mb-1">/year</span>
                </div>
                <p className="text-white/60 text-sm mt-2">≈ PKR 333/month · Billed annually</p>
              </div>
            </div>

            {/* Features */}
            <div className="px-8 py-8">
              <ul className="space-y-3.5 mb-8">
                {includes.map(item => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-50 border border-[#10B981]/30
                                    flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-[#10B981]" aria-hidden="true"/>
                    </div>
                    <span className="text-base text-[#1C1917] font-medium">{item}</span>
                  </li>
                ))}
              </ul>

              <Link href="/quick-register">
                <span className="cursor-pointer block text-center py-4 rounded-2xl font-bold text-lg
                                 bg-[#D97706] hover:bg-[#B45309] text-white transition-all
                                 hover:scale-[1.02] hover:shadow-[0_4px_20px_rgba(217,119,6,0.3)]">
                  Get Started — Register Free
                </span>
              </Link>
              <p className="text-center text-sm text-stone-400 mt-3">
                Explore for 7 days · Pay when you are ready
              </p>
            </div>
          </div>
        </RevealWrapper>

        {/* Comparison note */}
        <RevealWrapper delay={100} className="mt-8 text-center">
          <p className="text-sm text-stone-400">
            Competitors charge <span className="line-through text-stone-300">PKR 10,000–50,000</span>.
            We charge <strong className="text-[#10B981]">PKR 4,000</strong> because matrimonial services
            should be accessible to every family — not just the wealthy.
          </p>
        </RevealWrapper>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STATS
// ═════════════════════════════════════════════════════════════════════════════
function Stats() {
  const items = [
    { icon: Heart,       value: '600+',   label: 'Success Stories'   },
    { icon: Users,       value: '2,400+', label: 'Profiles Reviewed' },
    { icon: Award,       value: '15+',    label: 'Years of Service'  },
    { icon: Shield,      value: '100%',   label: 'Staff-Mediated'    },
  ];

  return (
    <section id="stats" aria-labelledby="stats-heading"
             className="relative py-24 overflow-hidden
                        bg-linear-to-br from-[#052e16] via-[#065F46] to-[#047857]">
      <GeoPattern id="stats-geo" opacity={0.07}/>
      <div className="relative z-10 max-w-6xl mx-auto px-6">

        <RevealWrapper className="text-center mb-14">
          <div className="inline-block px-5 py-2 rounded-full bg-white/12 border border-white/20
                          text-white font-semibold text-sm mb-5 backdrop-blur-sm">
            Trusted by Falah Khandan Center — Women Commission, Lahore
          </div>
          <h2 id="stats-heading" className="text-4xl font-bold text-white mb-4">
            A Community We're Proud to Serve
          </h2>
          <p className="text-xl text-white/65 max-w-2xl mx-auto">
            Staff-reviewed. Community-driven. Rooted in Islamic values.
          </p>
        </RevealWrapper>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {items.map(({ icon: Icon, value, label }, i) => (
            <RevealWrapper key={label} delay={i * 80}>
              <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl
                              border border-white/15 px-5 py-8
                              hover:bg-white/15 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center
                                mx-auto mb-4">
                  <Icon className="w-6 h-6 text-white" aria-hidden="true"/>
                </div>
                <p className="font-amiri text-5xl font-bold text-white mb-2">{value}</p>
                <p className="text-white/60 text-sm font-semibold uppercase tracking-wide">{label}</p>
              </div>
            </RevealWrapper>
          ))}
        </div>

        {/* Quranic verse */}
        <RevealWrapper className="text-center">
          <p className="font-amiri text-2xl text-white/75 leading-relaxed italic" lang="ar">
            "وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً"
          </p>
          <p className="text-white/40 text-sm mt-3">Surah Ar-Rum 30:21</p>
        </RevealWrapper>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// COUNSELLING
// ═════════════════════════════════════════════════════════════════════════════
function Counselling() {
  const features = [
    { icon: Users,       text: 'Family compatibility assessment sessions'        },
    { icon: CheckCircle2,text: 'Expectation and lifestyle alignment discussions' },
    { icon: Heart,       text: 'Islamic guidance on marriage criteria'           },
    { icon: MapPin,      text: 'Family introduction support and facilitation'    },
  ];

  return (
    <section id="counsel" aria-labelledby="counsel-heading" className="py-24 bg-[#FDF8F3]">
      <div className="max-w-5xl mx-auto px-6">
        <RevealWrapper>
          <div className="bg-white rounded-3xl border border-[#E8DED3] p-10 md:p-14 shadow-warm
                          flex flex-col md:flex-row gap-10 items-center">
            <div className="flex-1">
              <p className="font-amiri text-[#D97706] text-lg mb-2 tracking-wide">Beyond Matching</p>
              <h2 id="counsel-heading" className="text-3xl font-bold text-[#1C1917] mb-4">
                Pre-Nikah & Post-Nikah Counselling
              </h2>
              <p className="text-lg text-stone-500 leading-relaxed mb-6">
                Our trained counsellors walk families through every stage — from first inquiry
                to final acceptance. Conducted in-person, online, or by phone.
                Strictly halal. Family-inclusive.
              </p>
              <ul className="space-y-3 mb-8" aria-label="Counselling services">
                {features.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-[#10B981]/20
                                    flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-[#10B981]" aria-hidden="true"/>
                    </div>
                    <span className="text-base text-stone-600 mt-1">{text}</span>
                  </li>
                ))}
              </ul>
              <Link href="/counselling">
                <span className="cursor-pointer inline-block px-7 py-4 rounded-xl font-bold text-base
                                 bg-[#10B981] hover:bg-[#059669] text-white transition-all
                                 hover:scale-[1.02] hover:shadow-[0_4px_16px_rgba(16,185,129,0.3)]">
                  Book a Counselling Session
                </span>
              </Link>
            </div>

            {/* Decorative panel */}
            <div className="hidden md:flex w-60 h-60 shrink-0 rounded-2xl relative overflow-hidden
                            bg-linear-to-br from-[#065F46] to-[#10B981] items-center justify-center">
              <GeoPattern id="counsel-geo" opacity={0.12}/>
              <div className="relative z-10 text-center px-4">
                <p className="font-amiri text-white text-5xl mb-3" lang="ar">الزَّوَاج</p>
                <p className="text-white/55 text-sm font-semibold uppercase tracking-widest">
                  Blessed Union
                </p>
              </div>
            </div>
          </div>
        </RevealWrapper>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DUAL CTA
// ═════════════════════════════════════════════════════════════════════════════
function DualCTA() {
  return (
    <section aria-labelledby="cta-heading" className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <RevealWrapper>
          <div className="inline-flex items-center gap-2 mb-4 text-[#10B981]">
            <Sparkles className="w-5 h-5" aria-hidden="true"/>
            <span className="font-semibold text-sm uppercase tracking-wider">Begin Your Journey</span>
          </div>
          <h2 id="cta-heading" className="text-4xl md:text-5xl font-bold text-[#1C1917] mb-4">
            Ready to Find Your Match?
          </h2>
          <p className="text-xl text-stone-500 max-w-2xl mx-auto mb-12">
            Register online in minutes — or visit our office and our staff will
            guide you every step of the way. No tech experience required.
          </p>

          <div className="grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {/* Digital */}
            <div className="bg-[#FDF8F3] rounded-2xl border-2 border-[#10B981] p-8 text-center
                            hover:shadow-[0_4px_24px_rgba(16,185,129,0.15)] transition-all">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-[#10B981]/20
                              flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-[#10B981]" aria-hidden="true"/>
              </div>
              <h3 className="text-xl font-bold text-[#1C1917] mb-2">Register Online</h3>
              <p className="text-base text-stone-500 mb-6">
                Complete your profile digitally. Takes under 10 minutes.
              </p>
              <Link href="/quick-register">
                <span className="cursor-pointer block py-4 rounded-xl font-bold text-base
                                 bg-[#10B981] hover:bg-[#059669] text-white transition-all
                                 hover:scale-[1.02]">
                  Register Free
                </span>
              </Link>
            </div>

            {/* In-person */}
            <div className="bg-[#FDF8F3] rounded-2xl border-2 border-[#E8DED3] p-8 text-center
                            hover:border-[#D97706]/40 hover:shadow-[0_4px_24px_rgba(217,119,6,0.10)]
                            transition-all">
              <div className="w-14 h-14 rounded-2xl bg-[#FEF9EE] border border-[#D97706]/20
                              flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-7 h-7 text-[#D97706]" aria-hidden="true"/>
              </div>
              <h3 className="text-xl font-bold text-[#1C1917] mb-2">Visit Our Office</h3>
              <p className="text-base text-stone-500 mb-6">
                Our staff will fill your profile for you. Walk-ins welcome.
              </p>
              <Link href="/contact">
                <span className="cursor-pointer block py-4 rounded-xl font-bold text-base
                                 border-2 border-[#D97706] text-[#D97706]
                                 hover:bg-[#FEF9EE] transition-all">
                  Get Staff Assistance
                </span>
              </Link>
            </div>
          </div>

          <p className="mt-8 text-sm text-stone-400">
            Free registration · Both paths equally supported · No hidden fees
          </p>
        </RevealWrapper>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// FOOTER
// ═════════════════════════════════════════════════════════════════════════════
function Footer() {
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
                    <a href="#"
                       className="text-white/40 hover:text-[#10B981] text-sm transition-colors">
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

// ═════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═════════════════════════════════════════════════════════════════════════════
export default function LandingNew() {
  return (
    <main>
      <Navbar />
      <Hero />
      <TrustBar />
      <ValueProps />
      <HowItWorks />
      <ProposalSystem />
      <MatchingAlgorithm />
      <StaffVetting />
      <Pricing />
      <Stats />
      <Counselling />
      <DualCTA />
      <Footer />
    </main>
  );
}
