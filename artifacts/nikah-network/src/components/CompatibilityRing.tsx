/**
 * Circular compatibility donut — matches the reference "92% High Compatibility" ring.
 * Pure SVG, green system. Color shifts by score band (functional, not new brand colors).
 */
export default function CompatibilityRing({
  score, size = 96, stroke = 9, showLabel = true,
}: {
  score: number;
  size?: number;
  stroke?: number;
  showLabel?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, score));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  const color =
    pct >= 75 ? '#10B981'
    : pct >= 60 ? '#D97706'
    : pct >= 40 ? '#CA8A04'
    : '#EF4444';
  const label =
    pct >= 75 ? 'High Compatibility'
    : pct >= 60 ? 'Good Match'
    : pct >= 40 ? 'Fair Match'
    : 'Low Match';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF2F1" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 600ms ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-black text-[#1C1917]" style={{ fontSize: size * 0.26 }}>{pct}%</span>
        </div>
      </div>
      {showLabel && (
        <span className="text-xs font-bold" style={{ color }}>{label}</span>
      )}
    </div>
  );
}
