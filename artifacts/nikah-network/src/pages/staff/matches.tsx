import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import {
  Heart, RefreshCw, Sparkles, ChevronDown, ChevronRight,
  Send, Loader2, Users,
} from 'lucide-react';
import ScoreBreakdownPanel from '../../components/ScoreBreakdownUI';
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
    : <span className="px-3 py-1 text-xs font-bold rounded-full bg-primary/10 text-primary">Staff ↔ User</span>;
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

  // Pair-type predicates — power the filter-tab counts
  const isStaffStaff = (m: MatchRecord) => m.leftProfileType === 'staff' && m.rightProfileType === 'staff';
  const isStaffUser  = (m: MatchRecord) => (m.leftProfileType === 'staff') !== (m.rightProfileType === 'staff');
  const typeCounts = {
    all:            matches.length,
    'staff-staff':  matches.filter(isStaffStaff).length,
    'staff-user':   matches.filter(isStaffUser).length,
  } as const;

  if (loading) return (
    <div className="flex justify-center items-center min-h-64">
      <div className="text-center">
        <Loader2 className="w-9 h-9 animate-spin text-primary mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Loading staff matches…</p>
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
          <p className="text-sm text-muted-foreground">Manage and review proposed matches</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-muted-foreground mr-1">{matches.length} Matches</span>
          <button onClick={load}
            className="flex items-center gap-2 h-11 px-4 rounded-xl border border-border bg-card
                       text-sm font-bold text-foreground hover:bg-muted transition-colors">
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

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="p-4 bg-primary/10 border border-emerald-100 rounded-xl text-primary text-sm font-semibold">{success}</div>
      )}

      {/* Type filter tabs */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide mr-1">Type</span>
        {([
          { key: 'all',         label: 'All' },
          { key: 'staff-staff', label: 'Staff ↔ Staff' },
          { key: 'staff-user',  label: 'Staff ↔ User' },
        ] as const).map(({ key, label }) => {
          const active = typeFilter === key;
          return (
            <button key={key} onClick={() => setTypeFilter(key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                active
                  ? 'bg-primary text-white'
                  : 'bg-card text-muted-foreground border border-border hover:bg-primary/10 hover:text-primary'
              }`}>
              {label}
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                active ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {typeCounts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && !error && (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border">
          <Heart className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-semibold mb-1">
            {matches.length === 0 ? 'No staff matches yet' : 'No matches for selected filter'}
          </p>
          {matches.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Click "Generate Matches" to build matches for all staff-created profiles.
            </p>
          )}
        </div>
      )}

      {/* Match cards */}
      <div className="max-w-2xl mx-auto space-y-4">
        {filtered.map(m => {
          const score      = m.scoreBreakdown?.total ?? m.score;
          const isExpanded = expandedId === m._id;

          // Always display male (groom) on left, female (bride) on right
          const maleProfile   = m.user?.gender === 'male' ? m.user      : m.candidate;
          const femaleProfile = m.user?.gender === 'male' ? m.candidate : m.user;
          const maleType      = m.user?.gender === 'male' ? (m.leftProfileType  ?? 'user') : (m.rightProfileType ?? 'user');
          const femaleType    = m.user?.gender === 'male' ? (m.rightProfileType ?? 'user') : (m.leftProfileType  ?? 'user');
          const bothStaff     = maleType === 'staff' && femaleType === 'staff';

          return (
            <div key={m._id}
              className="bg-card border border-border rounded-2xl shadow-sm
                         hover:shadow-md transition-shadow p-5">

              {/* Paired portraits with overlapping center match badge */}
              <div className="relative">
                <div className="flex items-stretch justify-center gap-2 sm:gap-6">
                  {([
                    { p: maleProfile,   id: maleProfile?._id,   type: maleType   as ProfileType },
                    { p: femaleProfile, id: femaleProfile?._id, type: femaleType as ProfileType },
                  ]).map((side, i) => {
                    const clickable = !!side.id;
                    return (
                      <div key={i}
                        role={clickable ? 'button' : undefined}
                        tabIndex={clickable ? 0 : undefined}
                        onClick={clickable ? () => setLocation(`/staff/profiles/${side.id}`) : undefined}
                        onKeyDown={clickable ? (e => e.key === 'Enter' && setLocation(`/staff/profiles/${side.id}`)) : undefined}
                        className={`group relative w-full max-w-[200px] aspect-[4/5] rounded-2xl overflow-hidden
                                    bg-muted ${clickable ? 'cursor-pointer' : ''}`}
                        aria-label={`${side.p?.name || 'Unknown'}${side.p?.age ? `, ${side.p.age}` : ''}`}>
                        {side.p?.photo ? (
                          <img src={side.p.photo} alt={`Profile photo of ${side.p?.name || 'Unknown'}`}
                            crossOrigin={side.p.photo.includes('cloudinary.com') ? 'anonymous' : undefined}
                            className="absolute inset-0 w-full h-full object-cover object-[50%_30%]
                                       motion-safe:transition-transform motion-safe:duration-700 group-hover:scale-105" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Users className="w-12 h-12 text-muted-foreground/40" />
                          </div>
                        )}
                        {/* Bottom scrim */}
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/75 via-black/25 to-transparent" aria-hidden="true" />
                        {/* Name overlay */}
                        <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                          <h4 className="text-base font-bold leading-tight drop-shadow-md truncate">
                            {side.p?.name || 'Unknown'}{side.p?.age ? <span className="text-sm font-semibold">, {side.p.age}</span> : null}
                          </h4>
                          {sideLines(side.p).slice(0, 1).map((line, j) => (
                            <p key={j} className="text-xs text-white/90 leading-snug truncate drop-shadow">{line}</p>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Center match badge — overlaps both portraits (desktop) */}
                <div className="hidden sm:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10" aria-hidden="true">
                  <div className="rounded-full bg-card p-1 shadow-md">
                    <MatchScoreBadge score={score} size={68} />
                  </div>
                </div>
              </div>

              {/* Mobile match badge */}
              <div className="sm:hidden flex justify-center -mt-1 pb-2">
                <MatchScoreBadge score={score} size={64} />
              </div>

              {/* Actions */}
              {(() => {
                const bothUser = maleType === 'user' && femaleType === 'user';
                const label = bothUser ? 'Send Proposal' : 'Make Proposal';
                const recipient = maleType === 'user' ? maleProfile : femaleProfile;
                const canPropose = !!maleProfile?._id && !!femaleProfile?._id;
                return (
                  <div className="mt-4 flex flex-col items-center gap-3">
                    {/* Primary action — narrower than the portrait row */}
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
                      className="w-full max-w-60 h-10 rounded-full bg-primary text-white text-sm
                                 font-bold flex items-center justify-center gap-2 shadow-sm
                                 hover:brightness-105 active:scale-[0.99] transition-all
                                 disabled:opacity-50">
                      <Send className="w-4 h-4" /> {label}
                    </button>

                    {/* Meta row — AI insights · pair type · breakdown */}
                    <div className="flex items-center justify-center gap-1.5 flex-wrap text-sm">
                      <button
                        onClick={() => setInsightsMatchId(m._id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                                   text-violet-600 font-semibold hover:bg-violet-50 transition-colors">
                        <Sparkles className="w-3.5 h-3.5" /> AI Insights
                      </button>
                      {pairBadge(bothStaff)}
                      {m.scoreBreakdown && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : m._id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                                     text-primary font-semibold hover:bg-primary/5 transition-colors">
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          Compatibility · 100 pts
                        </button>
                      )}
                    </div>

                    {m.scoreBreakdown && isExpanded && (
                      <div className="w-full max-w-md">
                        <ScoreBreakdownPanel scoreBreakdown={m.scoreBreakdown} />
                      </div>
                    )}
                  </div>
                );
              })()}
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
