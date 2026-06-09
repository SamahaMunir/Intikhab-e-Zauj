import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function StaffDashboard() {
  const [, setLocation] = useLocation();
  const [matchStats,   setMatchStats]   = useState({ total: 0, suggested: 0 });
  const [profileStats, setProfileStats] = useState({ total: 0, pending: 0, approved: 0 });
  const [loading, setLoading] = useState(true);

  const user  = JSON.parse(localStorage.getItem('user') || '{}');
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

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* ── Greeting ── */}
      <div className="pb-4 border-b border-[#E8DED3]">
        <p className="font-amiri text-[#D97706] text-lg tracking-wide">
          As-Salamu Alaykum
        </p>
        <h1 className="text-3xl font-bold text-[#1C1917] mt-0.5">
          {user.name || 'Staff'}{' '}
          <span className="text-lg font-semibold text-stone-400 capitalize">
            — {user.role || 'staff'}
          </span>
        </h1>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Profiles',   value: val(profileStats.total),    bg: 'bg-white',         text: 'text-[#1C1917]',  border: 'border-[#E8DED3]' },
          { label: 'Pending Approval', value: val(profileStats.pending),  bg: 'bg-[#FEF9EE]',     text: 'text-[#D97706]',  border: 'border-[#FCD34D]' },
          { label: 'Approved',         value: val(profileStats.approved), bg: 'bg-emerald-50',    text: 'text-[#10B981]',  border: 'border-[#10B981]' },
          { label: 'Total Matches',    value: val(matchStats.total),      bg: 'bg-white',         text: 'text-[#1C1917]',  border: 'border-[#E8DED3]' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border-2 px-6 py-5 shadow-warm ${s.bg} ${s.border}`}>
            <div className={`text-4xl font-black ${s.text}`}>{s.value}</div>
            <div className="mt-1 text-sm font-semibold text-stone-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Quick actions ── */}
      <div>
        <h2 className="text-xl font-bold text-[#1C1917] mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-3 gap-5">

          {/* Data Entry */}
          <div className="bg-white rounded-2xl border border-[#E8DED3] p-6 flex flex-col gap-4
                          shadow-warm hover:shadow-md transition-shadow">
            <div>
              <h3 className="text-xl font-bold text-[#1C1917]">Offline Data Entry</h3>
              <p className="mt-2 text-base text-stone-500">
                Create applicant profiles from WhatsApp, paper forms, or walk-ins.
              </p>
            </div>
            <button
              onClick={() => setLocation('/staff/data-entry')}
              className="mt-auto min-h-12.5 w-full rounded-xl bg-[#10B981] hover:bg-[#059669]
                         text-white text-lg font-bold transition-colors"
            >
              Start Data Entry
            </button>
          </div>

          {/* Profile Approval */}
          <div className="bg-white rounded-2xl border border-[#E8DED3] p-6 flex flex-col gap-4
                          shadow-warm hover:shadow-md transition-shadow">
            <div>
              <h3 className="text-xl font-bold text-[#1C1917]">Profile Approvals</h3>
              {!loading && profileStats.pending > 0 && (
                <div className="mt-2 inline-block px-3 py-1 rounded-full bg-[#FEF9EE]
                                border border-[#FCD34D] text-[#D97706] text-sm font-bold">
                  {profileStats.pending} awaiting review
                </div>
              )}
              <p className="mt-2 text-base text-stone-500">
                Review and approve profiles submitted by applicants.
              </p>
            </div>
            <button
              onClick={() => setLocation('/staff/profile-approval')}
              className="mt-auto min-h-12.5 w-full rounded-xl bg-[#10B981] hover:bg-[#059669]
                         text-white text-lg font-bold transition-colors"
            >
              Review Profiles
            </button>
          </div>

          {/* Matches */}
          <div className="bg-white rounded-2xl border border-[#E8DED3] p-6 flex flex-col gap-4
                          shadow-warm hover:shadow-md transition-shadow">
            <div>
              <h3 className="text-xl font-bold text-[#1C1917]">Match Suggestions</h3>
              <div className="mt-3 flex gap-3">
                <div className="flex-1 rounded-xl bg-[#FDF8F3] border border-[#E8DED3] px-4 py-3 text-center">
                  <div className="text-2xl font-black text-[#1C1917]">{val(matchStats.suggested)}</div>
                  <div className="text-xs font-semibold text-stone-500 mt-0.5">Suggested</div>
                </div>
                <div className="flex-1 rounded-xl bg-emerald-50 border border-[#10B981] px-4 py-3 text-center">
                  <div className="text-2xl font-black text-[#10B981]">{val(matchStats.total)}</div>
                  <div className="text-xs font-semibold text-stone-500 mt-0.5">Total</div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setLocation('/staff/matches')}
              className="mt-auto min-h-12.5 w-full rounded-xl bg-[#10B981] hover:bg-[#059669]
                         text-white text-lg font-bold transition-colors"
            >
              View Matches
            </button>
          </div>
        </div>
      </div>

      {/* ── Workflow ── */}
      <div className="bg-white rounded-2xl border border-[#E8DED3] p-6 shadow-warm">
        <h2 className="text-xl font-bold text-[#1C1917] mb-5">Staff Workflow</h2>
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
              <span className="shrink-0 w-8 h-8 rounded-full bg-[#10B981] text-white flex items-center
                               justify-center text-sm font-bold mt-0.5">
                {i + 1}
              </span>
              <div>
                <span className="font-bold text-[#1C1917]">{title}:</span>
                <span className="ml-2 text-base text-stone-500">{desc}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Hadith footer ── */}
      <div className="text-center py-4">
        <p className="font-amiri text-[#D97706] text-base italic">
          "وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا"
        </p>
        <p className="text-sm text-stone-400 mt-1">Surah Ar-Rum 30:21</p>
      </div>
    </div>
  );
}
