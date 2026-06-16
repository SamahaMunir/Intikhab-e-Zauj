import { useEffect, useState } from 'react';

export interface ProposalTimer {
  expired: boolean;
  remainingMs: number;
  /** Human label like "12h 04m" or "Expired". */
  label: string;
}

function fmt(ms: number): string {
  if (ms <= 0) return 'Expired';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 24) { const d = Math.floor(h / 24); return `${d}d ${h % 24}h`; }
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

/** Live countdown to a proposal's chat closesAt (or any ISO deadline). */
export function useProposalTimer(closesAt?: string): ProposalTimer {
  const target = closesAt ? new Date(closesAt).getTime() : 0;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);

  const remainingMs = target ? Math.max(0, target - now) : 0;
  return {
    expired: target ? remainingMs <= 0 : false,
    remainingMs,
    label: target ? fmt(remainingMs) : '—',
  };
}
