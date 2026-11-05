import { Link } from 'wouter';
import {
  Shield, Heart, Users, BookOpen, MessageCircle,
  Home, Star, GraduationCap, Scale, Check, ChevronRight,
} from 'lucide-react';
import {
  PublicNavbar, PublicFooter, GeoPattern, RevealWrapper, LogoMark,
} from '@/components/layout/PublicLayout';

// ── Section header ────────────────────────────────────────────────────────────
function SectionHead({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <RevealWrapper className="text-center">
      <p className="font-amiri text-[#D97706] text-lg mb-2 tracking-wide">{eyebrow}</p>
      <h2 className="text-4xl md:text-5xl font-bold text-[#1C1917] mb-4">{title}</h2>
      {body && <p className="text-xl text-stone-500 max-w-2xl mx-auto leading-relaxed">{body}</p>}
    </RevealWrapper>
  );
}

// ── Numbered list card (objectives) ───────────────────────────────────────────
function NumberCard({ n, icon: Icon, title, body }: {
  n: number; icon: React.ElementType; title: string; body: string;
}) {
  return (
    <div className="flex gap-4 bg-white rounded-2xl border border-[#E8DED3] p-5 h-full
                    shadow-warm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
      <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-[#10B981]/20
                      flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#10B981]" aria-hidden="true"/>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-black text-[#10B981]/35">
            {String(n).padStart(2, '0')}
          </span>
          <h3 className="text-base font-bold text-[#1C1917]">{title}</h3>
        </div>
        <p className="text-sm text-stone-500 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function About() {
  const objectives = [
    { icon: Home,          title: 'Family as Foundation',      body: 'Highlight the importance of family in Pakistani society and its role in building a stable community.' },
    { icon: Users,         title: 'Address Family Challenges', body: 'Identify and respond to the real challenges families face in modern Pakistani society.' },
    { icon: Scale,         title: 'Discourage Dowry',          body: 'Actively discourage dowry and un-Islamic wedding practices that burden families financially and socially.' },
    { icon: Heart,         title: 'Facilitate Nikah',          body: 'Support and facilitate Nikah according to Islamic values — simple, dignified, free from extravagance.' },
    { icon: Shield,        title: 'Joint Family Support',      body: 'Help families navigate challenges within joint family systems with compassion and Islamic guidance.' },
    { icon: GraduationCap, title: "Children's Development",    body: 'Support the education and holistic development of children as future pillars of society.' },
    { icon: MessageCircle, title: 'Domestic Violence',         body: 'Promote awareness of domestic violence, oppression, and harmful behaviors, and support families in addressing them responsibly.' },
    { icon: Star,          title: 'Respect for Elders',        body: 'Promote respect, care, and dignified treatment for elderly family members as an Islamic duty.' },
    { icon: BookOpen,      title: 'Moral Development',         body: 'Encourage stronger family relationships, ethical conduct, and moral growth rooted in Islamic principles.' },
  ];

  const islamicValues = ['Tawheed', 'Knowledge', 'Justice', 'Equity', 'Kindness', 'Honesty', 'Patience', 'Accountability'];

  return (
    <main className="bg-[#FDF8F3]">
      <PublicNavbar />

      {/* ── Hero ── */}
      <section aria-label="About hero"
               className="relative overflow-hidden
                          bg-linear-to-br from-[#031a0e] via-[#052e16] to-[#065F46]">
        <GeoPattern id="about-hero-geo" opacity={0.055}/>
        <div className="absolute bottom-0 inset-x-0 h-40
                        bg-linear-to-t from-[#FDF8F3] to-transparent pointer-events-none z-10"/>
        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-36 pb-28 text-center">
          <div className="inline-flex mb-7">
            <div className="rounded-2xl bg-white/10 border border-white/15 p-3 backdrop-blur-sm">
              <LogoMark size={52} light/>
            </div>
          </div>
          <p className="font-amiri text-white/45 text-xl mb-5 tracking-[0.2em]" lang="ar">
            بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-7
                          bg-white/10 border border-white/15 text-white/75 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#D97706]"/>
            Lahore, Pakistan
          </div>
          <h1 className="font-amiri text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            About <span className="text-[#D97706]">Intikhab-e-Zauj</span>
          </h1>
          <p className="text-xl text-white/65 max-w-3xl mx-auto leading-relaxed mb-10">
            Intikhab-e-Zauj is a matrimonial facilitation platform
            dedicated to strengthening families through Islamic values and responsible matchmaking.
          </p>
          <Link href="/quick-register">
            <span className="cursor-pointer inline-block px-8 py-4 rounded-2xl font-bold text-lg
                             text-white bg-[#D97706] hover:bg-[#B45309] transition-all
                             shadow-[0_4px_28px_rgba(217,119,6,0.45)]
                             hover:shadow-[0_6px_36px_rgba(217,119,6,0.55)] hover:-translate-y-0.5 hover:scale-[1.02]">
              Start Your Journey
            </span>
          </Link>
        </div>
      </section>

      {/* ── Introduction ── */}
      <section aria-labelledby="intro-heading" className="py-24 bg-[#FDF8F3]">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-14 items-start">
          <RevealWrapper>
            <p className="font-amiri text-[#D97706] text-lg mb-2 tracking-wide">Who We Are</p>
            <h2 id="intro-heading" className="text-4xl font-bold text-[#1C1917] mb-6">
              Intikhab-e-Zauj
            </h2>
            <p className="text-lg text-stone-600 leading-relaxed mb-5">
              <strong className="text-[#1C1917]">Intikhab-e-Zauj</strong> believes
              that the family unit is the foundation of a healthy and successful society.
            </p>
            <p className="text-base text-stone-500 leading-relaxed mb-5">
              Islam aims to develop a society grounded in timeless values — ones that begin
              at home and radiate outward to the entire community. We exist to cultivate
              those values in Pakistani families through education, support, and guided intervention.
            </p>
            <p className="text-base text-stone-500 leading-relaxed mb-8">
              The family institution plays a central role in cultivating these values and
              preserving future generations — and we stand at that centre.
            </p>
            <Link href="/quick-register">
              <span className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-xl
                               font-bold text-sm border-2 border-[#10B981] text-[#10B981]
                               hover:bg-emerald-50 transition-colors">
                Register with Intikhab-e-Zauj
                <ChevronRight className="w-4 h-4" aria-hidden="true"/>
              </span>
            </Link>
          </RevealWrapper>

          <RevealWrapper delay={100}>
            <div className="bg-white rounded-2xl border border-[#E8DED3] p-7 shadow-warm">
              <h3 className="text-xl font-bold text-[#1C1917] mb-5">Islam's Vision for Society</h3>
              <p className="text-sm text-stone-500 mb-5 leading-relaxed">
                Islam aims to develop a society built upon these core principles,
                all of which are nurtured within the family:
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {islamicValues.map(v => (
                  <div key={v} className="flex items-center gap-2.5 p-3 rounded-xl
                                          bg-[#FDF8F3] border border-[#E8DED3]">
                    <div className="w-6 h-6 rounded-full bg-emerald-50 border border-[#10B981]/25
                                    flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-[#10B981]" aria-hidden="true"/>
                    </div>
                    <span className="text-sm font-semibold text-[#1C1917] leading-snug">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-5 border-t border-[#E8DED3]">
                <p className="font-amiri text-[#D97706] text-lg text-center" lang="ar">
                  وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً
                </p>
                <p className="text-xs text-stone-400 text-center mt-1">Surah Ar-Rum 30:21</p>
              </div>
            </div>
          </RevealWrapper>
        </div>
      </section>

      {/* ── Objectives ── */}
      <section aria-labelledby="objectives-heading" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-14">
            <SectionHead
              eyebrow="What We Stand For"
              title="Our Objectives"
              body="Nine guiding principles that shape every program, service, and initiative at Intikhab-e-Zauj."
            />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {objectives.map((o, i) => (
              <RevealWrapper key={o.title} delay={i * 50}>
                <NumberCard n={i + 1} icon={o.icon} title={o.title} body={o.body}/>
              </RevealWrapper>
            ))}
          </div>
        </div>
      </section>

      {/* ── Intikhab-e-Zauj feature ── */}
      <section aria-labelledby="iezauj-heading"
               className="relative py-24 overflow-hidden
                          bg-linear-to-br from-[#031a0e] via-[#052e16] to-[#065F46]">
        <GeoPattern id="iezauj-geo" opacity={0.07}/>
        <div className="relative z-10 max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <RevealWrapper>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                            bg-[#D97706]/20 border border-[#D97706]/30 mb-5">
              <span className="text-[#D97706] text-sm font-bold uppercase tracking-wider">
                Featured Project
              </span>
            </div>
            <h2 id="iezauj-heading" className="font-amiri text-4xl md:text-5xl font-bold text-white mb-5">
              Intikhab-e-Zauj
            </h2>
            <p className="text-xl text-white/70 mb-6 leading-relaxed">
              A matrimonial facilitation platform
              combining Islamic values with modern, staff-mediated matchmaking.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                'Help individuals and families find suitable marriage proposals',
                'Encourage Islamic values in every step of matchmaking',
                'Promote responsible and transparent profile matching',
                'Support families throughout the entire marriage process',
                '100-point compatibility scoring — fully transparent',
                'Staff-reviewed profiles — no fake accounts, no shortcuts',
              ].map(pt => (
                <li key={pt} className="flex items-start gap-3 text-white/75 text-base">
                  <Check className="w-4 h-4 text-[#10B981] mt-0.5 shrink-0" aria-hidden="true"/>
                  {pt}
                </li>
              ))}
            </ul>
            <Link href="/quick-register">
              <span className="cursor-pointer inline-block px-7 py-4 rounded-xl font-bold text-base
                               bg-[#D97706] hover:bg-[#B45309] text-white transition-all
                               hover:scale-[1.02] shadow-[0_4px_20px_rgba(217,119,6,0.4)]">
                Register on Intikhab-e-Zauj
              </span>
            </Link>
          </RevealWrapper>

          <RevealWrapper delay={100}>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '100-pt', label: 'Compatibility Score' },
                { value: '100%',   label: 'Staff-Mediated'      },
                { value: 'Free',   label: 'Founding Access'     },
                { value: 'Privacy',label: 'By Design'           },
              ].map(s => (
                <div key={s.label}
                     className="bg-white/8 backdrop-blur-sm rounded-2xl border border-white/15
                                px-5 py-6 text-center hover:bg-white/14 transition-colors">
                  <p className="font-amiri text-4xl font-bold text-white mb-1">{s.value}</p>
                  <p className="text-white/50 text-sm font-semibold">{s.label}</p>
                </div>
              ))}
            </div>
          </RevealWrapper>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section aria-label="Register"
               className="relative py-24 overflow-hidden
                          bg-linear-to-br from-[#031a0e] via-[#052e16] to-[#065F46]">
        <GeoPattern id="about-cta-geo" opacity={0.07}/>
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <RevealWrapper>
            <p className="font-amiri text-[#D97706] text-lg mb-2 tracking-wide">Join Our Community</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5">
              Ready to Find a Guided Match?
            </h2>
            <p className="text-xl text-white/65 max-w-2xl mx-auto mb-10">
              Register on Intikhab-e-Zauj — staff-reviewed, transparent,
              and rooted in Islamic values.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/quick-register">
                <span className="cursor-pointer inline-block px-9 py-4 rounded-2xl font-bold text-lg
                                 text-white bg-[#D97706] hover:bg-[#B45309] transition-all
                                 shadow-[0_4px_24px_rgba(217,119,6,0.4)]
                                 hover:shadow-[0_6px_32px_rgba(217,119,6,0.5)] hover:-translate-y-0.5">
                  Register Free
                </span>
              </Link>
            </div>
          </RevealWrapper>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
