import { SearchX, AlertCircle, Loader2, RefreshCw, Sliders } from 'lucide-react';

export function MatchesLoading() {
  return (
    <div className="flex items-center justify-center min-h-80" role="status" aria-live="polite">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#10B981] mx-auto mb-4" />
        <p className="text-[#1C1917] font-bold">Finding your matches…</p>
        <p className="text-gray-400 text-sm mt-1">Applying compatibility criteria from your profile</p>
      </div>
    </div>
  );
}

export function MatchesError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-red-100 shadow-sm" role="alert">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-bold text-[#1C1917] mb-1">Something went wrong</h3>
      <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">{message}</p>
      <button onClick={onRetry}
        className="inline-flex items-center gap-2 h-11 px-6 bg-[#10B981] text-white rounded-xl hover:bg-[#059669] font-bold text-sm">
        <RefreshCw className="w-4 h-4" /> Try Again
      </button>
    </div>
  );
}

export function MatchesEmpty({
  hasMatches, onAdjust, onGenerate,
}: { hasMatches: boolean; onAdjust: () => void; onGenerate: () => void }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
      <div className="w-16 h-16 bg-[#F4F6F5] rounded-2xl flex items-center justify-center mx-auto mb-4">
        <SearchX className="w-8 h-8 text-gray-300" />
      </div>
      <h3 className="text-lg font-bold text-[#1C1917] mb-1">
        {hasMatches ? 'No matches for these filters' : 'No matches found yet'}
      </h3>
      <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
        {hasMatches
          ? 'Try widening your filters to see more compatible profiles.'
          : 'Complete your profile and await staff approval to start seeing matches.'}
      </p>
      {hasMatches ? (
        <button onClick={onAdjust}
          className="inline-flex items-center gap-2 h-11 px-6 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-bold text-sm">
          <Sliders className="w-4 h-4" /> Adjust Filters
        </button>
      ) : (
        <button onClick={onGenerate}
          className="inline-flex items-center gap-2 h-11 px-6 bg-[#10B981] text-white rounded-xl hover:bg-[#059669] font-bold text-sm">
          <RefreshCw className="w-4 h-4" /> Generate Matches
        </button>
      )}
    </div>
  );
}
