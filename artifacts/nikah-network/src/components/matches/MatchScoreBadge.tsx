/**
 * Premium gradient match badge — green filled circle with progress arc,
 * "NN%" + a "Match" pill. Matches the reference hero design.
 */
export default function MatchScoreBadge({ score, size = 76 }: { score: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Soft glow */}
      <div className="absolute -inset-1 rounded-full bg-emerald-300/40 blur-md" aria-hidden="true" />

      {/* Gradient disc */}
      <div className="absolute inset-0 rounded-full bg-linear-to-b from-emerald-400 to-emerald-600
                      shadow-lg ring-2 ring-white/50 flex flex-col items-center justify-center">
        <span className="text-white font-black leading-none" style={{ fontSize: size * 0.24 }}>{pct}%</span>
        <span className="mt-1 px-2 py-0.5 rounded-full bg-white/95 text-[#059669] font-bold leading-none"
              style={{ fontSize: size * 0.12 }}>Match</span>
      </div>

      {/* Progress arc */}
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.9)"
          strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 600ms ease' }} />
      </svg>
    </div>
  );
}
