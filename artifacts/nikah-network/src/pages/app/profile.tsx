import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useCloudinaryUpload, resetFaceDetection } from '@/hooks/useCloudinaryUpload';

const API = 'http://localhost:5000';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Profile {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  age: number;
  dateOfBirth: string;
  height: string;
  caste: string;
  motherTongue: string;
  disability: string;
  religion: string;
  sect: string;
  prayerRegularity: string;
  cnic: string;
  education: string;
  institution: string;
  profession: string;
  jobType: string;
  designation: string;
  monthlyIncome: string;
  officeAddress: string;
  city: string;
  address: string;
  fatherName: string;
  fatherOccupation: string;
  motherName: string;
  motherOccupation: string;
  fatherMobile: string;
  motherMobile: string;
  siblingsMobile: string;
  numBrothers: number;
  numMarriedBrothers: number;
  numSisters: number;
  numMarriedSisters: number;
  employedSiblingsDetails: string;
  homeOwnership: string;
  homeSize: string;
  areaValue: number;
  matchCriteria: string;
  desiredMatchDetails: string;
  acceptMarriedPerson: string;
  bio: string;
  photo: string;
  profileStatus: string;
  profileCompletion: number;
  paymentStatus: string;
}

const EMPTY: Profile = {
  name: '', email: '', phone: '', gender: '', age: 0, dateOfBirth: '',
  height: '', caste: '', motherTongue: '', disability: 'No', religion: 'Islam',
  sect: '', prayerRegularity: '', cnic: '', education: '', institution: '',
  profession: '', jobType: '', designation: '', monthlyIncome: '',
  officeAddress: '', city: '', address: '', fatherName: '', fatherOccupation: '',
  motherName: '', motherOccupation: '', fatherMobile: '', motherMobile: '',
  siblingsMobile: '', numBrothers: 0, numMarriedBrothers: 0,
  numSisters: 0, numMarriedSisters: 0, employedSiblingsDetails: '',
  homeOwnership: '', homeSize: '', areaValue: 0,
  matchCriteria: '', desiredMatchDetails: '', acceptMarriedPerson: '',
  bio: '', photo: '', profileStatus: 'pending', profileCompletion: 0,
  paymentStatus: 'pending',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatIncome(v: string) {
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

function InfoRow({ label, value }: { label: string; value: string | number | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5 font-medium">{String(value)}</p>
    </div>
  );
}

type SectionKey = 'personal' | 'career' | 'family' | 'residence' | 'preferences';

// ── Section edit modal ────────────────────────────────────────────────────────

interface SectionEditorProps {
  section: SectionKey;
  profile: Profile;
  onSave: (fields: Partial<Profile>) => Promise<void>;
  onClose: () => void;
}

function SectionEditor({ section, profile, onSave, onClose }: SectionEditorProps) {
  const [draft, setDraft] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const set = (k: keyof Profile, v: string | number) => setDraft(d => ({ ...d, [k]: v }));
  const get = (k: keyof Profile): string => (String((draft as any)[k] ?? (profile as any)[k] ?? ''));
  const getN = (k: keyof Profile): number => Number((draft as any)[k] ?? (profile as any)[k] ?? 0);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(draft);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500';
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg capitalize">
            Edit {section.replace('career', 'Education & Career').replace('preferences', 'Match Preferences')}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          {section === 'personal' && <>
            <div><label className={labelClass}>Bio</label>
              <textarea value={get('bio')} onChange={e => set('bio', e.target.value)}
                rows={3} className={inputClass} placeholder="A few sentences about yourself…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Height (ft)</label>
                <input value={get('height')} onChange={e => set('height', e.target.value)} className={inputClass} placeholder="e.g. 5.9" /></div>
              <div><label className={labelClass}>Mother Tongue</label>
                <input value={get('motherTongue')} onChange={e => set('motherTongue', e.target.value)} className={inputClass} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Religion</label>
                <input value={get('religion')} onChange={e => set('religion', e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Sect</label>
                <input value={get('sect')} onChange={e => set('sect', e.target.value)} className={inputClass} /></div>
            </div>
            <div><label className={labelClass}>Prayer Regularity</label>
              <select value={get('prayerRegularity')} onChange={e => set('prayerRegularity', e.target.value)} className={inputClass}>
                <option value="">Select</option>
                <option>Regular</option><option>Sometimes</option><option>Occasional</option>
              </select></div>
          </>}

          {section === 'career' && <>
            <div><label className={labelClass}>Education Level</label>
              <input value={get('education')} onChange={e => set('education', e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Institution</label>
              <input value={get('institution')} onChange={e => set('institution', e.target.value)} className={inputClass} placeholder="University or college name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Profession</label>
                <input value={get('profession')} onChange={e => set('profession', e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Designation</label>
                <input value={get('designation')} onChange={e => set('designation', e.target.value)} className={inputClass} /></div>
            </div>
            <div><label className={labelClass}>Monthly Income Range</label>
              <select value={get('monthlyIncome')} onChange={e => set('monthlyIncome', e.target.value)} className={inputClass}>
                <option value="">Select</option>
                {['below-30000','30000-50000','50000-100000','100000-200000','200000-500000','500000-1000000','above-1000000'].map(v => (
                  <option key={v} value={v}>{formatIncome(v)}</option>
                ))}
              </select></div>
            <div><label className={labelClass}>Office / Institution Address</label>
              <input value={get('officeAddress')} onChange={e => set('officeAddress', e.target.value)} className={inputClass} /></div>
          </>}

          {section === 'family' && <>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Father's Name</label>
                <input value={get('fatherName')} onChange={e => set('fatherName', e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Father's Occupation</label>
                <input value={get('fatherOccupation')} onChange={e => set('fatherOccupation', e.target.value)} className={inputClass} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Mother's Name</label>
                <input value={get('motherName')} onChange={e => set('motherName', e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Mother's Occupation</label>
                <input value={get('motherOccupation')} onChange={e => set('motherOccupation', e.target.value)} className={inputClass} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Brothers</label>
                <input type="number" min={0} value={getN('numBrothers')} onChange={e => set('numBrothers', parseInt(e.target.value)||0)} className={inputClass} /></div>
              <div><label className={labelClass}>Married Brothers</label>
                <input type="number" min={0} value={getN('numMarriedBrothers')} onChange={e => set('numMarriedBrothers', parseInt(e.target.value)||0)} className={inputClass} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Sisters</label>
                <input type="number" min={0} value={getN('numSisters')} onChange={e => set('numSisters', parseInt(e.target.value)||0)} className={inputClass} /></div>
              <div><label className={labelClass}>Married Sisters</label>
                <input type="number" min={0} value={getN('numMarriedSisters')} onChange={e => set('numMarriedSisters', parseInt(e.target.value)||0)} className={inputClass} /></div>
            </div>
            <div><label className={labelClass}>Employed Siblings Details</label>
              <textarea value={get('employedSiblingsDetails')} onChange={e => set('employedSiblingsDetails', e.target.value)} rows={2} className={inputClass} /></div>
          </>}

          {section === 'residence' && <>
            <div><label className={labelClass}>City *</label>
              <input value={get('city')} onChange={e => set('city', e.target.value)} className={inputClass} placeholder="e.g. Lahore" /></div>
            <div><label className={labelClass}>Residential Area / Address</label>
              <input value={get('address')} onChange={e => set('address', e.target.value)} className={inputClass} placeholder="e.g. DHA Phase 5, Lahore" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Home Status</label>
                <select value={get('homeOwnership')} onChange={e => set('homeOwnership', e.target.value)} className={inputClass}>
                  <option value="">Select</option><option value="owned">Owned</option><option value="rented">Rented</option>
                </select></div>
              <div><label className={labelClass}>Area Size Unit</label>
                <select value={get('homeSize')} onChange={e => set('homeSize', e.target.value)} className={inputClass}>
                  <option value="">Select</option><option value="kanal">Kanal</option><option value="marla">Marla</option><option value="sqft">Sq Ft</option>
                </select></div>
            </div>
            <div><label className={labelClass}>Area Value</label>
              <input type="number" min={0} value={getN('areaValue') || ''} onChange={e => set('areaValue', parseInt(e.target.value)||0)} className={inputClass} placeholder="e.g. 10" /></div>
          </>}

          {section === 'preferences' && <>
            <div><label className={labelClass}>Match Criteria / Requirements</label>
              <textarea value={get('matchCriteria')} onChange={e => set('matchCriteria', e.target.value)} rows={3}
                className={inputClass} placeholder="What qualities are important to you? (e.g. same caste, educated, family-oriented…)" /></div>
            <div><label className={labelClass}>Desired Match Details</label>
              <textarea value={get('desiredMatchDetails')} onChange={e => set('desiredMatchDetails', e.target.value)} rows={2}
                className={inputClass} placeholder="Any additional preferences or notes…" /></div>
            {profile.gender === 'female' && (
              <div><label className={labelClass}>Is a married person acceptable?</label>
                <select value={get('acceptMarriedPerson')} onChange={e => set('acceptMarriedPerson', e.target.value)} className={inputClass}>
                  <option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option>
                </select></div>
            )}
          </>}
        </div>

        {saveError && (
          <div className="mx-5 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {saveError}
          </div>
        )}
        <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || Object.keys(draft).length === 0}
            className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Profile Page ─────────────────────────────────────────────────────────

export default function AppProfile() {
  const [, setLocation]  = useLocation();
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [editSection, setEditSection] = useState<SectionKey | null>(null);
  const [photoError,  setPhotoError]  = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { uploadProfilePhoto, checking, error: uploadErr } = useCloudinaryUpload();
  // Token read fresh on each save — avoids stale closure from render time

  // ── Load profile ────────────────────────────────────────────────────────────
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      console.warn('[Profile] No token found → redirect to login');
      setLocation('/login');
      return;
    }

    console.log('[Profile] Fetching /api/profile/me…');
    fetch(`${API}/api/profile/me`, {
      headers: {
        Authorization: `Bearer ${storedToken}`,
        'Content-Type': 'application/json',
      },
    })
      .then(r => {
        console.log(`[Profile] /api/profile/me → ${r.status}`);
        if (r.status === 401) {
          // Token expired or invalid → clear and redirect
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setLocation('/login');
          return null;
        }
        return r.json();
      })
      .then(d => {
        if (!d) return;
        if (d.profile) {
          setProfile({ ...EMPTY, ...d.profile });
        } else if (d.error) {
          setError(d.error);
        }
      })
      .catch(err => {
        console.error('[Profile] Fetch error:', err);
        setError('Failed to load profile. Please refresh the page.');
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save section ────────────────────────────────────────────────────────────
  const handleSaveSection = async (fields: Partial<Profile>) => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      localStorage.removeItem('user');
      setLocation('/login');
      throw new Error('Session expired. Please log in again.');
    }

    let res: Response;
    try {
      res = await fetch(`${API}/api/profile/me/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
        body: JSON.stringify(fields),
      });
    } catch (networkErr) {
      console.error('[Profile] Network error on save:', networkErr);
      throw new Error('Network error — check your connection and try again.');
    }

    console.log(`[Profile] PATCH /api/profile/me/update → ${res.status}`);

    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setLocation('/login');
      throw new Error('Session expired. Please log in again.');
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as any).error || `Save failed (${res.status})`);
    }

    setProfile(p => ({ ...p, ...fields }));
  };

  // ── Photo upload ────────────────────────────────────────────────────────────
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = ''; // allow re-select same file
    setPhotoError(null);
    setPhotoLoading(true);
    resetFaceDetection(); // Allow fresh model-load attempt on each file pick

    const result = await uploadProfilePhoto(file);
    setPhotoLoading(false);

    if (result?.url) {
      try {
        await handleSaveSection({ photo: result.url });
        setPhotoError(null);
      } catch (err) {
        setPhotoError(err instanceof Error ? err.message : 'Failed to save photo. Please try again.');
      }
    } else {
      // Error from hook: face detection rejection, size/type error, network error, etc.
      setPhotoError(uploadErr ?? 'Upload failed. Please try again.');
    }
  };

  // ── Derived display values ──────────────────────────────────────────────────
  const statusConfig = {
    approved: { color: 'text-green-700 bg-green-50 border-green-200', label: 'Profile Approved' },
    rejected: { color: 'text-red-700 bg-red-50 border-red-200',       label: 'Profile Rejected' },
    pending:  { color: 'text-yellow-700 bg-yellow-50 border-yellow-200', label: 'Awaiting Staff Review' },
  }[profile.profileStatus] ?? { color: 'text-gray-600 bg-gray-50 border-gray-200', label: 'Unknown' };

  const completion = profile.profileCompletion ?? 0;
  const completionColor = completion >= 100 ? 'bg-green-500' : completion >= 60 ? 'bg-yellow-400' : 'bg-red-400';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-gray-200 border-t-green-600 rounded-full mx-auto mb-3" />
          <p className="text-gray-500">Loading your profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 p-4 pb-12">
      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {/* ── HEADER CARD ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Top gradient accent */}
        <div className="h-2 bg-linear-to-r from-green-500 via-emerald-400 to-teal-500" />

        <div className="p-6">
          <div className="flex items-start gap-5">
            {/* Profile photo */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-gray-100 flex items-center justify-center">
                {profile.photo ? (
                  <img src={profile.photo} alt={profile.name} crossOrigin="anonymous"
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <span className="text-4xl text-gray-300">👤</span>
                )}
              </div>

              {/* Change photo button */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={photoLoading || checking}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center shadow hover:bg-green-700 transition-colors text-xs disabled:opacity-60"
                title={checking ? 'Verifying face…' : 'Change profile photo'}
              >
                {checking ? '🔍' : photoLoading ? '…' : '✎'}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                className="hidden" onChange={handlePhotoChange} />
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
                <p className="text-gray-600 text-sm mt-0.5">{profile.profession}{profile.designation ? ` — ${profile.designation}` : ''}</p>
              )}

              {/* Status badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
                {profile.paymentStatus === 'completed' && (
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full border border-blue-200 text-blue-700 bg-blue-50">
                    ✓ Subscribed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Photo error */}
          {photoError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 whitespace-pre-line">
              {photoError}
            </div>
          )}

          {/* face-api.js works in all browsers — no restriction */}

          {/* Completion bar */}
          <div className="mt-5">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span className="font-medium">Profile Completion</span>
              <span className="font-bold text-gray-700">{completion}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${completionColor}`}
                style={{ width: `${completion}%` }} />
            </div>
            {completion < 100 && (
              <button onClick={() => setLocation('/profile-wizard')}
                className="mt-2 text-xs text-green-600 hover:text-green-700 underline font-medium">
                Complete your profile to unlock matchmaking →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── PERSONAL DETAILS ────────────────────────────────────────────── */}
      <ProfileSection title="Personal Details" icon="👤" onEdit={() => setEditSection('personal')}>
        {profile.bio && (
          <div className="col-span-2 bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-700 italic border-l-2 border-green-400">
            "{profile.bio}"
          </div>
        )}
        <InfoRow label="Caste"           value={profile.caste} />
        <InfoRow label="Religion / Sect" value={[profile.religion, profile.sect].filter(Boolean).join(' – ')} />
        <InfoRow label="Height"          value={profile.height ? `${profile.height} ft` : ''} />
        <InfoRow label="Mother Tongue"   value={profile.motherTongue} />
        <InfoRow label="Prayer"          value={profile.prayerRegularity} />
        <InfoRow label="Disability"      value={profile.disability !== 'No' ? profile.disability : ''} />
        <InfoRow label="CNIC"            value={profile.cnic ? `${profile.cnic.slice(0, 5)}-XXXXXXX-X` : ''} />
        <InfoRow label="Date of Birth"   value={profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' }) : ''} />
      </ProfileSection>

      {/* ── EDUCATION & CAREER ──────────────────────────────────────────── */}
      <ProfileSection title="Education & Career" icon="🎓" onEdit={() => setEditSection('career')}>
        <InfoRow label="Education"    value={profile.education} />
        <InfoRow label="Institution"  value={profile.institution} />
        <InfoRow label="Profession"   value={profile.profession} />
        <InfoRow label="Designation"  value={profile.designation} />
        <InfoRow label="Job Type"     value={profile.jobType} />
        <InfoRow label="Monthly Income" value={formatIncome(profile.monthlyIncome)} />
        <InfoRow label="Office / Workplace" value={profile.officeAddress} />
      </ProfileSection>

      {/* ── FAMILY ──────────────────────────────────────────────────────── */}
      <ProfileSection title="Family Background" icon="👨‍👩‍👧‍👦" onEdit={() => setEditSection('family')}>
        <InfoRow label="Father"   value={profile.fatherName ? `${profile.fatherName}${profile.fatherOccupation ? ` (${profile.fatherOccupation})` : ''}` : ''} />
        <InfoRow label="Mother"   value={profile.motherName ? `${profile.motherName}${profile.motherOccupation ? ` (${profile.motherOccupation})` : ''}` : ''} />
        <InfoRow label="Brothers" value={profile.numBrothers > 0 ? `${profile.numBrothers} (${profile.numMarriedBrothers} married)` : profile.numBrothers === 0 ? 'None' : ''} />
        <InfoRow label="Sisters"  value={profile.numSisters > 0 ? `${profile.numSisters} (${profile.numMarriedSisters} married)` : profile.numSisters === 0 ? 'None' : ''} />
        {profile.employedSiblingsDetails && <InfoRow label="Employed Siblings" value={profile.employedSiblingsDetails} />}
      </ProfileSection>

      {/* ── RESIDENCE ───────────────────────────────────────────────────── */}
      <ProfileSection title="Residence & Home" icon="🏠" onEdit={() => setEditSection('residence')}>
        <InfoRow label="City"       value={profile.city} />
        <InfoRow label="Area"       value={profile.address} />
        <InfoRow label="Home"       value={profile.homeOwnership ? `${profile.homeOwnership.charAt(0).toUpperCase() + profile.homeOwnership.slice(1)}${profile.areaValue ? ` · ${profile.areaValue} ${profile.homeSize}` : ''}` : ''} />
      </ProfileSection>

      {/* ── MATCH PREFERENCES ───────────────────────────────────────────── */}
      <ProfileSection title="Match Preferences" icon="💍" onEdit={() => setEditSection('preferences')}>
        <InfoRow label="Looking For"        value={profile.matchCriteria} />
        <InfoRow label="Additional Details" value={profile.desiredMatchDetails} />
        {profile.gender === 'female' && (
          <InfoRow label="Accept Married?" value={profile.acceptMarriedPerson} />
        )}
      </ProfileSection>

      {/* Edit modal */}
      {editSection && (
        <SectionEditor
          section={editSection}
          profile={profile}
          onSave={handleSaveSection}
          onClose={() => setEditSection(null)}
        />
      )}
    </div>
  );
}

// ── Reusable section card ─────────────────────────────────────────────────────

function ProfileSection({
  title, icon, onEdit, children,
}: {
  title: string; icon: string; onEdit: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <span>{icon}</span>
          <span>{title}</span>
        </h2>
        <button
          onClick={onEdit}
          className="text-xs text-green-600 hover:text-green-700 border border-green-200 hover:border-green-300 px-3 py-1 rounded-full transition-colors font-medium"
        >
          Edit
        </button>
      </div>
      <div className="px-6 py-4 grid grid-cols-2 gap-x-6 gap-y-3">
        {children}
      </div>
    </div>
  );
}
