import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Users, Clock, CheckCircle2, Heart, ArrowRight, Plus, ClipboardCheck, Sparkles,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function StaffDashboard() {
  const [, setLocation] = useLocation();
  const [matchStats,   setMatchStats]   = useState({ total: 0, suggested: 0 });
  const [profileStats, setProfileStats] = useState({ total: 0, pending: 0, approved: 0 });
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token') || '';
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

  const stats = [
    { label: 'Total Profiles',   value: val(profileStats.total),    icon: Users,        chip: 'bg-emerald-50 text-[#10B981]' },
    { label: 'Pending Approval', value: val(profileStats.pending),  icon: Clock,        chip: 'bg-amber-50 text-[#D97706]'   },
    { label: 'Approved',         value: val(profileStats.approved), icon: CheckCircle2, chip: 'bg-emerald-50 text-[#10B981]' },
    { label: 'Total Matches',    value: val(matchStats.total),      icon: Heart,        chip: 'bg-emerald-50 text-[#10B981]' },
  ];

  const actions = [
    {
      title: 'Offline Data Entry',
      desc:  'Create applicant profiles from WhatsApp, paper forms, or walk-ins.',
      icon:  Plus,
      cta:   'Start Data Entry',
      to:    '/staff/data-entry',
    },
    {
      title: 'Profile Approvals',
      desc:  'Review and approve profiles submitted by applicants.',
      icon:  ClipboardCheck,
      cta:   'Review Profiles',
      to:    '/staff/profile-approval',
      badge: !loading && profileStats.pending > 0 ? `${profileStats.pending} awaiting review` : undefined,
    },
    {
      title: 'Match Suggestions',
      desc:  'Review AI-generated compatibility matches before they go out.',
      icon:  Sparkles,
      cta:   'View Matches',
      to:    '/staff/matches',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-7">

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label}
                 className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5
                            hover:shadow-md transition-shadow">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${s.chip}`}>
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="text-3xl font-bold text-[#1C1917]">{s.value}</div>
              <div className="mt-1 text-sm font-medium text-gray-500">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* ── Quick actions ── */}
      <div>
        <h2 className="text-lg font-bold text-[#1C1917] mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {actions.map(a => {
            const Icon = a.icon;
            return (
              <div key={a.title}
                   className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6
                              flex flex-col gap-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-[#10B981]" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[#1C1917]">{a.title}</h3>
                  {a.badge && (
                    <span className="inline-block mt-2 px-3 py-1 rounded-full bg-amber-50
                                     text-[#D97706] text-xs font-bold">
                      {a.badge}
                    </span>
                  )}
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">{a.desc}</p>
                </div>
                <button
                  onClick={() => setLocation(a.to)}
                  className="w-full h-11 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white
                             text-sm font-bold transition-colors flex items-center justify-center gap-2">
                  {a.cta}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Workflow ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#1C1917] mb-5">Staff Workflow</h2>
        <ol className="space-y-4">
          {[
            ['Data Entry',         'Create profiles from WhatsApp, paper forms, or walk-ins'],
            ['Profile Creation',   'Profile saved as pending, awaiting staff review'],
            ['Approval Review',    'Approve or reject with reason — email sent automatically'],
            ['Email Notification', 'Applicant receives result and next steps by email'],
            ['Activation',         'Approved profiles become visible in the applicant list'],
            ['Match Generation',   'Matches auto-generate on approval using our algorithm'],
          ].map(([title, desc], i) => (
            <li key={i} className="flex items-start gap-4">
              <span className="shrink-0 w-7 h-7 rounded-full bg-emerald-50 text-[#10B981]
                               flex items-center justify-center text-sm font-bold mt-0.5">
                {i + 1}
              </span>
              <div>
                <span className="font-bold text-[#1C1917]">{title}:</span>
                <span className="ml-2 text-sm text-gray-500">{desc}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
