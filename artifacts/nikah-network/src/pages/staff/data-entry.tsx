import { useState } from 'react';
import { useCloudinaryUpload, resetFaceDetection } from '@/hooks/useCloudinaryUpload';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const INCOME_RANGES = [
  { value: 'below-30000',    label: 'Below PKR 30,000' },
  { value: '30000-50000',    label: 'PKR 30,000 – 50,000' },
  { value: '50000-100000',   label: 'PKR 50,000 – 100,000' },
  { value: '100000-200000',  label: 'PKR 100,000 – 200,000' },
  { value: '200000-500000',  label: 'PKR 200,000 – 500,000' },
  { value: '500000-1000000', label: 'PKR 500,000 – 1,000,000' },
  { value: 'above-1000000',  label: 'Above PKR 1,000,000' },
];

interface FormData {
  // Staff-specific
  source: string;
  notes: string;
  // Personal
  name: string;
  email: string;
  phone: string;
  gender: 'male' | 'female' | '';
  dateOfBirth: string;
  height: string;
  caste: string;
  motherTongue: string;
  disability: string;
  religion: string;
  sect: string;
  prayerRegularity: string;
  cnic: string;
  // Career
  education: string;
  institution: string;
  profession: string;
  jobType: string;
  designation: string;
  monthlyIncome: string;
  officeAddress: string;
  // Family
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
  siblingDisability: string;
  // Residence
  homeOwnership: string;
  homeSize: string;
  areaValue: number;
  // Preferences
  matchCriteria: string;
  desiredMatchDetails: string;
  acceptMarriedPerson: string;
  reference: string;
  referenceRelation: string;
  // Photo
  photo: string;
}

const EMPTY: FormData = {
  source: '', notes: '',
  name: '', email: '', phone: '', gender: '', dateOfBirth: '',
  height: '', caste: '', motherTongue: '', disability: 'No',
  religion: 'Islam', sect: '', prayerRegularity: 'Regular', cnic: '',
  education: '', institution: '', profession: '', jobType: '',
  designation: '', monthlyIncome: '', officeAddress: '',
  city: '', address: '', fatherName: '', fatherOccupation: '',
  motherName: '', motherOccupation: '', fatherMobile: '', motherMobile: '',
  siblingsMobile: '', numBrothers: 0, numMarriedBrothers: 0,
  numSisters: 0, numMarriedSisters: 0, employedSiblingsDetails: '',
  siblingDisability: 'No', homeOwnership: 'owned', homeSize: 'kanal',
  areaValue: 0, matchCriteria: '', desiredMatchDetails: '',
  acceptMarriedPerson: 'No', reference: '', referenceRelation: '', photo: '',
};

const cls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500';
const lbl = 'block text-xs font-medium text-gray-600 mb-1';

