/**
 * ProfileView — shared read-only profile display used by:
 *  - /app/profile (user) — wrapped with edit buttons + photo upload
 *  - /staff/profile-approval — wrapped with approve/reject actions
 *
 * Accepts any partial profile shape so it works for both seed and wizard profiles.
 */

import React from 'react';

export interface ProfileData {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  age?: number;
  dateOfBirth?: string;
  dob?: string;
  height?: string;
  caste?: string;
  motherTongue?: string;
  disability?: string;
  religion?: string;
  sect?: string;
  prayerRegularity?: string;
  cnic?: string;
  bio?: string;
  education?: string;
  institution?: string;
  profession?: string;
  jobType?: string;
  designation?: string;
  monthlyIncome?: string;
  income?: string;
  officeAddress?: string;
  city?: string;
  address?: string;
  homeOwnership?: string;
  houseStatus?: string;
  homeSize?: string;
  areaValue?: number;
  houseArea?: string;
  fatherName?: string;
  fatherOccupation?: string;
  motherName?: string;
  motherOccupation?: string;
  numBrothers?: number;
  numMarriedBrothers?: number;
  numSisters?: number;
  numMarriedSisters?: number;
  employedSiblingsDetails?: string;
  matchCriteria?: string;
  desiredMatchDetails?: string;
  acceptMarriedPerson?: string;
  reference?: string;
  referenceRelation?: string;
  photo?: string;
  profileStatus?: string;
  profileCompletion?: number;
  paymentStatus?: string;
  source?: string;
  notes?: string;
  enteredBy?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatIncome(v?: string): string {
  if (!v) return '';
  const map: Record<string, string> = {
    'below-30000':    'Below PKR 30,000',
    '30000-50000':    'PKR 30,000 – 50,000',
    '50000-100000':   'PKR 50,000 – 100,000',
    '100000-200000':  'PKR 100,000 – 200,000',
    '200000-500000':  'PKR 200,000 – 500,000',
    '500000-1000000': 'PKR 500,000 – 1,000,000',
    'above-1000000':  'Above PKR 1,000,000',
  };
  return map[v] || v;
}

function Row({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === null || value === '' || value === 0 && label !== 'Brothers' && label !== 'Sisters') return null;
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5 font-medium">{String(value)}</p>
    </div>
  );
}

function Section({
  title, icon, children, action,
}: {
  title: string; icon: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <span>{icon}</span><span>{title}</span>
        </h2>
        {action}
      </div>
      <div className="px-6 py-4 grid grid-cols-2 gap-x-6 gap-y-3">
        {children}
      </div>
    </div>
  );
}

// ── Status config ─────────────────────────────────────────────────────────────

function statusBadge(status?: string) {
  const cfg: Record<string, { color: string; label: string }> = {
    approved: { color: 'text-green-700 bg-green-50 border-green-200',   label: 'Profile Approved' },
    rejected: { color: 'text-red-700 bg-red-50 border-red-200',         label: 'Profile Rejected' },
    pending:  { color: 'text-yellow-700 bg-yellow-50 border-yellow-200', label: 'Awaiting Review' },
  };
  return cfg[status ?? ''] ?? { color: 'text-gray-600 bg-gray-50 border-gray-200', label: status ?? 'Unknown' };
}

// ── Main component ────────────────────────────────────────────────────────────

interface ProfileViewProps {
  profile: ProfileData;
  /** Slot rendered over the header photo area — e.g. upload button */
  photoAction?: React.ReactNode;
  /** Optional error displayed under photo (e.g. upload error) */
  photoError?: string | null;
  /** Slot rendered at start of each section header (edit button etc.) */
  sectionAction?: (section: string) => React.ReactNode;
  /** Extra content rendered after all sections (e.g. staff approve/reject panel) */
  footer?: React.ReactNode;
  /** Whether to show CNIC masked */
  maskCnic?: boolean;
}

