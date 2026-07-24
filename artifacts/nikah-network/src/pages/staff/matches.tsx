import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import {
  Heart, RefreshCw, Sparkles, ChevronDown, ChevronRight,
  Send, Loader2, Users, Search, ArrowLeft,
} from 'lucide-react';
import ScoreBreakdownPanel from '../../components/ScoreBreakdownUI';
import MatchScoreBadge from '../../components/matches/MatchScoreBadge';
import ProfileImageCard from '../../components/matches/ProfileImageCard';
import ProposalModal, { ProposalMode, ProposalPayload } from '../../components/matches/ProposalModal';
import InsightsModal from '../../components/matches/InsightsModal';
import proposalService from '../../services/proposalService';
import { getToken } from '@/lib/auth';
import { useStore } from '@/lib/store';

type ProfileType = 'user' | 'staff';

interface Profile {
  _id: string;
  name: string;
  gender: string;
  city?: string;
  education?: string;
  profession?: string;
  caste?: string;
  age?: number;
  profileStatus: 'pending' | 'approved' | 'rejected';
  photo?: string;
}

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

// Map a browsed profile onto the match-card's "user" side.
const asSide = (p: Profile): ProfileSide => ({
  _id: p._id, name: p.name, age: p.age, city: p.city, gender: p.gender,
  caste: p.caste, profession: p.profession, education: p.education, photo: p.photo,
});

// Info lines (reference layout): profession, then "City | Education"
const sideLines = (p?: ProfileSide | Profile) => {
  const second = [p?.city, p?.education].filter(Boolean).join('  |  ');
  return [p?.profession, second].filter(Boolean) as string[];
};

