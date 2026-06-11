import { Link } from 'wouter';
import {
  Shield, Heart, Users, BookOpen, FileText, BarChart3, MessageCircle,
  Home, Star, GraduationCap, Book, Mic, Activity, Package, Brain,
  Search, Phone, Scale, Check, ChevronRight,
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

// ── Icon card ─────────────────────────────────────────────────────────────────
function IconCard({ icon: Icon, title, body, accent = false }: {
  icon: React.ElementType; title: string; body: string; accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-6 h-full shadow-warm group
                     hover:-translate-y-1.5 hover:shadow-md transition-all duration-300 ${
      accent ? 'bg-emerald-50 border-[#10B981]/25' : 'bg-white border-[#E8DED3]'
    }`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4
                       transition-colors duration-300 ${
        accent ? 'bg-[#10B981]/15 group-hover:bg-[#10B981]'
               : 'bg-emerald-50 border border-[#10B981]/20 group-hover:bg-[#10B981]'
      }`}>
        <Icon className="w-6 h-6 text-[#10B981] group-hover:text-white transition-colors duration-300"
              aria-hidden="true"/>
      </div>
      <h3 className="text-lg font-bold text-[#1C1917] mb-2">{title}</h3>
      <p className="text-sm text-stone-500 leading-relaxed">{body}</p>
    </div>
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
    { icon: MessageCircle, title: 'Domestic Violence',         body: 'Provide solutions to domestic violence, oppression, and harmful behaviors through counselling and intervention.' },
    { icon: Star,          title: 'Respect for Elders',        body: 'Promote respect, care, and dignified treatment for elderly family members as an Islamic duty.' },
    { icon: BookOpen,      title: 'Moral Development',         body: 'Encourage stronger family relationships, ethical conduct, and moral growth rooted in Islamic principles.' },
  ];

  const activities = [
    { icon: BookOpen,      title: 'Monthly Lectures',     body: 'Regular scholarly lectures on family, marriage, and Islamic values open to the public.' },
    { icon: MessageCircle, title: 'Discussion Forums',    body: 'Structured community forums where families share experiences and seek guidance.' },
    { icon: Mic,           title: 'Seminars',             body: 'Expert-led seminars on marriage, parenting, and family law in Pakistan.' },
    { icon: Heart,         title: 'Counselling Sessions', body: 'One-on-one and group counselling for pre-marital, marital, and post-marital matters.' },
    { icon: GraduationCap, title: 'Training Workshops',   body: 'Empowerment workshops specifically designed for girls and women.' },
  ];

  const welfare = [
    { icon: Activity, title: 'Medical Assistance',   body: 'Financial and logistical medical support for deserving individuals who cannot access healthcare independently.' },
    { icon: Heart,    title: 'Nikah Support',        body: 'Material and financial support to deserving families for dignified, simple Nikah ceremonies.' },
    { icon: Package,  title: 'Essential Provisions', body: 'Provision of essential household and daily-life items to families and individuals in genuine need.' },
  ];

  const consultation = [
    { icon: Heart,         title: 'Pre-Marital Counselling',  body: 'Preparing individuals and families for marriage with realistic expectations and Islamic guidance.' },
    { icon: MessageCircle, title: 'Post-Marital Counselling', body: 'Ongoing support for couples navigating the realities of married and family life.' },
    { icon: Brain,         title: 'Psychological Guidance',   body: 'Professional support for mental and emotional challenges within the family context.' },
    { icon: Scale,         title: 'Conflict Resolution',      body: 'Structured, neutral mediation for marital conflicts — focused on reconciliation and stability.' },
    { icon: Phone,         title: 'Legal Guidance',           body: 'Access to legal information on marriage, divorce, custody, and inheritance rights.' },
    { icon: Users,         title: 'Family Mediation',         body: 'Multi-party facilitation for extended family disputes, dowry issues, and inheritance conflicts.' },
  ];

  const publications = [
    { icon: Book,     title: 'Women & Family Issues',  body: 'Research-driven publications addressing the unique challenges faced by women in Pakistani families.' },
    { icon: FileText, title: 'Pamphlets & Booklets',   body: 'Widely distributed short-form guides on marriage, family rights, and Islamic family law.' },
    { icon: BookOpen, title: 'Educational Resources',  body: 'Curriculum and training materials used in workshops, schools, and community programs.' },
  ];

  const research = [
    { icon: Search,    title: 'Family Surveys',        body: 'Large-scale surveys measuring family life, marriage trends, and domestic challenges in Pakistan.' },
    { icon: BarChart3, title: 'Data Collection',       body: 'Systematic collection of family and marriage data to inform policy recommendations.' },
    { icon: BookOpen,  title: 'Academic Research',     body: 'Rigorous academic studies published and presented at national and international forums.' },
    { icon: FileText,  title: 'Reports & Publications',body: 'Formal reports on women, family, and domestic issues for government and NGO stakeholders.' },
    { icon: Users,     title: 'Community Studies',     body: 'Ground-level research reflecting the lived reality of Pakistani families across regions.' },
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
            Falah Khandan Center — Women Commission, Lahore
          </div>
          <h1 className="font-amiri text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            About <span className="text-[#D97706]">Falah Khandan Center</span>
          </h1>
          <p className="text-xl text-white/65 max-w-3xl mx-auto leading-relaxed mb-10">
            Intikhab-e-Zauj is a matrimonial facilitation project of Falah Khandan Center,
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
              Falah Khandan Center
            </h2>
            <p className="text-lg text-stone-600 leading-relaxed mb-5">
              <strong className="text-[#1C1917]">Falah Khandan Center (FKC)</strong> believes
              that the family unit is the foundation of a healthy and successful society.
            </p>
            <p className="text-base text-stone-500 leading-relaxed mb-5">
              Islam aims to develop a society grounded in timeless values — ones that begin
              at home and radiate outward to the entire community. FKC exists to cultivate
              those values in Pakistani families through education, support, and guided intervention.
            </p>
            <p className="text-base text-stone-500 leading-relaxed mb-8">
              The family institution plays a central role in cultivating these values and
              preserving future generations — and FKC stands at that centre.
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
              body="Nine guiding principles that shape every program, service, and initiative at Falah Khandan Center."
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
              A matrimonial facilitation platform developed under Falah Khandan Center —
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
                { value: 'PKR 4K', label: 'Per Year'            },
                { value: '600+',   label: 'Success Stories'     },
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

      {/* ── Activities ── */}
      <section aria-labelledby="activities-heading" className="py-24 bg-[#FDF8F3]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-14">
            <SectionHead
              eyebrow="Programs & Events"
              title="Our Activities"
              body="From monthly lectures to hands-on training, FKC creates consistent opportunities for family learning and community engagement."
            />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {activities.map((a, i) => (
              <RevealWrapper key={a.title} delay={i * 70}>
                <IconCard icon={a.icon} title={a.title} body={a.body}/>
              </RevealWrapper>
            ))}
          </div>
        </div>
      </section>

      {/* ── Welfare ── */}
      <section aria-labelledby="welfare-heading" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-14">
            <SectionHead
              eyebrow="Community Care"
              title="Welfare Services"
              body="Beyond education and counselling, FKC provides direct material support to those who need it most."
            />
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {welfare.map((w, i) => (
              <RevealWrapper key={w.title} delay={i * 80}>
                <IconCard icon={w.icon} title={w.title} body={w.body} accent/>
              </RevealWrapper>
            ))}
          </div>
        </div>
      </section>

      {/* ── Consultation ── */}
      <section aria-labelledby="consult-heading" className="py-24 bg-[#FDF8F3]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-14">
            <SectionHead
              eyebrow="Expert Guidance"
              title="Consultation & Counselling"
              body="Professional, compassionate guidance across every stage of family life — from pre-marital preparation to conflict resolution."
            />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {consultation.map((c, i) => (
              <RevealWrapper key={c.title} delay={i * 70}>
                <IconCard icon={c.icon} title={c.title} body={c.body}/>
              </RevealWrapper>
            ))}
          </div>
        </div>
      </section>

      {/* ── Publications + Research ── */}
      <section aria-label="Publications and Research" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16">
          {/* Publications */}
          <div>
            <RevealWrapper className="mb-10">
              <p className="font-amiri text-[#D97706] text-lg mb-1 tracking-wide">Knowledge</p>
              <h2 className="text-3xl font-bold text-[#1C1917] mb-3">Publications</h2>
              <p className="text-base text-stone-500 leading-relaxed">
                FKC produces accessible, research-based content on women, marriage, and family
                for both professionals and the general public.
              </p>
            </RevealWrapper>
            <div className="space-y-4">
              {publications.map((p, i) => (
                <RevealWrapper key={p.title} delay={i * 60}>
                  <div className="flex gap-4 bg-[#FDF8F3] rounded-2xl border border-[#E8DED3] p-5
                                  shadow-warm hover:-translate-y-0.5 hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#10B981]/20
                                    flex items-center justify-center shrink-0">
                      <p.icon className="w-5 h-5 text-[#10B981]" aria-hidden="true"/>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#1C1917] mb-1">{p.title}</h3>
                      <p className="text-sm text-stone-500 leading-relaxed">{p.body}</p>
                    </div>
                  </div>
                </RevealWrapper>
              ))}
            </div>
          </div>

          {/* Research */}
          <div>
            <RevealWrapper className="mb-10">
              <p className="font-amiri text-[#D97706] text-lg mb-1 tracking-wide">Evidence-Based</p>
              <h2 className="text-3xl font-bold text-[#1C1917] mb-3">Research & Development</h2>
              <p className="text-base text-stone-500 leading-relaxed">
                FKC invests in data, surveys, and academic research to ensure its programs
                are grounded in evidence and responsive to real family needs.
              </p>
            </RevealWrapper>
            <div className="space-y-4">
              {research.map((r, i) => (
                <RevealWrapper key={r.title} delay={i * 60}>
                  <div className="flex gap-4 bg-[#FDF8F3] rounded-2xl border border-[#E8DED3] p-5
                                  shadow-warm hover:-translate-y-0.5 hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#10B981]/20
                                    flex items-center justify-center shrink-0">
                      <r.icon className="w-5 h-5 text-[#10B981]" aria-hidden="true"/>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#1C1917] mb-1">{r.title}</h3>
                      <p className="text-sm text-stone-500 leading-relaxed">{r.body}</p>
                    </div>
                  </div>
                </RevealWrapper>
              ))}
            </div>
          </div>
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
              Register on Intikhab-e-Zauj — the matrimonial project of Falah Khandan Center.
              Staff-reviewed, transparent, and rooted in Islamic values.
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
              <Link href="/counselling">
                <span className="cursor-pointer inline-block px-9 py-4 rounded-2xl font-bold text-lg
                                 border-2 border-white/30 text-white
                                 hover:bg-white/10 hover:border-white/50 transition-all">
                  Book Counselling
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
