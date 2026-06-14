import { Send, ArrowUpRight } from 'lucide-react';
import { MatchItem } from './types';
import ProfileImageCard from './ProfileImageCard';

export default function ProfileGridView({
  matches, onOpen, onSendProposal,
}: {
  matches: MatchItem[];
  onOpen: (id: string) => void;
  onSendProposal: (id: string) => void;
}) {
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {matches.map(m => {
        const c = m.candidate;
        const score = m.scoreBreakdown?.total ?? m.score;
        const lines = [
          c?.education, c?.profession, c?.city, c?.caste, c?.height && `${c.height} ft`,
        ].filter(Boolean) as string[];

        return (
          <ProfileImageCard key={m._id || m.candidateId}
            photo={c?.photo} name={c?.name || 'Profile'} age={c?.age} lines={lines} score={score}
            heightClass="aspect-3/4" onClick={() => onOpen(m.candidateId)}
            footer={
              <div className="flex gap-2">
                <button onClick={() => onSendProposal(m.candidateId)}
                  className="flex-1 h-11 rounded-xl bg-linear-to-r from-[#10B981] to-[#059669] text-white
                             text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm
                             hover:shadow-md hover:brightness-105 active:scale-[0.99] transition-all">
                  <Send className="w-4 h-4" /> Proposal
                </button>
                <button onClick={() => onOpen(m.candidateId)}
                  className="h-11 px-4 rounded-xl border border-[#E8DED3] text-[#1C1917] text-sm font-bold
                             flex items-center justify-center gap-1.5 hover:bg-[#FDF8F3] hover:border-[#10B981] transition-colors">
                  View <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            }
          />
        );
      })}
    </div>
  );
}
