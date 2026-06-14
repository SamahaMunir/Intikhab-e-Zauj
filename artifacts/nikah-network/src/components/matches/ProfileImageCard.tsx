import { User as UserIcon } from 'lucide-react';
import CompatibilityRing from '../CompatibilityRing';

/**
 * Shared profile card used across the whole app (user matches + staff profiles).
 * Full photo, optional top-right compatibility ring, transparent text overlay at
 * the bottom (gradient scrim only — never a box over the face), optional footer.
 */
export default function ProfileImageCard({
  photo, name, age, lines, score, heightClass = 'h-[440px] sm:h-[520px]',
  onClick, footer, className = '', topRight,
}: {
  photo?: string;
  name: string;
  age?: number;
  lines: string[];
  score?: number;
  heightClass?: string;
  onClick?: () => void;
  footer?: React.ReactNode;
  className?: string;
  topRight?: React.ReactNode;
}) {
  const interactive = !!onClick;
  return (
    <article className={`bg-white rounded-3xl overflow-hidden border border-[#E8DED3]
                         shadow-[0_8px_32px_rgba(16,185,129,0.10)] flex flex-col ${className}`}>
      <div
        className={`group relative ${heightClass} overflow-hidden bg-[#F4F6F5] ${interactive ? 'cursor-pointer' : ''}`}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={onClick}
        onKeyDown={interactive ? (e => e.key === 'Enter' && onClick!()) : undefined}
        aria-label={`${name}${age ? `, ${age}` : ''}`}
      >
        {/* Photo */}
        {photo ? (
          <img src={photo} alt={`Profile photo of ${name}`}
            crossOrigin={photo.includes('cloudinary.com') ? 'anonymous' : undefined}
            className="absolute inset-0 w-full h-full object-cover object-[50%_30%]
                       motion-safe:transition-transform motion-safe:duration-700 group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <UserIcon className="w-20 h-20 text-gray-300" />
          </div>
        )}

        {/* Bottom scrim for legibility — keeps face clear */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/75 via-black/25 to-transparent"
             aria-hidden="true" />

        {/* Top-right: compatibility ring or custom badge */}
        {score != null ? (
          <div className="absolute top-3 right-3 bg-white rounded-full p-1 shadow-md">
            <CompatibilityRing score={score} size={48} stroke={5} showLabel={false} />
          </div>
        ) : topRight ? (
          <div className="absolute top-3 right-3">{topRight}</div>
        ) : null}

        {/* Transparent text overlay */}
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <h3 className="text-2xl font-bold font-amiri leading-tight drop-shadow-md">
            {name}{age ? <span className="font-sans text-lg font-semibold">, {age}</span> : null}
          </h3>
          <div className="mt-1.5 space-y-0.5">
            {lines.map((line, i) => (
              <p key={i} className="text-[13px] text-white/90 leading-snug truncate drop-shadow">{line}</p>
            ))}
          </div>
        </div>
      </div>

      {footer && <div className="p-3.5">{footer}</div>}
    </article>
  );
}
