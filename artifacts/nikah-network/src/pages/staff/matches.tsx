import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import {
  Heart, RefreshCw, Sparkles, ChevronDown, ChevronRight,
  Send, Loader2, Users, ShieldCheck, UserCheck, Star, ArrowUpRight,
} from 'lucide-react';
import ScoreBreakdownPanel from '../../components/ScoreBreakdownUI';
import ProfileImageCard from '../../components/matches/ProfileImageCard';
import MatchScoreBadge from '../../components/matches/MatchScoreBadge';
import ProposalModal, { ProposalMode, ProposalPayload } from '../../components/matches/ProposalModal';
import InsightsModal from '../../components/matches/InsightsModal';
import proposalService from '../../services/proposalService';
import { getToken } from '@/lib/auth';
import { useStore } from '@/lib/store';

type ProfileType = 'user' | 'staff';

interface ProfileSide {
  _id?: string;
  name?: string;
  age?: number;
  city?: string;
  gender?: string;
  caste?: string;
  profession?: string;
  education?: string;
  photo?: string;
  source?: string;
}

interface MatchRecord {
  _id: string;
  score: number;
  status: string;
  leftProfileType?: ProfileType;
  rightProfileType?: ProfileType;
  scoreBreakdown?: {
    caste: number; profession: number; ageGap: number; city: number;
    height: number; houseStatus: number; houseArea: number; total: number;
  };
  user?: ProfileSide;
  candidate?: ProfileSide;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Pair-type badge (display only — real data)
function pairBadge(both: boolean) {
  return both
    ? <span className="px-3 py-1 text-xs font-bold rounded-full bg-violet-50 text-violet-600">Staff ↔ Staff</span>
    : <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 text-primary">Staff ↔ User</span>;
}

export default function StaffMatches() {
  const [, setLocation] = useLocation();
  const [matches,     setMatches]     = useState<MatchRecord[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [generating,  setGenerating]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [typeFilter,  setTypeFilter]  = useState<'all' | 'staff-staff' | 'staff-user'>('all');

  const [proposalModal, setProposalModal] = useState<
    { mode: ProposalMode; name?: string; id?: string; initiatorId?: string; recipientId?: string; matchId?: string } | null
  >(null);
  const [insightsMatchId, setInsightsMatchId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const users = useStore(s => s.users);
  const staffOptions = useMemo(
    () => users.filter(u => u.role === 'staff' || u.role === 'admin').map(u => ({ id: u.id, name: u.name })),
    [users]);

  const submitProposal = async (payload: ProposalPayload) => {
    const initiatorId = proposalModal?.initiatorId;
    const recipientId = proposalModal?.recipientId;
    const matchId = proposalModal?.matchId;
    if (!initiatorId || !recipientId) return;
    setError(null);
    if (payload.type === 'USER_PROPOSAL') {
      await proposalService.create({
        type: 'USER_PROPOSAL', initiatorId, recipientId, matchId,
        message: payload.message, matchNotes: payload.matchNotes, compatibilityReason: payload.compatibilityReason,
      });
    } else {
      await proposalService.create({
        type: 'STAFF_PROPOSAL', initiatorId, recipientId, matchId,
        notes: payload.notes, justification: payload.justification,
      });
    }
    // Proposal created → this pair has entered the pipeline. Remove its card
    // immediately (no refetch needed) and confirm.
    if (matchId) setMatches(prev => prev.filter(m => m._id !== matchId));
    setSuccess('Proposal created successfully. This match has been removed from suggestions.');
    setTimeout(() => setSuccess(null), 5000);
  };

  const token = getToken('staff');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await fetch(`${API}/api/staff/matches/staff-view`, { headers });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to load matches');
      setMatches(d.matches || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading matches');
    } finally {
      setLoading(false);
    }
  };

  const generateStaffMatches = async () => {
    try {
      setGenerating(true);
      setError(null);
      const r = await fetch(`${API}/api/staff/matches/generate-all-staff`, {
        method: 'POST',
        headers,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Generation failed');
      console.log(`✅ Generated ${d.matchesGenerated} matches for ${d.staffProfilesProcessed} staff profiles`);
      await load(); // reload after generation
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation error');
      setGenerating(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Apply type filters
  const filtered = matches.filter(m => {
    if (typeFilter === 'all') return true;
    if (typeFilter === 'staff-staff') return m.leftProfileType === 'staff' && m.rightProfileType === 'staff';
    if (typeFilter === 'staff-user')  return (m.leftProfileType === 'staff') !== (m.rightProfileType === 'staff'); // XOR
    return true;
  });

  // Real, meaningful stats
  const isStaffStaff = (m: MatchRecord) => m.leftProfileType === 'staff' && m.rightProfileType === 'staff';
  const isStaffUser  = (m: MatchRecord) => (m.leftProfileType === 'staff') !== (m.rightProfileType === 'staff');
  const stats = [
    { label: 'Total Matches',     value: matches.length,                                              icon: Users,       grad: 'from-emerald-50', ring: 'text-primary' },
    { label: 'Staff ↔ Staff',     value: matches.filter(isStaffStaff).length,                          icon: ShieldCheck, grad: 'from-violet-50',  ring: 'text-violet-500' },
    { label: 'Staff ↔ User',      value: matches.filter(isStaffUser).length,                           icon: UserCheck,   grad: 'from-sky-50',     ring: 'text-sky-500' },
    { label: 'High Compatibility', value: matches.filter(m => (m.scoreBreakdown?.total ?? m.score) >= 75).length, icon: Star, grad: 'from-amber-50', ring: 'text-[#D97706]' },
  ];

  if (loading) return (
    <div className="flex justify-center items-center min-h-64">
      <div className="text-center">
        <Loader2 className="w-9 h-9 animate-spin text-primary mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading staff matches…</p>
      </div>
    </div>
  );

  // Info lines (reference layout): profession, then "City | Education"
  const sideLines = (p?: ProfileSide) => {
    const second = [p?.city, p?.education].filter(Boolean).join('  |  ');
    return [p?.profession, second].filter(Boolean) as string[];
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Matches</h1>
          <p className="text-sm text-gray-500">Manage and review proposed matches</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-500 mr-1">{matches.length} Matches</span>
          <button onClick={load}
            className="flex items-center gap-2 h-11 px-4 rounded-xl border border-gray-200 bg-white
                       text-sm font-bold text-foreground hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={generateStaffMatches} disabled={generating}
            className="flex items-center gap-2 h-11 px-5 rounded-xl bg-primary hover:bg-primary
                       text-white text-sm font-bold transition-colors disabled:opacity-50">
            <Sparkles className="w-4 h-4" />
            {generating ? 'Generating…' : 'Generate Matches'}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label}
              className={`rounded-2xl border border-gray-100 shadow-sm p-6 bg-linear-to-br ${s.grad} to-white`}>
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4">
                <Icon className={`w-6 h-6 ${s.ring}`} />
              </div>
              <div className="text-sm font-semibold text-gray-500">{s.label}</div>
              <div className="text-4xl font-black text-foreground mt-1">{s.value}</div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-primary text-sm font-semibold">{success}</div>
      )}

      {/* Type filter tabs */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mr-1">Type</span>
        {([
          { key: 'all',         label: 'All' },
          { key: 'staff-staff', label: 'Staff ↔ Staff' },
          { key: 'staff-user',  label: 'Staff ↔ User' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setTypeFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              typeFilter === key
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-emerald-50 hover:text-primary'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && !error && (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <Heart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-semibold mb-1">
            {matches.length === 0 ? 'No staff matches yet' : 'No matches for selected filter'}
          </p>
          {matches.length === 0 && (
            <p className="text-gray-400 text-sm">
              Click "Generate Matches" to build matches for all staff-created profiles.
            </p>
          )}
        </div>
      )}

      {/* Match cards */}
      <div className="space-y-5">
        {filtered.map(m => {
          const score      = m.scoreBreakdown?.total ?? m.score;
          const isExpanded = expandedId === m._id;

          // Always display male (groom) on left, female (bride) on right
          const maleProfile   = m.user?.gender === 'male' ? m.user      : m.candidate;
          const femaleProfile = m.user?.gender === 'male' ? m.candidate : m.user;
          const maleType      = m.user?.gender === 'male' ? (m.leftProfileType  ?? 'user') : (m.rightProfileType ?? 'user');
          const femaleType    = m.user?.gender === 'male' ? (m.rightProfileType ?? 'user') : (m.leftProfileType  ?? 'user');
          const bothStaff     = maleType === 'staff' && femaleType === 'staff';
          const pairName      = `${maleProfile?.name?.split(' ')[0] || 'Unknown'} & ${femaleProfile?.name?.split(' ')[0] || 'Unknown'}`;

          return (
            <div key={m._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

              {/* Card header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2.5">
                  <Heart className="w-5 h-5 text-primary" />
                  {pairName}
                </h3>
                {pairBadge(bothStaff)}
              </div>

              {/* Paired profile cards with center match badge */}
              <div className="relative p-5">
                <div className="grid sm:grid-cols-2 gap-4 sm:gap-16">
                  {([
                    { p: maleProfile,   id: maleProfile?._id,   label: 'View Groom', type: maleType   as ProfileType },
                    { p: femaleProfile, id: femaleProfile?._id, label: 'View Bride', type: femaleType as ProfileType },
                  ]).map((side, i) => (
                    <ProfileImageCard key={i}
                      photo={side.p?.photo} name={side.p?.name || 'Unknown'} age={side.p?.age}
                      lines={sideLines(side.p)} heightClass="aspect-3/4"
                      onClick={side.id ? () => setLocation(`/staff/profiles/${side.id}`) : undefined}
                      footer={side.id ? (
                        <button onClick={() => setLocation(`/staff/profiles/${side.id}`)}
                          className="w-full h-11 rounded-xl border border-[#E8DED3] text-foreground text-sm font-bold
                                     flex items-center justify-center gap-1.5 hover:bg-[#FDF8F3] hover:border-primary transition-colors">
                          View Profile <ArrowUpRight className="w-4 h-4" />
                        </button>
                      ) : undefined}
                    />
                  ))}
                </div>

                {/* Center match badge (desktop) */}
                <div className="hidden sm:block absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10" aria-hidden="true">
                  <MatchScoreBadge score={score} size={84} />
                </div>
              </div>

              {/* Mobile match badge */}
              <div className="sm:hidden flex justify-center -mt-1 pb-2">
                <MatchScoreBadge score={score} size={72} />
              </div>

              {/* Single proposal action */}
              {(() => {
                const bothUser = maleType === 'user' && femaleType === 'user';
                const label = bothUser ? 'Send Proposal' : 'Make Proposal';
                const recipient = maleType === 'user' ? maleProfile : femaleProfile;
                const canPropose = !!maleProfile?._id && !!femaleProfile?._id;
                return (
                  <div className="px-5 pb-5 flex gap-3">
                    <button
                      onClick={() => setInsightsMatchId(m._id)}
                      className="h-12 px-4 rounded-xl border border-violet-200 text-violet-700 bg-violet-50
                                 font-bold flex items-center justify-center gap-2 hover:bg-violet-100
                                 active:scale-[0.99] transition-all shrink-0">
                      <Sparkles className="w-4 h-4" /> <span className="hidden sm:inline">AI Insights</span>
                    </button>
                    <button
                      disabled={!canPropose}
                      onClick={() => setProposalModal({
                        mode: bothUser ? 'user' : 'staff',
                        name: recipient?.name ?? maleProfile?.name,
                        id: recipient?._id ?? maleProfile?._id,
                        initiatorId: maleProfile?._id,
                        recipientId: femaleProfile?._id,
                        matchId: m._id,
                      })}
                      className="flex-1 h-12 rounded-xl bg-linear-to-r from-primary to-primary text-white
                                 font-bold flex items-center justify-center gap-2 shadow-md
                                 hover:shadow-lg hover:brightness-105 active:scale-[0.99] transition-all
                                 disabled:opacity-50 disabled:hover:shadow-md">
                      <Send className="w-4 h-4" /> {label}
                    </button>
                  </div>
                );
              })()}

              {/* Score breakdown toggle */}
              {m.scoreBreakdown && (
                <div className="border-t border-gray-100">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : m._id)}
                    className="w-full px-5 py-3 text-left text-sm text-primary font-bold
                               hover:bg-emerald-50/50 flex items-center gap-2 transition-colors">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    Compatibility Breakdown — 100-point scoring
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5">
                      <ScoreBreakdownPanel scoreBreakdown={m.scoreBreakdown} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Shared proposal modal (Staff → User / Staff → Staff) */}
      <ProposalModal
        open={proposalModal !== null}
        mode={proposalModal?.mode ?? 'user'}
        recipientName={proposalModal?.name}
        recipientId={proposalModal?.id}
        staffOptions={staffOptions}
        onClose={() => setProposalModal(null)}
        onSubmit={submitProposal}
      />

      {/* Staff AI Insights (v0 template) */}
      <InsightsModal
        open={insightsMatchId !== null}
        matchId={insightsMatchId}
        onClose={() => setInsightsMatchId(null)}
      />
    </div>
  );
}