export default function StaffMatches() {
  const [, setLocation] = useLocation();

  // Browse state
  const [profiles,        setProfiles]        = useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [browseSearch,    setBrowseSearch]    = useState('');
  const [genderView,      setGenderView]      = useState<'male' | 'female'>('male');
  const [selected,        setSelected]        = useState<Profile | null>(null);

  // Match state (for the selected profile)
  const [matches,       setMatches]       = useState<MatchRecord[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [generating,    setGenerating]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [expandedId,    setExpandedId]    = useState<string | null>(null);

  const [proposalModal, setProposalModal] = useState<
    { mode: ProposalMode; name?: string; id?: string; initiatorId?: string; recipientId?: string; matchId?: string } | null
  >(null);
  const [insightsMatchId, setInsightsMatchId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const users = useStore(s => s.users);
  const staffOptions = useMemo(
    () => users.filter(u => u.role === 'staff' || u.role === 'admin').map(u => ({ id: u.id, name: u.name })),
    [users]);

  const token = getToken('staff');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // ── Data loaders ──────────────────────────────────────────────────────────
  const fetchProfiles = async () => {
    try {
      setProfilesLoading(true);
      const r = await fetch(`${API}/api/staff/profiles`, { headers });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Failed to load profiles');
      setProfiles(d.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading profiles');
    } finally {
      setProfilesLoading(false);
    }
  };

  const openMatches = async (p: Profile) => {
    setSelected(p);
    setMatches([]);
    setExpandedId(null);
    try {
      setMatchesLoading(true);
      setError(null);
      const r = await fetch(`${API}/api/matches?userId=${p._id}`, { headers });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to load matches');
      const side = asSide(p);
      setMatches((d.matches || []).map((m: MatchRecord) => ({ ...m, user: side })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading matches');
    } finally {
      setMatchesLoading(false);
    }
  };

  // (Re)generate matches for the selected profile only.
  const regenerate = async () => {
    if (!selected) return;
    try {
      setGenerating(true);
      setError(null);
      const r = await fetch(`${API}/api/matches/generate/${selected._id}`, {
        method: 'POST', headers,
        body: JSON.stringify({ genderHint: selected.gender }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || d.error || 'Generation failed');
      await openMatches(selected);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation error');
    } finally {
      setGenerating(false);
    }
  };

  const backToBrowse = () => {
    setSelected(null);
    setMatches([]);
    setError(null);
    setExpandedId(null);
  };

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

  useEffect(() => { fetchProfiles(); }, []);

  // ── Browse filtering ────────────────────────────────────────────────────
  const approved = profiles.filter(p => p.profileStatus === 'approved');
  const q = browseSearch.trim().toLowerCase();
  const matchesQuery = (p: Profile) =>
    !q || [p.name, p.city, p.profession].some(v => v?.toLowerCase().includes(q));
  const grooms = approved.filter(p => p.gender === 'male' && matchesQuery(p));
  const brides = approved.filter(p => p.gender === 'female' && matchesQuery(p));

  const banner = (
    <>
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">{error}</div>
      )}
      {success && (
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary text-sm font-semibold">{success}</div>
      )}
    </>
  );

  // ══ RESULTS VIEW — matches for one selected profile ══════════════════════
  if (selected) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <button onClick={backToBrowse}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground
                     hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> All profiles
        </button>

        {/* Selected profile — pinned */}
        <div className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card shadow-sm">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-muted shrink-0">
            {selected.photo
              ? <img src={selected.photo} alt={selected.name} className="w-full h-full object-cover object-[50%_30%]" />
              : <div className="w-full h-full flex items-center justify-center"><Users className="w-6 h-6 text-muted-foreground/40" /></div>}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-foreground truncate">
              {selected.name}{selected.age ? <span className="font-semibold text-muted-foreground">, {selected.age}</span> : null}
            </h1>
            <p className="text-sm text-muted-foreground truncate">{sideLines(selected).join('  ·  ') || '—'}</p>
          </div>
          <button onClick={regenerate} disabled={generating}
            className="flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-card
                       text-sm font-bold text-foreground hover:bg-muted transition-colors disabled:opacity-50 shrink-0">
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating…' : 'Regenerate'}
          </button>
        </div>

        {banner}

        {matchesLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Loading matches…</p>
            </div>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border">
            <Heart className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-semibold mb-1">No matches yet for {selected.name.split(' ')[0]}</p>
            <p className="text-muted-foreground text-sm">Click "Regenerate" to build fresh match suggestions.</p>
          </div>
        ) : (
          <>
            <p className="text-sm font-bold text-muted-foreground">
              {matches.length} {matches.length === 1 ? 'match' : 'matches'}
            </p>
            <div className="space-y-4">
              {matches.map(m => {
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
                          { p: maleProfile,   id: maleProfile?._id },
                          { p: femaleProfile, id: femaleProfile?._id },
                        ]).map((side, i) => {
                          const clickable = !!side.id;
                          return (
                            <div key={i}
                              role={clickable ? 'button' : undefined}
                              tabIndex={clickable ? 0 : undefined}
                              onClick={clickable ? () => setLocation(`/staff/profiles/${side.id}`) : undefined}
                              onKeyDown={clickable ? (e => e.key === 'Enter' && setLocation(`/staff/profiles/${side.id}`)) : undefined}
                              className={`group relative w-full max-w-50 aspect-4/5 rounded-2xl overflow-hidden
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
          </>
        )}

        {/* Shared proposal modal */}
        <ProposalModal
          open={proposalModal !== null}
          mode={proposalModal?.mode ?? 'user'}
          recipientName={proposalModal?.name}
          recipientId={proposalModal?.id}
          staffOptions={staffOptions}
          onClose={() => setProposalModal(null)}
          onSubmit={submitProposal}
        />
        <InsightsModal
          open={insightsMatchId !== null}
          matchId={insightsMatchId}
          onClose={() => setInsightsMatchId(null)}
        />
      </div>
    );
  }

  // ══ BROWSE VIEW — pick a profile ═════════════════════════════════════════
  const shown = genderView === 'male' ? grooms : brides;
  const section = (list: Profile[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {list.map(p => (
        <ProfileImageCard key={p._id}
          photo={p.photo} name={p.name} age={p.age}
          lines={sideLines(p)} heightClass="aspect-4/5"
          onClick={() => openMatches(p)}
          footer={
            <button onClick={() => openMatches(p)}
              className="w-full h-10 rounded-xl bg-primary text-white text-sm font-bold
                         flex items-center justify-center gap-2 hover:brightness-105
                         active:scale-[0.99] transition-all">
              <Heart className="w-4 h-4" /> Show Matches
            </button>
          }
        />
      ))}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Matches</h1>
          <p className="text-sm text-muted-foreground">Pick a profile to see their match suggestions</p>
        </div>
        <button onClick={fetchProfiles}
          className="flex items-center gap-2 h-11 px-4 rounded-xl border border-border bg-card
                     text-sm font-bold text-foreground hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Search + Grooms/Brides toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={browseSearch}
            onChange={e => setBrowseSearch(e.target.value)}
            placeholder="Search by name, city, or profession…"
            className="w-full h-12 pl-11 pr-4 rounded-xl bg-muted border border-border text-sm text-foreground
                       placeholder-muted-foreground focus:outline-none focus:border-primary focus:bg-background transition-colors" />
        </div>
        <div className="flex p-1 gap-1 rounded-xl bg-muted border border-border shrink-0">
          {([
            { key: 'male'   as const, label: 'Grooms', count: grooms.length },
            { key: 'female' as const, label: 'Brides', count: brides.length },
          ]).map(({ key, label, count }) => {
            const active = genderView === key;
            return (
              <button key={key} onClick={() => setGenderView(key)}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg
                            text-sm font-bold transition-all duration-150 active:scale-[0.97] ${
                  active
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                }`}>
                {label}
                <span className={`min-w-5 text-center text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-white/25 text-white' : 'bg-background text-muted-foreground'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {banner}

      {profilesLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Loading profiles…</p>
          </div>
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-semibold">
            {q
              ? `No ${genderView === 'male' ? 'grooms' : 'brides'} match your search`
              : `No approved ${genderView === 'male' ? 'grooms' : 'brides'} yet`}
          </p>
        </div>
      ) : (
        section(shown)
      )}
    </div>
  );
}