export default function StaffDataEntry() {
  const [step, setStep]       = useState(1);
  const [form, setForm]       = useState<FormData>(EMPTY);
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { uploadProfilePhoto, uploading: photoUploading, checking: photoChecking, error: photoUploadError } = useCloudinaryUpload();

  const set = (k: keyof FormData, v: string | number) =>
    setForm(p => ({ ...p, [k]: v }));

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    resetFaceDetection();
    const result = await uploadProfilePhoto(file);
    if (result?.url) set('photo', result.url);
  };

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};
    // Step 1 UI: source, notes, photo
    if (s === 1) {
      if (!form.source) errs.source = 'Source required';
    }
    // Step 2 UI: name, email, phone, gender, dob, height, caste, religion, sect, etc.
    if (s === 2) {
      if (!form.name.trim())                        errs.name        = 'Name required';
      if (!form.phone.match(/^\+?\d[\d\s\-]{8,}/)) errs.phone       = 'Valid phone required';
      if (!form.gender)                             errs.gender      = 'Gender required';
      if (!form.dateOfBirth)                        errs.dateOfBirth = 'Date of birth required';
      if (!form.caste.trim())                       errs.caste       = 'Caste required';
    }
    // Step 3 UI: education, institution, profession, etc.
    if (s === 3) {
      if (!form.education)  errs.education  = 'Education required';
      if (!form.profession) errs.profession = 'Profession required';
    }
    // Step 4 UI: city, address, family, home
    if (s === 4) {
      if (!form.city.trim()) errs.city = 'City required';
    }
    // Step 5 UI: preferences — no required fields
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => { if (validateStep(step)) setStep(s => Math.min(5, s + 1)); };

  const handleSubmit = async () => {
    if (!validateStep(5)) return; // step 5 has no required fields
    const token = localStorage.getItem('token');
    if (!token) { setSubmitError('Not authenticated. Please log in.'); return; }

    setLoading(true);
    setSubmitError(null);
    try {
      const body = {
        ...form,
        email: form.email || `${form.phone}@intikhab-offline.pk`,
        dob: form.dateOfBirth,
        income: form.monthlyIncome,
        enteredBy: JSON.parse(localStorage.getItem('user') || '{}').email,
        enteredAt: new Date().toISOString(),
        profileStatus: 'pending',
        profileCompletion: 75,
      };

      const res = await fetch(`${API}/api/staff/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as any).message || `Server error ${res.status}`);
      }

      setSuccess(true);
      setForm(EMPTY);
      setStep(1);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const TOTAL = 5;
  const stepTitles = ['Staff Info', 'Personal', 'Career', 'Family & Residence', 'Preferences'];

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Offline Profile Entry</h1>
        <p className="text-gray-500 text-sm mt-1">Register applicants from WhatsApp, paper forms, or walk-ins</p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Step {step} of {TOTAL}: {stepTitles[step - 1]}</span>
          <span>{Math.round((step / TOTAL) * 100)}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-green-600 transition-all" style={{ width: `${(step / TOTAL) * 100}%` }} />
        </div>
      </div>

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm font-medium">
          ✓ Profile created successfully. Pending staff approval.
        </div>
      )}
      {submitError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {submitError}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">

        {/* ── STEP 1: Staff Info ──────────────────────────────────────────── */}
        {step === 1 && <>
          <h2 className="font-semibold text-gray-900 text-lg mb-4">Staff & Source Info</h2>

          <div>
            <label className={lbl}>Data Source *</label>
            <select value={form.source} onChange={e => set('source', e.target.value)} className={`${cls} ${errors.source ? 'border-red-400' : ''}`}>
              <option value="">Select source</option>
              <option value="paper">Paper Form</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="walkin">Walk-In</option>
              <option value="referral">Referral</option>
              <option value="phone">Phone Call</option>
            </select>
            {errors.source && <p className="text-xs text-red-600 mt-1">{errors.source}</p>}
          </div>

          <div>
            <label className={lbl}>Internal Notes (staff only — not shown to applicant)</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={cls}
              placeholder="Any relevant notes about this applicant or submission…" />
          </div>

          <div>
            <label className={lbl}>Profile Photo (optional — can be added later)</label>
            <div className="flex items-center gap-4">
              {form.photo && (
                <img src={form.photo} alt="Preview" crossOrigin="anonymous" className="w-20 h-20 rounded-lg object-cover border" />
              )}
              <label className={`cursor-pointer px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${(photoUploading || photoChecking) ? 'bg-gray-100 text-gray-400' : 'bg-white text-green-700 border-green-300 hover:bg-green-50'}`}>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} disabled={photoUploading || photoChecking} className="hidden" />
                {photoChecking ? '🔍 Verifying face…' : photoUploading ? 'Uploading…' : form.photo ? 'Change Photo' : 'Upload Photo'}
              </label>
            </div>
            {photoUploadError && <p className="text-xs text-red-600 mt-1 whitespace-pre-line">{photoUploadError}</p>}
            <p className="text-xs text-gray-400 mt-1">Photo must show a real human face — same rules as user registration.</p>
          </div>
        </>}

        {/* ── STEP 2: Personal Info ───────────────────────────────────────── */}
        {step === 2 && <>
          <h2 className="font-semibold text-gray-900 text-lg mb-4">Personal Details</h2>

          <div>
            <label className={lbl}>Full Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className={`${cls} ${errors.name ? 'border-red-400' : ''}`} placeholder="Applicant's full name" />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Gender *</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)} className={`${cls} ${errors.gender ? 'border-red-400' : ''}`}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              {errors.gender && <p className="text-xs text-red-600 mt-1">{errors.gender}</p>}
            </div>
            <div>
              <label className={lbl}>Date of Birth *</label>
              <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} className={`${cls} ${errors.dateOfBirth ? 'border-red-400' : ''}`} />
              {errors.dateOfBirth && <p className="text-xs text-red-600 mt-1">{errors.dateOfBirth}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Phone *</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} className={`${cls} ${errors.phone ? 'border-red-400' : ''}`} placeholder="03001234567" />
              {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={cls} placeholder="Optional" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Height (ft) *</label>
              <input value={form.height} onChange={e => set('height', e.target.value)} className={cls} placeholder="e.g. 5.9" />
            </div>
            <div>
              <label className={lbl}>Caste *</label>
              <input value={form.caste} onChange={e => set('caste', e.target.value)} className={`${cls} ${errors.caste ? 'border-red-400' : ''}`} placeholder="e.g. Arain, Sheikh…" />
              {errors.caste && <p className="text-xs text-red-600 mt-1">{errors.caste}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Religion</label>
              <select value={form.religion} onChange={e => set('religion', e.target.value)} className={cls}>
                <option>Islam</option><option>Christianity</option><option>Hinduism</option><option>Other</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Sect</label>
              <input value={form.sect} onChange={e => set('sect', e.target.value)} className={cls} placeholder="e.g. Sunni, Shia…" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Mother Tongue</label>
              <input value={form.motherTongue} onChange={e => set('motherTongue', e.target.value)} className={cls} placeholder="e.g. Urdu, Punjabi" />
            </div>
            <div>
              <label className={lbl}>Prayer Regularity</label>
              <select value={form.prayerRegularity} onChange={e => set('prayerRegularity', e.target.value)} className={cls}>
                <option>Regular</option><option>Sometimes</option><option>Occasional</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>CNIC</label>
              <input value={form.cnic} onChange={e => set('cnic', e.target.value)} className={cls} placeholder="12345-1234567-1" maxLength={15} />
            </div>
            <div>
              <label className={lbl}>Physical Disability</label>
              <select value={form.disability} onChange={e => set('disability', e.target.value)} className={cls}>
                <option value="No">No</option><option value="Yes">Yes</option>
              </select>
            </div>
          </div>
        </>}

        {/* ── STEP 3: Career ──────────────────────────────────────────────── */}
        {step === 3 && <>
          <h2 className="font-semibold text-gray-900 text-lg mb-4">Education & Career</h2>

          <div>
            <label className={lbl}>Education Level *</label>
            <select value={form.education} onChange={e => set('education', e.target.value)} className={`${cls} ${errors.education ? 'border-red-400' : ''}`}>
              <option value="">Select</option>
              {['Matric','Intermediate','Diploma','Bachelors','Masters','MBA','MBBS','PhD','Other'].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            {errors.education && <p className="text-xs text-red-600 mt-1">{errors.education}</p>}
          </div>

          <div>
            <label className={lbl}>Institution / University</label>
            <input value={form.institution} onChange={e => set('institution', e.target.value)} className={cls} placeholder="University or college name" />
          </div>

          <div>
            <label className={lbl}>Profession / Occupation *</label>
            <input value={form.profession} onChange={e => set('profession', e.target.value)} className={`${cls} ${errors.profession ? 'border-red-400' : ''}`} placeholder="e.g. Doctor, Engineer, Teacher…" />
            {errors.profession && <p className="text-xs text-red-600 mt-1">{errors.profession}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Job Type</label>
              <select value={form.jobType} onChange={e => set('jobType', e.target.value)} className={cls}>
                <option value="">Select</option>
                <option>Full-time</option><option>Part-time</option><option>Self-employed</option>
                <option>Business</option><option>Government</option><option>Freelance</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Designation / Title</label>
              <input value={form.designation} onChange={e => set('designation', e.target.value)} className={cls} placeholder="e.g. Software Engineer" />
            </div>
          </div>

          <div>
            <label className={lbl}>Monthly Income Range</label>
            <select value={form.monthlyIncome} onChange={e => set('monthlyIncome', e.target.value)} className={cls}>
              <option value="">Select</option>
              {INCOME_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div>
            <label className={lbl}>Office / Institution Address</label>
            <input value={form.officeAddress} onChange={e => set('officeAddress', e.target.value)} className={cls} placeholder="Office or institution location" />
          </div>
        </>}

        {/* ── STEP 4: Family & Residence ──────────────────────────────────── */}
        {step === 4 && <>
          <h2 className="font-semibold text-gray-900 text-lg mb-4">Family & Residence</h2>

          <div>
            <label className={lbl}>City *</label>
            <input value={form.city} onChange={e => set('city', e.target.value)} className={`${cls} ${errors.city ? 'border-red-400' : ''}`} placeholder="e.g. Lahore" />
            {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
          </div>

          <div>
            <label className={lbl}>Residential Area / Address</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} className={cls} placeholder="e.g. DHA Phase 5, Lahore" />
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Parents</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Father's Name</label>
                <input value={form.fatherName} onChange={e => set('fatherName', e.target.value)} className={cls} />
              </div>
              <div>
                <label className={lbl}>Father's Occupation</label>
                <input value={form.fatherOccupation} onChange={e => set('fatherOccupation', e.target.value)} className={cls} placeholder="e.g. Businessman" />
              </div>
              <div>
                <label className={lbl}>Mother's Name</label>
                <input value={form.motherName} onChange={e => set('motherName', e.target.value)} className={cls} />
              </div>
              <div>
                <label className={lbl}>Mother's Occupation</label>
                <input value={form.motherOccupation} onChange={e => set('motherOccupation', e.target.value)} className={cls} placeholder="e.g. Housewife" />
              </div>
              <div>
                <label className={lbl}>Father's Mobile</label>
                <input value={form.fatherMobile} onChange={e => set('fatherMobile', e.target.value)} className={cls} placeholder="03001234567" />
              </div>
              <div>
                <label className={lbl}>Mother's Mobile</label>
                <input value={form.motherMobile} onChange={e => set('motherMobile', e.target.value)} className={cls} placeholder="03001234567" />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Siblings</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Brothers</label>
                <input type="number" min={0} value={form.numBrothers} onChange={e => set('numBrothers', parseInt(e.target.value) || 0)} className={cls} />
              </div>
              <div>
                <label className={lbl}>Married Brothers</label>
                <input type="number" min={0} value={form.numMarriedBrothers} onChange={e => set('numMarriedBrothers', parseInt(e.target.value) || 0)} className={cls} />
              </div>
              <div>
                <label className={lbl}>Sisters</label>
                <input type="number" min={0} value={form.numSisters} onChange={e => set('numSisters', parseInt(e.target.value) || 0)} className={cls} />
              </div>
              <div>
                <label className={lbl}>Married Sisters</label>
                <input type="number" min={0} value={form.numMarriedSisters} onChange={e => set('numMarriedSisters', parseInt(e.target.value) || 0)} className={cls} />
              </div>
            </div>
            {(form.numBrothers > 0 || form.numSisters > 0) && (
              <div className="mt-4">
                <label className={lbl}>Sibling's Mobile</label>
                <input value={form.siblingsMobile} onChange={e => set('siblingsMobile', e.target.value)} className={cls} placeholder="03001234567" />
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Home</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Home Status</label>
                <select value={form.homeOwnership} onChange={e => set('homeOwnership', e.target.value)} className={cls}>
                  <option value="owned">Owned</option><option value="rented">Rented</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Size Unit</label>
                <select value={form.homeSize} onChange={e => set('homeSize', e.target.value)} className={cls}>
                  <option value="kanal">Kanal</option><option value="marla">Marla</option><option value="sqft">Sq Ft</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className={lbl}>Area Value</label>
              <input type="number" min={0} value={form.areaValue || ''} onChange={e => set('areaValue', parseInt(e.target.value) || 0)} className={cls} placeholder="e.g. 10" />
            </div>
          </div>
        </>}

        {/* ── STEP 5: Preferences ─────────────────────────────────────────── */}
        {step === 5 && <>
          <h2 className="font-semibold text-gray-900 text-lg mb-4">Match Preferences</h2>

          <div>
            <label className={lbl}>Desired Criteria for Match</label>
            <textarea value={form.matchCriteria} onChange={e => set('matchCriteria', e.target.value)} rows={3} className={cls}
              placeholder="e.g. Educated, same caste, family-oriented, God-fearing…" />
          </div>

          <div>
            <label className={lbl}>Desired Match Details</label>
            <textarea value={form.desiredMatchDetails} onChange={e => set('desiredMatchDetails', e.target.value)} rows={2} className={cls}
              placeholder="Any additional preferences or notes…" />
          </div>

          {form.gender === 'female' && (
            <div>
              <label className={lbl}>Is a married person acceptable?</label>
              <select value={form.acceptMarriedPerson} onChange={e => set('acceptMarriedPerson', e.target.value)} className={cls}>
                <option value="No">No</option><option value="Yes">Yes</option>
              </select>
            </div>
          )}

          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Reference</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Reference Name</label>
                <input value={form.reference} onChange={e => set('reference', e.target.value)} className={cls} placeholder="Name of referrer" />
              </div>
              <div>
                <label className={lbl}>Relation / Organization</label>
                <input value={form.referenceRelation} onChange={e => set('referenceRelation', e.target.value)} className={cls} placeholder="e.g. Family friend, organization" />
              </div>
            </div>
          </div>
        </>}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex justify-between gap-4">
        <button
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40 text-sm"
        >
          Previous
        </button>

        {step < TOTAL ? (
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            {loading ? 'Creating Profile…' : 'Create Profile'}
          </button>
        )}
      </div>
    </div>
  );
}
