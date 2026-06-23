import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import {
  Sliders, LayoutGrid, Layers, ChevronLeft, ChevronRight,
  Lock, ArrowRight, RefreshCw,
} from 'lucide-react';
import {
  MatchItem, MatchFilters, DEFAULT_FILTERS, applyFilters, activeFilterCount,
} from '../../components/matches/types';
import ProfileCard from '../../components/matches/ProfileCard';
import ProfileGridView from '../../components/matches/ProfileGridView';
import FilterPanel from '../../components/matches/FilterPanel';
import ProposalModal, { ProposalPayload, MatchSummary } from '../../components/matches/ProposalModal';
import { QNA_CATEGORIES } from '../../lib/qnaQuestions';
import { getUserId, getStoredUser, refreshCurrentUser } from '../../lib/currentUser';
import proposalService from '../../services/proposalService';
import { useMatches } from '../../hooks/useMatches';
import { MatchesLoading, MatchesError, MatchesEmpty } from '../../components/matches/EmptyStates';

type View = 'card' | 'grid';

const Matches: React.FC = () => {
  const [, setLocation] = useLocation();

  const [view, setView] = useState<View>('card');
  const [filters, setFilters] = useState<MatchFilters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [proposalTarget, setProposalTarget] = useState<
    { id: string; name?: string; matchId?: string; summary?: MatchSummary } | null
  >(null);

  // Refresh stale cached user (profileCompletion changes after staff approval).
  const [userVersion, setUserVersion] = useState(0);
  useEffect(() => { refreshCurrentUser().then(() => setUserVersion(v => v + 1)); }, []);

  const user = useMemo(() => getStoredUser(), [userVersion]);
  const userId = getUserId();
  const profileCompletion = user?.profileCompletion ?? 0;
  const profileComplete = profileCompletion >= 100;

  // Single source for match data — backend matching engine via API.
  const { matches, isLoading, isGenerating, error, generate } = useMatches(userId, profileComplete);
  const generateMatches = generate;

  // Filter + sort (highest compatibility first)
  const visible = useMemo(() => {
    const f = applyFilters(matches, filters);
    const sc = (m: MatchItem) => m.scoreBreakdown?.total ?? m.score;
    return [...f].sort((a, b) => sc(b) - sc(a));
  }, [matches, filters]);

  // Keep card index in range when list changes
  useEffect(() => { setCardIndex(i => (visible.length ? Math.min(i, visible.length - 1) : 0)); }, [visible.length]);

  // Unique filter option lists
  const cities = useMemo(
    () => [...new Set(matches.map(m => m.candidate?.city).filter(Boolean) as string[])].sort(),
    [matches]);
  const educations = useMemo(
    () => [...new Set(matches.map(m => m.candidate?.education).filter(Boolean) as string[])].sort(),
    [matches]);

  const openDetails = (id: string) => setLocation(`/app/match-detail/${id}`);
  const sendProposal = (id: string) => {
    const m = matches.find(x => x.candidateId === id);
    const c = m?.candidate;
    setProposalTarget({
      id,
      name: c?.name,
      matchId: m?._id,
      summary: { name: c?.name, age: c?.age, city: c?.city, profession: c?.profession, photo: c?.photo },
    });
  };
  const submitProposal = async (payload: ProposalPayload) => {
    if (payload.type !== 'USER_PROPOSAL' || !userId || !proposalTarget?.id) return;
    await proposalService.create({
      type: 'USER_PROPOSAL',
      initiatorId: userId,
      recipientId: proposalTarget.id,
      matchId: proposalTarget.matchId,
      message: payload.message,
      matchNotes: payload.matchNotes,
      compatibilityReason: payload.compatibilityReason,
      questionResponses: payload.questionResponses,
    });
  };
  const filterCount = activeFilterCount(filters);

  // ── Gate ──
  if (!profileComplete) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-[#D97706]" />
          </div>
          <h2 className="text-xl font-bold text-[#1C1917] mb-2">Matchmaking Locked</h2>
          <p className="text-gray-500 text-sm mb-5">Complete your profile to unlock matchmaking and view potential matches.</p>
          <div className="bg-[#F4F6F5] rounded-xl p-4 mb-5">
            <div className="flex justify-between text-sm text-gray-600 mb-1.5">
              <span className="font-medium">Profile completion</span>
              <span className="font-bold text-[#1C1917]">{profileCompletion}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#10B981] rounded-full transition-all" style={{ width: `${profileCompletion}%` }} />
            </div>
          </div>
          <a href="/profile-wizard"
            className="flex items-center justify-center gap-2 w-full h-12 bg-[#10B981] text-white rounded-xl font-bold hover:bg-[#059669] transition-colors">
            Complete My Profile <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  const current = visible[cardIndex];

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1C1917]">Matches for You</h1>
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-[#1C1917]">{visible.length}</span> compatible profile{visible.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={() => setFilterOpen(true)}
            className="relative flex items-center gap-2 h-10 px-4 rounded-xl border border-gray-200 bg-white
                       text-sm font-bold text-[#1C1917] hover:bg-gray-50 transition-colors">
            <Sliders className="w-4 h-4" /> Filters
            {filterCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#10B981] text-white text-[11px] font-bold flex items-center justify-center">
                {filterCount}
              </span>
            )}
          </button>
        </div>

        {/* View toggle */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
          {([
            { v: 'card', icon: Layers, label: 'Card view' },
            { v: 'grid', icon: LayoutGrid, label: 'Grid view' },
          ] as const).map(({ v, icon: Icon, label }) => (
            <button key={v} onClick={() => setView(v)} aria-label={label} aria-pressed={view === v}
              className={`p-2.5 transition-colors ${view === v ? 'bg-[#10B981] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              <Icon className="w-5 h-5" />
            </button>
          ))}
        </div>
      </div>

      {/* Active filter chips */}
      {filterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {[...filters.cities, ...filters.educations].map(tag => (
            <span key={tag} className="px-3 py-1 rounded-full bg-emerald-50 text-[#10B981] text-xs font-bold">{tag}</span>
          ))}
          {filters.scoreMin > 0 && <span className="px-3 py-1 rounded-full bg-emerald-50 text-[#10B981] text-xs font-bold">Score {filters.scoreMin}+</span>}
          {(filters.ageMin !== DEFAULT_FILTERS.ageMin || filters.ageMax !== DEFAULT_FILTERS.ageMax) &&
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-[#10B981] text-xs font-bold">Age {filters.ageMin}–{filters.ageMax}</span>}
          <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-xs font-bold text-gray-500 hover:text-[#10B981] underline">Clear all</button>
        </div>
      )}

      {/* States */}
      {isLoading || isGenerating ? (
        <MatchesLoading />
      ) : error ? (
        <MatchesError message={error} onRetry={generateMatches} />
      ) : visible.length === 0 ? (
        <MatchesEmpty hasMatches={matches.length > 0}
          onAdjust={() => setFilterOpen(true)} onGenerate={generateMatches} />
      ) : view === 'grid' ? (
        <ProfileGridView matches={visible} onOpen={openDetails} onSendProposal={sendProposal} />
      ) : (
        /* Card stack */
        <div className="max-w-xl mx-auto">
          {current && (
            <ProfileCard
              key={current.candidateId}
              match={current}
              onDetails={() => openDetails(current.candidateId)}
              onSendProposal={() => sendProposal(current.candidateId)}
            />
          )}

          {/* Pill navigation */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button onClick={() => setCardIndex(i => (i - 1 + visible.length) % visible.length)}
              disabled={visible.length <= 1} aria-label="Previous profile"
              className="w-12 h-12 rounded-full border border-[#E8DED3] bg-white text-[#1C1917]
                         flex items-center justify-center shadow-sm hover:bg-[#FDF8F3] hover:border-[#10B981]
                         hover:text-[#10B981] transition-colors disabled:opacity-40 disabled:hover:bg-white">
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="px-5 h-12 rounded-full bg-white border border-[#E8DED3] shadow-sm flex items-center
                            text-sm font-bold text-gray-500">
              {cardIndex + 1} <span className="text-gray-300 mx-1.5">/</span> {visible.length}
            </div>

            <button onClick={() => setCardIndex(i => (i + 1) % visible.length)}
              disabled={visible.length <= 1} aria-label="Next profile"
              className="w-12 h-12 rounded-full bg-linear-to-r from-[#10B981] to-[#059669] text-white
                         flex items-center justify-center shadow-md hover:shadow-lg hover:brightness-105
                         active:scale-95 transition-all disabled:opacity-40">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Regenerate */}
          <div className="flex justify-center mt-5">
            <button onClick={generateMatches} disabled={isGenerating}
              className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-[#10B981] transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh matches
            </button>
          </div>
        </div>
      )}

      {/* Filter panel */}
      <FilterPanel open={filterOpen} filters={filters} cities={cities} educations={educations}
        onClose={() => setFilterOpen(false)} onApply={setFilters} />

      {/* Send-proposal modal */}
      <ProposalModal
        open={proposalTarget !== null}
        mode="user"
        recipientName={proposalTarget?.name}
        recipientId={proposalTarget?.id}
        qnaCategories={QNA_CATEGORIES}
        matchSummary={proposalTarget?.summary}
        currentUserId={userId}
        onClose={() => setProposalTarget(null)}
        onSubmit={submitProposal}
      />
    </div>
  );
};

export default Matches;
