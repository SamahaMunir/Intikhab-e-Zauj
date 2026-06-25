/**
 * Staff Data Entry — mirrors Profile Wizard exactly.
 *
 * Shared with wizard:
 *  - ProfileFormData interface (lib/profile-validation.ts)
 *  - All validation functions (lib/profile-validation.ts)
 *  - All dropdown options (lib/profile-options.ts)
 *  - SearchableSelect + PhoneInput components
 *  - Gender-conditional logic (acceptMarriedPerson, siblingsMobile)
 *  - Face detection for profile photo
 *
 * Staff-only additions:
 *  - Step 0: data source, internal notes
 *  - Submit to POST /api/staff/create-user
 *  - profileStatus starts as 'pending' (requires approval)
 */

import { useState, useRef } from 'react';
import { useCloudinaryUpload, resetFaceDetection } from '@/hooks/useCloudinaryUpload';
import { getToken } from '@/lib/auth';
import SearchableSelect from '@/components/SearchableSelect';
import PhoneInput from '@/components/PhoneInput';
import {
  LANGUAGES, RELIGIONS, SECTS, CASTES, CITIES, PROFESSIONS,
  OCCUPATIONS, EDUCATION_LEVELS, PAKISTANI_UNIVERSITIES,
  INCOME_RANGES, DESIGNATIONS_BY_PROFESSION, GENERIC_DESIGNATIONS,
  ALL_PK_AREAS,
} from '@/lib/profile-options';
import {
  validateCNIC, validatePakistaniPhone, validateAge,
  validateHeight, validateHouseArea, formatCNIC, calculateAge,
  type ProfileFormData, EMPTY_PROFILE_FORM,
} from '@/lib/profile-validation';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Staff-specific meta ───────────────────────────────────────────────────────

interface StaffMeta {
  source: string;
  notes: string;
}

const EMPTY_META: StaffMeta = { source: '', notes: '' };

// ── Component ─────────────────────────────────────────────────────────────────

