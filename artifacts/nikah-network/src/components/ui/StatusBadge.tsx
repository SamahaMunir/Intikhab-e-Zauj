type BadgeStatus =
  | 'pending'
  | 'accepted'
  | 'approved'
  | 'rejected'
  | 'proposed'
  | 'active'
  | 'inactive'
  | 'suggested'
  | string;

interface StatusBadgeProps {
  status: BadgeStatus;
  className?: string;
}

const BADGE_STYLES: Record<string, string> = {
  pending:   'bg-[#3B82F6] text-white',
  accepted:  'bg-[#10B981] text-white',
  approved:  'bg-[#10B981] text-white',
  active:    'bg-[#10B981] text-white',
  rejected:  'bg-[#EF4444] text-white',
  proposed:  'bg-[#D97706] text-white',
  inactive:  'bg-[#9CA3AF] text-white',
  suggested: 'bg-[#3B82F6] text-white',
};

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const key = (status || 'pending').toLowerCase();
  const style = BADGE_STYLES[key] ?? 'bg-[#9CA3AF] text-white';
  return (
    <span
      className={`inline-flex items-center justify-center h-10 px-4 rounded-md
                  text-base font-bold uppercase tracking-wide select-none
                  ${style} ${className}`}
    >
      {status}
    </span>
  );
}