export function ProfileView({
  profile,
  photoAction,
  photoError,
  sectionAction,
  footer,
  maskCnic = true,
}: ProfileViewProps) {
  const completion    = profile.profileCompletion ?? 0;
  const completionBar = completion >= 100 ? 'bg-green-500' : completion >= 60 ? 'bg-yellow-400' : 'bg-red-400';
  const status        = statusBadge(profile.profileStatus);
  const dob           = profile.dateOfBirth || profile.dob;
  const homeOwnership = profile.homeOwnership || profile.houseStatus;
  const income        = formatIncome(profile.monthlyIncome || profile.income);
  const cnicDisplay   = profile.cnic
    ? (maskCnic ? `${profile.cnic.slice(0, 5)}-XXXXXXX-X` : profile.cnic)
    : undefined;

  const brothersText = profile.numBrothers !== undefined
    ? `${profile.numBrothers}${profile.numBrothers > 0 && profile.numMarriedBrothers !== undefined ? ` (${profile.numMarriedBrothers} married)` : ''}`
    : undefined;
  const sistersText  = profile.numSisters !== undefined
    ? `${profile.numSisters}${profile.numSisters > 0 && profile.numMarriedSisters !== undefined ? ` (${profile.numMarriedSisters} married)` : ''}`
    : undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="h-2 bg-linear-to-r from-green-500 via-emerald-400 to-teal-500" />

        <div className="p-6">
          <div className="flex items-start gap-5">
            {/* Photo */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-gray-100 flex items-center justify-center">
                {profile.photo ? (
                  <img
                    src={profile.photo}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                    crossOrigin={profile.photo?.includes('cloudinary.com') ? 'anonymous' : undefined}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <span className="text-4xl text-gray-300">👤</span>
                )}
              </div>
              {photoAction}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                {profile.name || '—'}
                {profile.age ? <span className="text-gray-400 font-normal text-lg ml-2">({profile.age})</span> : null}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {[profile.city, profile.gender ? (profile.gender === 'male' ? 'Male' : 'Female') : ''].filter(Boolean).join(' · ')}
              </p>
              {profile.profession && (
                <p className="text-gray-600 text-sm mt-0.5">
                  {profile.profession}{profile.designation ? ` — ${profile.designation}` : ''}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${status.color}`}>
                  {status.label}
                </span>
                {profile.paymentStatus === 'completed' && (
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full border border-blue-200 text-blue-700 bg-blue-50">
                    ✓ Subscribed
                  </span>
                )}
                {profile.source && profile.source !== 'self' && (
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full border border-gray-200 text-gray-600 bg-gray-50 capitalize">
                    Source: {profile.source}
                  </span>
                )}
              </div>
            </div>
          </div>

          {photoError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 whitespace-pre-line">
              {photoError}
            </div>
          )}

          {/* Completion bar */}
          <div className="mt-5">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span className="font-medium">Profile Completion</span>
              <span className="font-bold text-gray-700">{completion}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${completionBar}`}
                style={{ width: `${completion}%` }} />
            </div>
          </div>

          {/* Staff entry notes */}
          {profile.notes && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-900 mb-1">Staff Notes</p>
              <p className="text-sm text-blue-800">{profile.notes}</p>
            </div>
          )}
          {profile.enteredBy && (
            <p className="mt-2 text-xs text-gray-400">Entered by: {profile.enteredBy}</p>
          )}
        </div>
      </div>

      {/* ── PERSONAL ────────────────────────────────────────────────────── */}
      <Section title="Personal Details" icon="👤" action={sectionAction?.('personal')}>
        {profile.bio && (
          <div className="col-span-2 bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-700 italic border-l-2 border-green-400">
            "{profile.bio}"
          </div>
        )}
        <Row label="Caste"           value={profile.caste} />
        <Row label="Religion / Sect" value={[profile.religion, profile.sect].filter(Boolean).join(' – ')} />
        <Row label="Height"          value={profile.height ? `${profile.height} ft` : ''} />
        <Row label="Mother Tongue"   value={profile.motherTongue} />
        <Row label="Prayer"          value={profile.prayerRegularity} />
        <Row label="Disability"      value={profile.disability !== 'No' ? profile.disability : ''} />
        <Row label="CNIC"            value={cnicDisplay} />
        <Row label="Date of Birth"   value={dob ? new Date(dob).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' }) : ''} />
      </Section>

      {/* ── CAREER ──────────────────────────────────────────────────────── */}
      <Section title="Education & Career" icon="🎓" action={sectionAction?.('career')}>
        <Row label="Education"     value={profile.education} />
        <Row label="Institution"   value={profile.institution} />
        <Row label="Profession"    value={profile.profession} />
        <Row label="Designation"   value={profile.designation} />
        <Row label="Job Type"      value={profile.jobType} />
        <Row label="Monthly Income" value={income} />
        <Row label="Office / Workplace" value={profile.officeAddress} />
      </Section>

      {/* ── FAMILY ──────────────────────────────────────────────────────── */}
      <Section title="Family Background" icon="👨‍👩‍👧‍👦" action={sectionAction?.('family')}>
        <Row label="Father" value={profile.fatherName ? `${profile.fatherName}${profile.fatherOccupation ? ` (${profile.fatherOccupation})` : ''}` : undefined} />
        <Row label="Mother" value={profile.motherName ? `${profile.motherName}${profile.motherOccupation ? ` (${profile.motherOccupation})` : ''}` : undefined} />
        <Row label="Brothers" value={brothersText} />
        <Row label="Sisters"  value={sistersText} />
        {profile.employedSiblingsDetails && <Row label="Employed Siblings" value={profile.employedSiblingsDetails} />}
      </Section>

      {/* ── RESIDENCE ───────────────────────────────────────────────────── */}
      <Section title="Residence & Home" icon="🏠" action={sectionAction?.('residence')}>
        <Row label="City" value={profile.city} />
        <Row label="Area" value={profile.address} />
        <Row label="Home" value={homeOwnership ? `${homeOwnership.charAt(0).toUpperCase() + homeOwnership.slice(1)}${profile.areaValue ? ` · ${profile.areaValue} ${profile.homeSize}` : ''}` : undefined} />
      </Section>

      {/* ── PREFERENCES ─────────────────────────────────────────────────── */}
      <Section title="Match Preferences" icon="💍" action={sectionAction?.('preferences')}>
        <Row label="Looking For"        value={profile.matchCriteria} />
        <Row label="Additional Details" value={profile.desiredMatchDetails} />
        {profile.gender === 'female' && (
          <Row label="Accept Married?" value={profile.acceptMarriedPerson} />
        )}
        <Row label="Reference"  value={profile.reference} />
        <Row label="Relation"   value={profile.referenceRelation} />
      </Section>

      {/* Footer slot — staff approve/reject, etc. */}
      {footer}
    </div>
  );
}