export default function StaffDataEntry() {
  const [step, setStep]               = useState(0);           // 0 = staff meta, 1-4 = wizard steps
  const [meta, setMeta]               = useState<StaffMeta>(EMPTY_META);
  const [phone, setPhone]             = useState('');           // applicant's own phone (required by backend)
  const [formData, setFormData]       = useState<ProfileFormData>(EMPTY_PROFILE_FORM('male'));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const {
    uploadProfilePhoto, uploading, checking, error: uploadError, progress,
  } = useCloudinaryUpload();

  const TOTAL_STEPS = 4; // wizard steps (1-4); step 0 is staff meta

  // ── Scroll to first error ────────────────────────────────────────────────────
  const scrollToFirstError = () => {
    setTimeout(() => {
      const el = formRef.current?.querySelector('[data-error="true"]') as HTMLElement | null;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const set = (name: keyof ProfileFormData, value: string | number) =>
    setFormData(prev => ({ ...prev, [name]: value }));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target as { name: keyof ProfileFormData; value: string };
    const formatted = name === 'cnic' ? formatCNIC(value) : value;
    setFormData(prev => ({ ...prev, [name]: formatted }));
    if (fieldErrors[name]) setFieldErrors(p => { const n = { ...p }; delete n[name]; return n; });
  };

  const handleNumberChange = (name: keyof ProfileFormData, value: number) => {
    const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
    setFormData(prev => ({ ...prev, [name]: safe }));
  };

  const handleDOBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dob = e.target.value;
    const age = calculateAge(dob);
    const ageErr = validateAge(dob);
    if (ageErr) setFieldErrors(p => ({ ...p, dateOfBirth: ageErr }));
    else setFieldErrors(p => { const n = { ...p }; delete n.dateOfBirth; return n; });
    setFormData(prev => ({ ...prev, dateOfBirth: dob, age }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    resetFaceDetection();
    const result = await uploadProfilePhoto(file);
    if (result?.url) {
      setFormData(prev => ({ ...prev, photo: result.url }));
      setFieldErrors(p => { const n = { ...p }; delete n.photo; return n; });
      // Immediately check if this Cloudinary URL is already in use
      const dup = await checkDuplicate({ photo: result.url });
      if (dup) {
        setFieldErrors(p => ({ ...p, photo: dup.message }));
      }
    }
  };

  const handleDeletePhoto = () => setFormData(prev => ({ ...prev, photo: '' }));

  // ── Validation ───────────────────────────────────────────────────────────────
  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};

    if (s === 0) {
      if (!meta.source) errs.source = 'Data source is required';
    }

    if (s === 1) {
      if (!formData.name.trim() || formData.name.trim().length < 2)
        errs.name = 'Full name required (min 2 characters)';
      const phoneErr = validatePakistaniPhone(phone);
      if (!phone) errs.phone = 'Applicant phone number required';
      else if (phoneErr) errs.phone = phoneErr;
      if (!formData.gender)
        errs.gender = 'Gender required';
      if (!formData.photo)
        errs.photo = 'Profile photo required (must show a real face)';
      if (!formData.dateOfBirth) {
        errs.dateOfBirth = 'Date of birth required';
      } else {
        const ageErr = validateAge(formData.dateOfBirth);
        if (ageErr) errs.dateOfBirth = ageErr;
      }
      const heightErr = validateHeight(formData.height);
      if (heightErr) errs.height = heightErr;
      const cnicErr = validateCNIC(formData.cnic);
      if (cnicErr) errs.cnic = cnicErr;
    }

    if (s === 2) {
      if (!formData.education)  errs.education  = 'Education level required';
      if (!formData.profession) errs.profession = 'Profession required';
    }

    if (s === 3) {
      if (!formData.city.trim())  errs.city  = 'City required';
      if (!formData.caste.trim()) errs.caste = 'Caste required';
      const hasSiblings = formData.numBrothers > 0 || formData.numSisters > 0;
      if (hasSiblings && !formData.siblingsMobile)
        errs.siblingsMobile = 'Sibling contact required when siblings > 0';
      if (formData.numMarriedBrothers > formData.numBrothers)
        errs.numMarriedBrothers = `Cannot exceed total brothers (${formData.numBrothers})`;
      if (formData.numMarriedSisters > formData.numSisters)
        errs.numMarriedSisters = `Cannot exceed total sisters (${formData.numSisters})`;
    }

    if (s === 4) {
      const areaErr = validateHouseArea(formData.areaValue);
      if (areaErr) errs.areaValue = areaErr;
    }

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) { scrollToFirstError(); return false; }
    return true;
  };

  // ── Duplicate check ───────────────────────────────────────────────────────────
  const checkDuplicate = async (params: Record<string, string>): Promise<{ field: string; message: string } | null> => {
    try {
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
      const r = await fetch(`${API}/api/profile/check-duplicate?${qs}`, {
        headers: { Authorization: `Bearer ${getToken('staff')}` },
      });
      const d = await r.json();
      if (d.duplicate) return { field: d.field, message: d.message };
    } catch { /* ignore network errors — backend will catch on submit */ }
    return null;
  };

  const handleNext = async () => {
    if (!validateStep(step)) return;

    if (step === 1) {
      const checks: Record<string, string> = {};
      if (phone) checks.phone = phone;
      if (formData.cnic) checks.cnic = formData.cnic;
      if (Object.keys(checks).length > 0) {
        const dup = await checkDuplicate(checks);
        if (dup) {
          setFieldErrors(prev => ({ ...prev, [dup.field]: dup.message }));
          scrollToFirstError();
          return;
        }
      }
    }

    if (step === 3) {
      const checks: Record<string, string> = {};
      if (formData.fatherMobile) checks.fatherMobile = formData.fatherMobile;
      if (formData.motherMobile) checks.motherMobile = formData.motherMobile;
      if (Object.keys(checks).length > 0) {
        const dup = await checkDuplicate(checks);
        if (dup) {
          setFieldErrors(prev => ({ ...prev, [dup.field]: dup.message }));
          scrollToFirstError();
          return;
        }
      }
    }

    setStep(s => Math.min(TOTAL_STEPS, s + 1));
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    const token = getToken('staff');
    if (!token) { setSubmitError('Not authenticated. Please log in.'); return; }

    // Pre-flight duplicate check: phone, CNIC, parent phones, photo
    {
      const checks: Record<string, string> = {};
      if (phone) checks.phone = phone;
      if (formData.cnic) checks.cnic = formData.cnic;
      if (formData.fatherMobile) checks.fatherMobile = formData.fatherMobile;
      if (formData.motherMobile) checks.motherMobile = formData.motherMobile;
      if (formData.photo) checks.photo = formData.photo;
      if (Object.keys(checks).length > 0) {
        const dup = await checkDuplicate(checks);
        if (dup) {
          setSubmitError(dup.message);
          setFieldErrors(prev => ({ ...prev, [dup.field]: dup.message }));
          return;
        }
      }
    }

    setLoading(true);
    setSubmitError(null);
    try {
      const staffUser = JSON.parse(localStorage.getItem('user') || '{}');
      const payload = {
        ...formData,
        // Map field names to match backend create-user endpoint
        phone,
        dob: formData.dateOfBirth,
        income: formData.monthlyIncome,
        email: `${formData.name.toLowerCase().replace(/\s+/g, '.')}@intikhab-offline.pk`,
        // Staff meta
        source:    meta.source,
        notes:     meta.notes,
        enteredBy: staffUser.email || 'staff',
        enteredAt: new Date().toISOString(),
        // profileStatus/profileCompletion/paymentStatus set by backend (auto-approved)
      };

      const res = await fetch(`${API}/api/staff/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as any).message || `Server error ${res.status}`);
      }

      setSuccess(true);
      setMeta(EMPTY_META);
      setPhone('');
      setFormData(EMPTY_PROFILE_FORM('male'));
      setStep(0);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  // ── UI helpers ────────────────────────────────────────────────────────────────
  const _base = 'mt-2 block w-full bg-[#FDF8F3] border-2 rounded-md text-base focus:outline-none focus:border-[#10B981] transition-colors placeholder:text-[#9CA3AF]';
  const ic = (err?: string) =>
    `${_base} min-h-12.5 px-4 py-3 ${err ? 'border-[#EF4444]' : 'border-[#E8DED3]'}`;
  const tc = (err?: string) =>
    `${_base} min-h-30 px-4 py-3 resize-y ${err ? 'border-[#EF4444]' : 'border-[#E8DED3]'}`;
  const lc = 'block text-lg font-bold text-[#1C1917] mb-2';
  const errEl = (msg?: string) => msg
    ? <p className="mt-1.5 text-sm font-semibold text-[#EF4444]">{msg}</p>
    : null;

  const designationSuggestions = formData.profession
    ? (DESIGNATIONS_BY_PROFESSION[formData.profession] ?? GENERIC_DESIGNATIONS)
    : GENERIC_DESIGNATIONS;

  const stepTitle = ['Staff Info', 'Personal Details', 'Education & Employment', 'Family & Residence', 'Home & Requirements'];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#1C1917]">Offline Profile Entry</h1>
        <p className="text-base text-gray-500 mt-1">Register applicants from WhatsApp, paper forms, or walk-ins</p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-base font-medium text-gray-500 mb-2">
          <span>Step {step} of {TOTAL_STEPS}: {stepTitle[step]}</span>
          <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
        </div>
        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-[#10B981] transition-all" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>
      </div>

      {success && (
        <div className="mb-5 p-5 bg-emerald-50 border-2 border-[#10B981] rounded-xl
                        text-[#10B981] text-base font-semibold">
          Profile created successfully — pending approval.
        </div>
      )}
      {submitError && (
        <div className="mb-5 p-5 bg-red-50 border-2 border-[#EF4444] rounded-xl
                        text-[#EF4444] text-base font-semibold">{submitError}</div>
      )}

      <div ref={formRef} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">

        {/* ── STEP 0: Staff Meta ────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#1C1917]">Staff Information</h2>

            <div data-error={fieldErrors.source ? 'true' : undefined}>
              <label className={lc}>Data Source <span className="text-red-500">*</span></label>
              <select
                value={meta.source}
                onChange={e => setMeta(p => ({ ...p, source: e.target.value }))}
                className={ic(fieldErrors.source)}
              >
                <option value="">Select source</option>
                <option value="paper">Paper Form</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="walkin">Walk-In</option>
                <option value="referral">Referral</option>
                <option value="phone">Phone Call</option>
              </select>
              {errEl(fieldErrors.source)}
            </div>

            <div>
              <label className={lc}>Internal Notes (not shown to applicant)</label>
              <textarea
                value={meta.notes}
                onChange={e => setMeta(p => ({ ...p, notes: e.target.value }))}
                className={tc()}
                placeholder="Any relevant context about this submission…"
              />
            </div>
          </div>
        )}

        {/* ── STEP 1: Personal Details (same as wizard step 1) ─────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#1C1917]">Personal Details</h2>

            {/* Name */}
            <div data-error={fieldErrors.name ? 'true' : undefined}>
              <label className={lc}>Full Name <span className="text-red-500">*</span></label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange}
                className={ic(fieldErrors.name)} placeholder="Applicant's full name" />
              {errEl(fieldErrors.name)}
            </div>

            {/* Phone */}
            <div data-error={fieldErrors.phone ? 'true' : undefined}>
              <PhoneInput
                label="Applicant's Mobile Number *"
                value={phone}
                required
                onChange={v => {
                  setPhone(v);
                  if (fieldErrors.phone) setFieldErrors(p => { const n = { ...p }; delete n.phone; return n; });
                }}
                error={fieldErrors.phone}
                helperText="The applicant's own mobile number"
              />
            </div>

            {/* Gender */}
            <div data-error={fieldErrors.gender ? 'true' : undefined}>
              <label className={lc}>Gender *</label>
              <select name="gender" value={formData.gender}
                onChange={e => {
                  const g = e.target.value as 'male' | 'female';
                  setFormData(p => ({
                    ...p, gender: g,
                    acceptMarriedPerson: g === 'female' ? (p.acceptMarriedPerson ?? 'No') : undefined,
                  }));
                }}
                className={ic(fieldErrors.gender)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Determines who this applicant is matched with.</p>
              {errEl(fieldErrors.gender)}
            </div>

            {/* Profile Photo */}
            <div data-error={fieldErrors.photo ? 'true' : undefined}>
              <label className={lc}>Profile Photo <span className="text-red-500">*</span></label>
              <p className="text-xs text-gray-500 mb-2">
                JPEG/PNG/WebP · max 5 MB · min 200×200 px. Must show a real human face.
              </p>
              {errEl(fieldErrors.photo)}

              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                  {formData.photo ? (
                    <img src={formData.photo} alt="Preview" className="w-full h-full object-cover"
                      crossOrigin={formData.photo.includes('cloudinary.com') ? 'anonymous' : undefined} />
                  ) : (
                    <span className="text-gray-400 text-xs text-center px-1">No photo</span>
                  )}
                </div>
                <div className="flex-1">
                  <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    (uploading || checking) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
                  }`}>
                    <input type="file" accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoUpload} disabled={uploading || checking} className="hidden" />
                    {checking ? '🔍 Verifying face…' : uploading ? `⬆ ${progress}%…` : formData.photo ? 'Change Photo' : 'Upload Photo'}
                  </label>
                  {formData.photo && !uploading && !checking && (
                    <button type="button" onClick={handleDeletePhoto}
                      className="ml-2 px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50">
                      Remove
                    </button>
                  )}
                  {(uploading || checking) && (
                    <div className="mt-2 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${checking ? 'bg-blue-400 animate-pulse' : 'bg-green-500'}`}
                        style={{ width: checking ? '100%' : `${progress}%` }} />
                    </div>
                  )}
                  {uploadError && <p className="mt-2 text-xs text-red-600 whitespace-pre-line">{uploadError}</p>}
                  {formData.photo && !uploading && !checking && !uploadError && (
                    <p className="mt-1 text-xs text-green-600 font-medium">✓ Photo verified and uploaded</p>
                  )}
                </div>
              </div>
            </div>

            {/* DOB + Age */}
            <div className="grid grid-cols-2 gap-4">
              <div data-error={fieldErrors.dateOfBirth ? 'true' : undefined}>
                <label className={lc}>Date of Birth *</label>
                <input type="date" value={formData.dateOfBirth} onChange={handleDOBChange}
                  className={ic(fieldErrors.dateOfBirth)} />
                {errEl(fieldErrors.dateOfBirth)}
              </div>
              <div>
                <label className={lc}>Age (auto-calculated)</label>
                <input type="number" value={formData.age > 0 ? formData.age : ''} disabled
                  className="mt-2 block w-full min-h-12.5 px-4 py-3 bg-gray-200 border-2 border-[#E8DED3] rounded-md text-base opacity-70 cursor-not-allowed" />
              </div>
            </div>

            {/* Height + Caste */}
            <div className="grid grid-cols-2 gap-4">
              <div data-error={fieldErrors.height ? 'true' : undefined}>
                <label className={lc}>Height (ft.in)</label>
                <input type="text" name="height" value={formData.height} onChange={handleInputChange}
                  placeholder="e.g., 5.9" className={ic(fieldErrors.height)} />
                {errEl(fieldErrors.height)}
              </div>
              <SearchableSelect label="Caste *" name="caste" value={formData.caste}
                options={CASTES} allowCustom required
                onChange={v => { set('caste', v); if (fieldErrors.caste) setFieldErrors(p => { const n = { ...p }; delete n.caste; return n; }); }}
                placeholder="Search caste…" error={fieldErrors.caste}
                helperText="Type to search. Press Enter for custom value." />
            </div>

            {/* Mother Tongue + Disability */}
            <div className="grid grid-cols-2 gap-4">
              <SearchableSelect label="Mother Tongue" name="motherTongue" value={formData.motherTongue}
                options={LANGUAGES} allowCustom
                onChange={v => set('motherTongue', v)} placeholder="e.g., Urdu, Punjabi…" />
              <div>
                <label className={lc}>Physical Disability</label>
                <select name="disability" value={formData.disability} onChange={handleInputChange} className={ic()}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            </div>

            {/* Religion + Sect */}
            <div className="grid grid-cols-2 gap-4">
              <SearchableSelect label="Religion" name="religion" value={formData.religion}
                options={RELIGIONS} onChange={v => set('religion', v)} />
              <SearchableSelect label="School of Thought / Sect" name="sect" value={formData.sect}
                options={SECTS} allowCustom onChange={v => set('sect', v)} placeholder="Search sect…" />
            </div>

            {/* Prayer + CNIC */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lc}>Prayer Regularity</label>
                <select name="prayerRegularity" value={formData.prayerRegularity}
                  onChange={handleInputChange} className={ic()}>
                  <option value="Regular">Regular</option>
                  <option value="Sometimes">Sometimes</option>
                  <option value="Occasional">Occasional</option>
                </select>
              </div>
              <div data-error={fieldErrors.cnic ? 'true' : undefined}>
                <label className={lc}>CNIC Number</label>
                <input type="text" name="cnic" value={formData.cnic} onChange={handleInputChange}
                  placeholder="e.g., 12345-1234567-1" maxLength={15} className={ic(fieldErrors.cnic)} />
                {errEl(fieldErrors.cnic)}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Education & Employment (same as wizard step 2) ────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#1C1917]">Education & Employment</h2>

            <SearchableSelect label="Educational Qualification *" name="education"
              value={formData.education} options={EDUCATION_LEVELS} required
              onChange={v => { set('education', v); if (fieldErrors.education) setFieldErrors(p => { const n = { ...p }; delete n.education; return n; }); }}
              placeholder="Select education level…" error={fieldErrors.education} />

            <SearchableSelect label="College / University / Institution" name="institution"
              value={formData.institution} options={PAKISTANI_UNIVERSITIES} allowCustom
              onChange={v => set('institution', v)} placeholder="Search institution…"
              helperText="Start typing to search. Select 'Other / Not Listed' if not found." />

            <SearchableSelect label="Profession / Occupation *" name="profession"
              value={formData.profession} options={PROFESSIONS} required
              onChange={v => { set('profession', v); set('designation', ''); if (fieldErrors.profession) setFieldErrors(p => { const n = { ...p }; delete n.profession; return n; }); }}
              placeholder="Search profession…" error={fieldErrors.profession} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lc}>Job Type</label>
                <select name="jobType" value={formData.jobType} onChange={handleInputChange} className={ic()}>
                  <option value="">Select</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Self-employed">Self-employed</option>
                  <option value="Business">Business</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Government">Government</option>
                </select>
              </div>
              <SearchableSelect label="Designation" name="designation" value={formData.designation}
                options={designationSuggestions} allowCustom onChange={v => set('designation', v)}
                placeholder="e.g., Software Engineer" helperText="Suggestions based on profession" />
            </div>

            <div>
              <label className={lc}>Monthly Income Range</label>
              <select name="monthlyIncome" value={formData.monthlyIncome} onChange={handleInputChange} className={ic()}>
                <option value="">Select Range</option>
                {INCOME_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1">Used for compatibility assessment. Not shown publicly.</p>
            </div>

            <SearchableSelect label="Office / Institution Address" name="officeAddress"
              value={formData.officeAddress}
              options={[...ALL_PK_AREAS.map(a => `Office, ${a}`), 'Government Hospital, Lahore', 'Services Hospital, Lahore']}
              allowCustom onChange={v => set('officeAddress', v)}
              placeholder="e.g., Arfa Software Park, Ferozepur Road, Lahore"
              helperText="Leave blank if not applicable." />
          </div>
        )}

        {/* ── STEP 3: Family & Residence (same as wizard step 3) ───────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#1C1917]">Family & Residence</h2>

            <SearchableSelect label="City *" name="city" value={formData.city}
              options={CITIES} allowCustom required
              onChange={v => { set('city', v); if (fieldErrors.city) setFieldErrors(p => { const n = { ...p }; delete n.city; return n; }); }}
              placeholder="Search city…" error={fieldErrors.city}
              helperText="Select current city of residence." />

            <SearchableSelect label="Residential Area" name="address" value={formData.address}
              options={ALL_PK_AREAS} allowCustom onChange={v => set('address', v)}
              placeholder="e.g., DHA Phase 5, Lahore…"
              helperText="Select area or type full address." />

            <div className="border-t pt-4">
              <h3 className="text-xl font-bold text-[#1C1917] mb-4">Parents Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lc}>Father's Name</label>
                  <input type="text" name="fatherName" value={formData.fatherName}
                    onChange={handleInputChange} className={ic()} />
                </div>
                <SearchableSelect label="Father's Occupation" name="fatherOccupation"
                  value={formData.fatherOccupation} options={OCCUPATIONS} allowCustom
                  onChange={v => set('fatherOccupation', v)} placeholder="e.g., Businessman, Retired…" />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className={lc}>Mother's Name</label>
                  <input type="text" name="motherName" value={formData.motherName}
                    onChange={handleInputChange} className={ic()} />
                </div>
                <SearchableSelect label="Mother's Occupation" name="motherOccupation"
                  value={formData.motherOccupation} options={OCCUPATIONS} allowCustom
                  onChange={v => set('motherOccupation', v)} placeholder="e.g., Housewife, Teacher…" />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <PhoneInput label="Father's Mobile" value={formData.fatherMobile}
                  onChange={v => set('fatherMobile', v)} error={fieldErrors.fatherMobile} />
                <PhoneInput label="Mother's Mobile" value={formData.motherMobile}
                  onChange={v => set('motherMobile', v)} error={fieldErrors.motherMobile} />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-xl font-bold text-[#1C1917] mb-4">Siblings Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lc}>Total Brothers</label>
                  <input type="number" min="0" value={formData.numBrothers}
                    onChange={e => handleNumberChange('numBrothers', parseInt(e.target.value) || 0)}
                    className={ic()} />
                </div>
                <div>
                  <label className={lc}>Married Brothers</label>
                  <input type="number" min="0" value={formData.numMarriedBrothers}
                    data-error={fieldErrors.numMarriedBrothers ? 'true' : undefined}
                    onChange={e => handleNumberChange('numMarriedBrothers', parseInt(e.target.value) || 0)}
                    className={ic(fieldErrors.numMarriedBrothers)} />
                  {errEl(fieldErrors.numMarriedBrothers)}
                </div>
                <div>
                  <label className={lc}>Total Sisters</label>
                  <input type="number" min="0" value={formData.numSisters}
                    onChange={e => handleNumberChange('numSisters', parseInt(e.target.value) || 0)}
                    className={ic()} />
                </div>
                <div>
                  <label className={lc}>Married Sisters</label>
                  <input type="number" min="0" value={formData.numMarriedSisters}
                    data-error={fieldErrors.numMarriedSisters ? 'true' : undefined}
                    onChange={e => handleNumberChange('numMarriedSisters', parseInt(e.target.value) || 0)}
                    className={ic(fieldErrors.numMarriedSisters)} />
                  {errEl(fieldErrors.numMarriedSisters)}
                </div>
              </div>

              {/* Sibling contact — only when siblings > 0 (same conditional as wizard) */}
              {(formData.numBrothers > 0 || formData.numSisters > 0) && (
                <div className="mt-4" data-error={fieldErrors.siblingsMobile ? 'true' : undefined}>
                  <PhoneInput label="Sibling's Mobile" value={formData.siblingsMobile} required
                    onChange={v => { set('siblingsMobile', v); if (fieldErrors.siblingsMobile) setFieldErrors(p => { const n = { ...p }; delete n.siblingsMobile; return n; }); }}
                    error={fieldErrors.siblingsMobile} helperText="Required when siblings > 0" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 4: Home & Requirements (same as wizard step 4) ──────────── */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#1C1917]">Home & Requirements</h2>

            <div className="border-t pt-4">
              <h3 className="text-xl font-bold text-[#1C1917] mb-4">House Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lc}>Home Status</label>
                  <select name="homeOwnership" value={formData.homeOwnership}
                    onChange={handleInputChange} className={ic()}>
                    <option value="owned">Owned</option>
                    <option value="rented">Rented</option>
                  </select>
                </div>
                <div>
                  <label className={lc}>Size Unit</label>
                  <select name="homeSize" value={formData.homeSize} onChange={handleInputChange} className={ic()}>
                    <option value="kanal">Kanal</option>
                    <option value="marla">Marla</option>
                    <option value="sqft">Sq Ft</option>
                  </select>
                </div>
              </div>
              <div className="mt-4" data-error={fieldErrors.areaValue ? 'true' : undefined}>
                <label className={lc}>Area Value</label>
                <input type="number" name="areaValue" value={formData.areaValue || ''}
                  onChange={e => handleNumberChange('areaValue', parseInt(e.target.value) || 0)}
                  placeholder="e.g., 2500" className={ic(fieldErrors.areaValue)} />
                {errEl(fieldErrors.areaValue)}
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-xl font-bold text-[#1C1917] mb-4">Match Requirements</h3>
              <div>
                <label className={lc}>Desired Criteria for Match</label>
                <textarea name="matchCriteria" value={formData.matchCriteria} onChange={handleInputChange}
                  placeholder="e.g., Educated, caring, family-oriented…" className={tc()} />
              </div>
              <div className="mt-4">
                <label className={lc}>Desired Match Details</label>
                <textarea name="desiredMatchDetails" value={formData.desiredMatchDetails}
                  onChange={handleInputChange} placeholder="Additional preferences…" className={tc()} />
              </div>

              {/* Female-only field (same conditional as wizard) */}
              {formData.gender === 'female' && (
                <div className="mt-4">
                  <label className={lc}>Is Married Person Acceptable?</label>
                  <select name="acceptMarriedPerson"
                    value={formData.acceptMarriedPerson || 'No'} onChange={handleInputChange} className={ic()}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="text-xl font-bold text-[#1C1917] mb-4">Reference</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lc}>Reference Name</label>
                  <input type="text" name="reference" value={formData.reference}
                    onChange={handleInputChange} placeholder="Referral name or contact" className={ic()} />
                </div>
                <div>
                  <label className={lc}>Relation / Organization</label>
                  <input type="text" name="referenceRelation" value={formData.referenceRelation}
                    onChange={handleInputChange} placeholder="e.g., Family friend, organization" className={ic()} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between gap-4">
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="min-h-12.5 px-8 rounded-xl border-2 border-gray-200 text-base font-bold
                     text-[#1C1917] bg-white hover:bg-[#FDF8F3] transition-colors disabled:opacity-50"
        >
          Previous
        </button>
        {step < TOTAL_STEPS ? (
          <button
            onClick={handleNext}
            className="min-h-12.5 px-8 rounded-xl bg-[#10B981] hover:bg-[#059669]
                       text-white text-base font-bold transition-colors"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="min-h-12.5 px-8 rounded-xl bg-[#10B981] hover:bg-[#059669]
                       text-white text-base font-bold transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating Profile…' : 'Create Profile'}
          </button>
        )}
      </div>
    </div>
  );
}
