import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { getToken } from '@/lib/auth';
import {
  Users, Clock, CheckCircle2, Heart, ArrowRight, UserPlus, ClipboardCheck,
  Sparkles, FileText, ShieldCheck, HeartHandshake,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function StaffDashboard() {
  const [, setLocation] = useLocation();
  const [matchStats,   setMatchStats]   = useState({ total: 0, suggested: 0 });
  const [profileStats, setProfileStats] = useState({ total: 0, pending: 0, approved: 0 });
  const [loading, setLoading] = useState(true);

  const token = getToken('staff');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/staff/matches/staff-view`, { headers }).then(r => r.json()).catch(() => ({})),
      fetch(`${API}/api/staff/profiles`,           { headers }).then(r => r.json()).catch(() => ({})),
    ]).then(([matchData, profileData]) => {
      const matches: any[]  = matchData.matches || [];
      const profiles: any[] = profileData.data  || [];
      setMatchStats({
        total:     matches.length,
        suggested: matches.filter((m: any) => m.status === 'suggested').length,
      });
      setProfileStats({
        total:    profiles.length,
        pending:  profiles.filter((p: any) => p.profileStatus === 'pending').length,
        approved: profiles.filter((p: any) => p.profileStatus === 'approved').length,
      });
    }).finally(() => setLoading(false));
  }, []);

  const val = (n: number) => loading ? '—' : n;

  // Pastel stat cards (reference "My Task" style)
  const stats = [
    { label: 'Total Profiles',   value: val(profileStats.total),    icon: Users,        grad: 'from-emerald-50', ring: 'bg-primary' },
    { label: 'Pending Approval', value: val(profileStats.pending),  icon: Clock,        grad: 'from-amber-50',   ring: 'bg-[#D97706]' },
    { label: 'Approved',         value: val(profileStats.approved), icon: CheckCircle2, grad: 'from-sky-50',     ring: 'bg-sky-500'   },
    { label: 'Total Matches',    value: val(matchStats.total),      icon: Heart,        grad: 'from-violet-50',  ring: 'bg-violet-500'},
  ];

  // Quick action tiles (reference "Recommended Categories" style)
  const tiles = [
    { label: 'Data Entry',       icon: UserPlus,       to: '/staff/data-entry',       color: 'text-primary' },
    { label: 'Approvals',        icon: ClipboardCheck, to: '/staff/profile-approval', color: 'text-[#D97706]' },
    { label: 'Matches',          icon: Sparkles,       to: '/staff/matches',          color: 'text-violet-500' },
    { label: 'Profiles',         icon: Users,          to: '/staff/profiles',         color: 'text-sky-500' },
    { label: 'Proposals',        icon: FileText,       to: '/staff/proposals',        color: 'text-rose-500' },
    { label: 'Q&A Moderation',   icon: ShieldCheck,    to: '/staff/messages',         color: 'text-primary' },
    { label: 'Counselling',      icon: HeartHandshake, to: '/staff/counselling',      color: 'text-[#D97706]' },
    { label: 'Audit Logs',       icon: ClipboardCheck, to: '/staff/audit',            color: 'text-gray-500' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-7">

      {/* ── Pastel stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label}
                 className={`relative overflow-hidden rounded-2xl border border-gray-100 shadow-sm
                             p-5 bg-linear-to-br ${s.grad} to-white`}>
              <div className={`w-10 h-10 rounded-full ${s.ring} flex items-center justify-center mb-4
                               shadow-sm`}>
                <Icon className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <div className="text-sm font-medium text-gray-500">{s.label}</div>
              <div className="text-3xl font-bold text-foreground mt-0.5">{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* ── Quick action tiles ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-foreground mb-5">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tiles.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.label} onClick={() => setLocation(t.to)}
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-100
                           hover:border-primary hover:bg-emerald-50/50 transition-colors text-left group">
                <div className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-white
                                flex items-center justify-center shrink-0 transition-colors">
                  <Icon className={`w-5 h-5 ${t.color}`} aria-hidden="true" />
                </div>
                <span className="text-sm font-semibold text-foreground flex-1">{t.label}</span>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Priority row + workflow ── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Pending highlight */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Needs Attention</h2>
            <Clock className="w-5 h-5 text-[#D97706]" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50">
              <span className="text-sm font-semibold text-foreground">Pending approval</span>
              <span className="text-lg font-bold text-[#D97706]">{val(profileStats.pending)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50">
              <span className="text-sm font-semibold text-foreground">Suggested matches</span>
              <span className="text-lg font-bold text-primary">{val(matchStats.suggested)}</span>
            </div>
          </div>
          <button onClick={() => setLocation('/staff/profile-approval')}
            className="mt-4 h-11 rounded-xl bg-primary hover:bg-primary text-white
                       text-sm font-bold transition-colors flex items-center justify-center gap-2">
            Review Now <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Workflow */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-foreground mb-5">Staff Workflow</h2>
          <ol className="space-y-4">
            {[
              ['Data Entry',         'Create profiles from WhatsApp, paper forms, or walk-ins'],
              ['Profile Creation',   'Profile saved as pending, awaiting staff review'],
              ['Approval Review',    'Approve or reject with reason — email sent automatically'],
              ['Activation',         'Approved profiles become visible in the applicant list'],
              ['Match Generation',   'Matches auto-generate on approval using our algorithm'],
            ].map(([title, desc], i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="shrink-0 w-7 h-7 rounded-full bg-emerald-50 text-primary
                                 flex items-center justify-center text-sm font-bold mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <span className="font-bold text-foreground">{title}:</span>
                  <span className="ml-2 text-sm text-gray-500">{desc}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
