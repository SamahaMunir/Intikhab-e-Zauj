import { useEffect, useState } from 'react';
import { Send, ArrowUpRight } from 'lucide-react';
import { MatchItem } from './types';
import ProfileImageCard from './ProfileImageCard';

export default function ProfileCard({
  match, onDetails, onSendProposal,
}: {
  match: MatchItem;
  onDetails: () => void;
  onSendProposal: () => void;
}) {
  const c = match.candidate;
  const score = match.scoreBreakdown?.total ?? match.score;
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, [match.candidateId]);

  const lines = [
    c?.education, c?.profession, c?.city, c?.caste, c?.height && `${c.height} ft`,
  ].filter(Boolean) as string[];

  return (
    <ProfileImageCard
      photo={c?.photo} name={c?.name || 'Profile'} age={c?.age} lines={lines} score={score}
      heightClass="aspect-4/5"
      className={`motion-safe:transition-all motion-safe:duration-500 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      footer={
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={onSendProposal}
            className="flex-1 h-13 rounded-2xl bg-linear-to-r from-[#10B981] to-[#059669] text-white
                       font-bold flex items-center justify-center gap-2 shadow-md
                       hover:shadow-lg hover:brightness-105 active:scale-[0.99] transition-all duration-200">
            <Send className="w-4 h-4" /> Send Proposal
          </button>
          <button onClick={onDetails}
            className="h-13 px-6 rounded-2xl border border-[#E8DED3] text-[#1C1917] font-bold
                       flex items-center justify-center gap-2 hover:bg-[#FDF8F3] hover:border-[#10B981]
                       transition-colors duration-200">
            View Profile <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      }
    />
  );
}
