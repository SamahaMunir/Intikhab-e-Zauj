import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { useCloudinaryUpload, resetFaceDetection } from '@/hooks/useCloudinaryUpload';
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
} from '@/lib/profile-validation';

const DRAFT_KEY = 'profile_wizard_draft';
const API = 'http://localhost:5000';

interface ProfileFormData {
  name: string;
  dateOfBirth: string;
  age: number;
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
  siblingDisability: string;
  homeOwnership: string;
  homeSize: string;
  areaValue: number;
  matchCriteria: string;
  desiredMatchDetails: string;
  reference: string;
  referenceRelation: string;
  acceptMarriedPerson?: string;
  gender: 'male' | 'female';
  photo: string;
}

const EMPTY_FORM = (gender: 'male' | 'female', name: string): ProfileFormData => ({
  name,
  dateOfBirth: '', age: 0, height: '', caste: '', motherTongue: '', disability: 'No',
  religion: 'Islam', sect: '', prayerRegularity: 'Regular', cnic: '', education: '',
  institution: '', profession: '', jobType: '', designation: '', monthlyIncome: '',
  officeAddress: '', city: '', address: '', fatherName: '', fatherOccupation: '',
  motherName: '', motherOccupation: '', fatherMobile: '', motherMobile: '',
  siblingsMobile: '', numBrothers: 0, numMarriedBrothers: 0, numSisters: 0,
  numMarriedSisters: 0, employedSiblingsDetails: '', siblingDisability: 'No',
  homeOwnership: 'owned', homeSize: 'kanal', areaValue: 0, matchCriteria: '',
  desiredMatchDetails: '', reference: '', referenceRelation: '',
  acceptMarriedPerson: gender === 'female' ? 'No' : undefined, gender, photo: '',
});

export default function ProfileWizard() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const {
    uploadProfilePhoto, uploading, checking, error: uploadError, progress,
    isFaceDetectionSupported,
  } = useCloudinaryUpload();
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToFirstError = () => {
    setTimeout(() => {
      const el = formRef.current?.querySelector('[data-error="true"]') as HTMLElement | null;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const userGender: 'male' | 'female' =
    user?.gender === 'male' || user?.gender === 'female' ? user.gender : 'male';

  const [formData, setFormData] = useState<ProfileFormData>(
    EMPTY_FORM(userGender, user?.name || '')
  );

  // ── Load saved profile on mount ───────────────────────────────────────────
  // Priority: API (DB) > localStorage draft > empty defaults
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user?._id) {
      // Try draft
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        try { setFormData(JSON.parse(draft)); } catch {}
      }
      setProfileLoading(false);
      return;
    }

    console.log('[Wizard] Fetching saved profile from API…');

    fetch(`${API}/api/profile/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then(r => {
        console.log(`[Wizard] /api/profile/me → ${r.status}`);
        if (r.status === 401) {
          // Token invalid or expired — clear session and continue without pre-fill
          console.warn('[Wizard] Token rejected (401). User may need to re-login.');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // Don't redirect here — let user complete the wizard, they can log in again after
          // Fall through to draft loading
          const draft = localStorage.getItem(DRAFT_KEY);
          if (draft) { try { setFormData(JSON.parse(draft)); } catch {} }
          setProfileLoading(false);
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        if (data?.profile) {
          const p = data.profile;
          // Map DB fields → form fields
          const merged: ProfileFormData = {
            name: p.name || user?.name || '',
            dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split('T')[0] : '',
            age: p.age || 0,
            height: p.height || '',
            caste: p.caste || '',
            motherTongue: p.motherTongue || '',
            disability: p.disability || 'No',
            religion: p.religion || 'Islam',
            sect: p.sect || '',
            prayerRegularity: p.prayerRegularity || 'Regular',
            cnic: p.cnic || '',
            education: p.education || '',
            institution: p.institution || '',
            profession: p.profession || '',
            jobType: p.jobType || '',
            designation: p.designation || '',
            monthlyIncome: p.monthlyIncome || '',
            officeAddress: p.officeAddress || '',
            city: p.city || '',
            address: p.address || '',
            fatherName: p.fatherName || '',
            fatherOccupation: p.fatherOccupation || '',
            motherName: p.motherName || '',
            motherOccupation: p.motherOccupation || '',
            fatherMobile: p.fatherMobile || '',
            motherMobile: p.motherMobile || '',
            siblingsMobile: p.siblingsMobile || '',
            numBrothers: p.numBrothers || 0,
            numMarriedBrothers: p.numMarriedBrothers || 0,
            numSisters: p.numSisters || 0,
            numMarriedSisters: p.numMarriedSisters || 0,
            employedSiblingsDetails: p.employedSiblingsDetails || '',
            siblingDisability: p.siblingDisability || 'No',
            homeOwnership: p.homeOwnership || 'owned',
            homeSize: p.homeSize || 'kanal',
            areaValue: p.areaValue || 0,
            matchCriteria: p.matchCriteria || '',
            desiredMatchDetails: p.desiredMatchDetails || '',
            reference: p.reference || '',
            referenceRelation: p.referenceRelation || '',
            acceptMarriedPerson: p.acceptMarriedPerson || (p.gender === 'female' ? 'No' : undefined),
            gender: (p.gender === 'male' || p.gender === 'female') ? p.gender : userGender,
            photo: p.photo || '',
          };
          setFormData(merged);
          // Clear draft once DB data is loaded
          localStorage.removeItem(DRAFT_KEY);
        } else {
          // Fall back to draft if no DB data yet
          const draft = localStorage.getItem(DRAFT_KEY);
          if (draft) {
            try { setFormData(JSON.parse(draft)); } catch {}
          }
        }
      })
      .catch(() => {
        // Network error — try draft
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
          try { setFormData(JSON.parse(draft)); } catch {}
        }
      })
      .finally(() => setProfileLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-save draft to localStorage on every formData change ──────────────
  // Prevents data loss on accidental refresh
  const saveDraft = useCallback((data: ProfileFormData) => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch {}
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Auto-format CNIC as user types
    const formatted = name === 'cnic' ? formatCNIC(value) : value;
    setFormData((prev) => {
      const next = { ...prev, [name]: formatted };
      saveDraft(next);
      return next;
    });
    // Clear field error on change
    if (fieldErrors[name]) setFieldErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  // Guard: parseInt('') = NaN — fallback to 0, never store NaN in state
  const handleNumberChange = (name: string, value: number) => {
    const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
    setFormData((prev) => {
      const next = { ...prev, [name]: safe };
      saveDraft(next);
      return next;
    });
  };

  const handleDOBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dob = e.target.value;
    const age = calculateAge(dob);
    const ageErr = validateAge(dob);
    if (ageErr) setFieldErrors(prev => ({ ...prev, dateOfBirth: ageErr }));
    else setFieldErrors(prev => { const n = { ...prev }; delete n.dateOfBirth; return n; });
    setFormData((prev) => {
      const next = { ...prev, dateOfBirth: dob, age };
      saveDraft(next);
      return next;
    });
  };

  const handleDeletePhoto = () => {
    setFormData((prev) => {
      const next = { ...prev, photo: '' };
      saveDraft(next);
      return next;
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-tried after error
    e.target.value = '';
    setError(null);
    // Allow fresh model-load attempt on each file pick (handles transient CDN failures)
    resetFaceDetection();

    const result = await uploadProfilePhoto(file);
    if (result?.url) {
      setFormData((prev) => {
        const next = { ...prev, photo: result.url };
        saveDraft(next);
        return next;
      });
      setFieldErrors(prev => { const n = { ...prev }; delete n.photo; return n; });
      // Immediately check if this Cloudinary URL is already in use by another profile
      try {
        const excludeId = user?._id ? `&excludeId=${encodeURIComponent(user._id)}` : '';
        const r = await fetch(`${API}/api/profile/check-duplicate?photo=${encodeURIComponent(result.url)}${excludeId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        });
        const d = await r.json();
        if (d.duplicate) {
          setFieldErrors(prev => ({ ...prev, photo: d.message }));
        }
      } catch { /* ignore */ }
    }
    // uploadError from the hook is displayed directly in the photo section
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!formData.name || !formData.caste || !formData.city || !formData.profession) {
        setError('Please fill all required fields: name, caste, city, profession.');
        return;
      }
      if (!formData.photo) {
        setError('Profile photo is required. Please upload a photo in Step 1.');
        setStep(1);
        return;
      }
      if (!formData.gender) {
        setError('Gender is required. Please select your gender in Step 1.');
        setStep(1);
        return;
      }

      // Pre-submit duplicate check: CNIC + photo + parent phones
      {
        const checks: Record<string, string> = {};
        if (formData.cnic) checks.cnic = formData.cnic;
        if (formData.photo) checks.photo = formData.photo;
        if (formData.fatherMobile) checks.fatherMobile = formData.fatherMobile;
        if (formData.motherMobile) checks.motherMobile = formData.motherMobile;
        if (Object.keys(checks).length > 0) {
          const dup = await checkDuplicate(checks);
          if (dup) {
            setError(dup.message);
            if (dup.field === 'cnic' || dup.field === 'photo') setStep(1);
            else setStep(3);
            setFieldErrors(prev => ({ ...prev, [dup.field]: dup.message }));
            return;
          }
        }
      }

      // Phone fields are already stored as +CC digits (set by PhoneInput onChange)
      const payload = {
        ...formData,
        _id: user._id,
        email: user.email,
      };

      const response = await fetch('http://localhost:5000/api/profile/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      const result = await response.json();
      console.log('✅ Profile saved:', result);

      // Update localStorage so matches page sees profileCompletion=100 immediately
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        u.profileCompletion = 100;
        u.profileStatus = 'pending';
        if (formData.gender) u.gender = formData.gender;
        localStorage.setItem('user', JSON.stringify(u));
      }

      // Draft no longer needed — profile is saved to DB
      localStorage.removeItem(DRAFT_KEY);

      setLocation('/app/matches');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving profile');
      console.error('Profile save error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Personal Details</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700">Full Name <span className="text-red-500">*</span></label>
        <input type="text" name="name" value={formData.name} onChange={handleInputChange}
          data-error={fieldErrors.name ? 'true' : undefined}
          className={`mt-1 block w-full px-3 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500 ${fieldErrors.name ? 'border-red-400' : 'border-gray-300'}`}
          placeholder="Your full name (e.g. Ahmad Ali)" />
        {fieldErrors.name && <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>}
      </div>
      {/* Gender — explicit required field, never inferred silently */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Gender *</label>
        <select
          name="gender"
          value={formData.gender}
          onChange={handleInputChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Determines who you are matched with. Male → sees females. Female → sees males.</p>
      </div>

      {/* Profile Photo — required for matching */}
      <div data-error={fieldErrors.photo ? 'true' : undefined}>
        <label className="block text-sm font-medium text-gray-700">
          Profile Photo <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Required. JPEG/PNG/WebP · max 5 MB · min 200×200 px.
          Must show a real human face. Certificates, logos, screenshots, and objects are rejected.
        </p>

        {/* face-api.js works in all browsers — no browser restriction */}

        {fieldErrors.photo && (
          <p className="text-xs text-red-600 mb-2 font-medium" data-error="true">{fieldErrors.photo}</p>
        )}

        <div className="flex items-start gap-4">
          {/* Preview */}
          <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
            {formData.photo ? (
              <img
                src={formData.photo}
                alt="Profile preview"
                crossOrigin="anonymous"
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <span className="text-gray-400 text-xs text-center px-1">No photo</span>
            )}
          </div>

          <div className="flex-1">
            {/* Upload button — disabled when browser unsupported or uploading */}
            <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              uploading || checking
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
            }`}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                disabled={uploading || checking}
                className="hidden"
              />
              {checking
                ? '🔍 Verifying face…'
                : uploading
                ? `⬆ Uploading ${progress}%…`
                : formData.photo
                ? 'Change Photo'
                : 'Upload Photo'}
            </label>

            {/* Remove button */}
            {formData.photo && !uploading && !checking && (
              <button
                type="button"
                onClick={handleDeletePhoto}
                className="ml-2 px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                Remove
              </button>
            )}

            {/* Progress bar */}
            {(uploading || checking) && (
              <div className="mt-2 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${checking ? 'bg-blue-400 animate-pulse' : 'bg-green-500'}`}
                  style={{ width: checking ? '100%' : `${progress}%` }}
                />
              </div>
            )}

            {/* Upload/check error from hook */}
            {uploadError && (
              <p className="mt-2 text-xs text-red-600 whitespace-pre-line leading-relaxed">{uploadError}</p>
            )}

            {/* Success */}
            {formData.photo && !uploading && !checking && !uploadError && (
              <p className="mt-1 text-xs text-green-600 font-medium">✓ Photo verified and uploaded</p>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Date of Birth *</label>
          <input type="date" value={formData.dateOfBirth} onChange={handleDOBChange}
            className={`mt-1 block w-full px-3 py-2 border rounded-lg ${fieldErrors.dateOfBirth ? 'border-red-400' : 'border-gray-300'}`} />
          {fieldErrors.dateOfBirth && <p className="text-xs text-red-600 mt-1">{fieldErrors.dateOfBirth}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Age (Auto)</label>
          <input type="number" value={Number.isFinite(formData.age) && formData.age > 0 ? formData.age : ''} disabled className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Height (ft.in) *</label>
          <input type="text" name="height" value={formData.height} onChange={handleInputChange} placeholder="e.g., 5.9" className={`mt-1 block w-full px-3 py-2 border rounded-lg ${fieldErrors.height ? 'border-red-400' : 'border-gray-300'}`} />
          {fieldErrors.height && <p className="text-xs text-red-600 mt-1">{fieldErrors.height}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Caste *</label>
          <SearchableSelect
            label="Caste *" name="caste" value={formData.caste}
            options={CASTES} allowCustom
            onChange={v => { setFormData(p => { const n = { ...p, caste: v }; saveDraft(n); return n; }); }}
            placeholder="Search caste…" required error={fieldErrors.caste}
            helperText="Type to search. If not found, type and press Enter."
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <SearchableSelect
            label="Mother Tongue" name="motherTongue" value={formData.motherTongue}
            options={LANGUAGES} allowCustom
            onChange={v => { setFormData(p => { const n = { ...p, motherTongue: v }; saveDraft(n); return n; }); }}
            placeholder="e.g., Urdu, Punjabi…"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Physical Disability</label>
          <select name="disability" value={formData.disability} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg">
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <SearchableSelect
            label="Religion" name="religion" value={formData.religion}
            options={RELIGIONS}
            onChange={v => { setFormData(p => { const n = { ...p, religion: v }; saveDraft(n); return n; }); }}
          />
        </div>
        <div>
          <SearchableSelect
            label="School of Thought / Sect" name="sect" value={formData.sect}
            options={SECTS} allowCustom
            onChange={v => { setFormData(p => { const n = { ...p, sect: v }; saveDraft(n); return n; }); }}
            placeholder="Search sect…"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Prayer Regularity</label>
          <select name="prayerRegularity" value={formData.prayerRegularity} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg">
            <option value="Regular">Regular</option>
            <option value="Sometimes">Sometimes</option>
            <option value="Occasional">Occasional</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">CNIC Number</label>
          <input type="text" name="cnic" value={formData.cnic} onChange={handleInputChange} placeholder="e.g., 12345-1234567-1" maxLength={15}
            className={`mt-1 block w-full px-3 py-2 border rounded-lg ${fieldErrors.cnic ? 'border-red-400' : 'border-gray-300'}`} />
          {fieldErrors.cnic && <p className="text-xs text-red-600 mt-1">{fieldErrors.cnic}</p>}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const designationSuggestions = formData.profession
      ? (DESIGNATIONS_BY_PROFESSION[formData.profession] ?? GENERIC_DESIGNATIONS)
      : GENERIC_DESIGNATIONS;

    return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Education & Employment</h2>

      <SearchableSelect
        label="Educational Qualification *" name="education" value={formData.education}
        options={EDUCATION_LEVELS} required
        onChange={v => { setFormData(p => { const n = { ...p, education: v }; saveDraft(n); return n; }); }}
        placeholder="Select education level…"
        error={fieldErrors.education}
      />

      <SearchableSelect
        label="College / University / Institution" name="institution" value={formData.institution}
        options={PAKISTANI_UNIVERSITIES} allowCustom
        onChange={v => { setFormData(p => { const n = { ...p, institution: v }; saveDraft(n); return n; }); }}
        placeholder="Search institution…"
        helperText="Start typing to search. Select 'Other / Not Listed' if not found."
      />

      <SearchableSelect
        label="Profession / Occupation *" name="profession" value={formData.profession}
        options={PROFESSIONS} required
        onChange={v => { setFormData(p => { const n = { ...p, profession: v, designation: '' }; saveDraft(n); return n; }); }}
        placeholder="Search profession…" error={fieldErrors.profession}
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Job Type</label>
          <select name="jobType" value={formData.jobType} onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">Select</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Self-employed">Self-employed</option>
            <option value="Business">Business</option>
            <option value="Freelance">Freelance</option>
            <option value="Government">Government</option>
          </select>
        </div>
        <div>
          <SearchableSelect
            label="Designation" name="designation" value={formData.designation}
            options={designationSuggestions} allowCustom
            onChange={v => { setFormData(p => { const n = { ...p, designation: v }; saveDraft(n); return n; }); }}
            placeholder="e.g., Software Engineer"
            helperText="Suggestions based on profession"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Monthly Income Range</label>
        <select name="monthlyIncome" value={formData.monthlyIncome} onChange={handleInputChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">Select Range</option>
          {INCOME_RANGES.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">Used for compatibility assessment. Not shown publicly.</p>
      </div>

      <SearchableSelect
        label="Office / Institution Address" name="officeAddress" value={formData.officeAddress}
        options={[
          'Arfa Software Technology Park, Ferozepur Road, Lahore',
          'NUST, Islamabad', 'LUMS, DHA, Lahore', 'UET, G.T Road, Lahore',
          'Government Hospital, Lahore', 'Shaukat Khanum Memorial Cancer Hospital, Lahore',
          'Services Hospital, Lahore', 'Pakistan Institute of Medical Sciences, Islamabad',
          'National Database and Registration Authority (NADRA), Islamabad',
          'Securities and Exchange Commission of Pakistan (SECP), Islamabad',
          'State Bank of Pakistan, Karachi', 'Habib Bank (HBL), Karachi',
          ...ALL_PK_AREAS.map(a => `Office, ${a}`),
        ]} allowCustom
        onChange={v => { setFormData(p => { const n = { ...p, officeAddress: v }; saveDraft(n); return n; }); }}
        placeholder="e.g., Arfa Software Park, Ferozepur Road, Lahore"
        helperText="Start typing office name or area. Leave blank if not applicable."
      />
    </div>
  );
  };

  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Family & Residence</h2>

      <SearchableSelect
        label="City *" name="city" value={formData.city}
        options={CITIES} allowCustom required
        onChange={v => { setFormData(p => { const n = { ...p, city: v }; saveDraft(n); return n; }); }}
        placeholder="Search city…" error={fieldErrors.city}
        helperText="Select your current city of residence."
      />

      <SearchableSelect
        label="Residential Area" name="address" value={formData.address}
        options={ALL_PK_AREAS} allowCustom
        onChange={v => { setFormData(p => { const n = { ...p, address: v }; saveDraft(n); return n; }); }}
        placeholder="e.g., DHA Phase 5, Lahore…"
        helperText="Select your area or type your full address (e.g. House 12, Block C, Johar Town, Lahore)"
      />
      <div className="border-t pt-4">
        <h3 className="font-semibold text-gray-900 mb-4">Parents Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Father's Name</label>
            <input type="text" name="fatherName" value={formData.fatherName} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <SearchableSelect
              label="Father's Occupation" name="fatherOccupation" value={formData.fatherOccupation}
              options={OCCUPATIONS} allowCustom
              onChange={v => { setFormData(p => { const n = { ...p, fatherOccupation: v }; saveDraft(n); return n; }); }}
              placeholder="e.g., Businessman, Retired…"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Mother's Name</label>
            <input type="text" name="motherName" value={formData.motherName} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <SearchableSelect
              label="Mother's Occupation" name="motherOccupation" value={formData.motherOccupation}
              options={OCCUPATIONS} allowCustom
              onChange={v => { setFormData(p => { const n = { ...p, motherOccupation: v }; saveDraft(n); return n; }); }}
              placeholder="e.g., Housewife, Teacher…"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <PhoneInput
            label="Father's Mobile"
            value={formData.fatherMobile}
            onChange={(normalized) => { setFormData(p => { const n = { ...p, fatherMobile: normalized }; saveDraft(n); return n; }); }}
            error={fieldErrors.fatherMobile}
          />
          <PhoneInput
            label="Mother's Mobile"
            value={formData.motherMobile}
            onChange={(normalized) => { setFormData(p => { const n = { ...p, motherMobile: normalized }; saveDraft(n); return n; }); }}
            error={fieldErrors.motherMobile}
          />
        </div>
      </div>
      <div className="border-t pt-4">
        <h3 className="font-semibold text-gray-900 mb-4">Siblings Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Brothers</label>
            <input type="number" min="0" value={formData.numBrothers} onChange={(e) => handleNumberChange('numBrothers', parseInt(e.target.value) || 0)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Married Brothers</label>
            <input type="number" min="0" value={formData.numMarriedBrothers} onChange={(e) => handleNumberChange('numMarriedBrothers', parseInt(e.target.value) || 0)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Sisters</label>
            <input type="number" min="0" value={formData.numSisters} onChange={(e) => handleNumberChange('numSisters', parseInt(e.target.value) || 0)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Married Sisters</label>
            <input type="number" min="0" value={formData.numMarriedSisters} onChange={(e) => handleNumberChange('numMarriedSisters', parseInt(e.target.value) || 0)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
        </div>
        {/* Sibling contact — only shown (and required) when siblings > 0 */}
        {(formData.numBrothers > 0 || formData.numSisters > 0) && (
          <div className="mt-4" data-error={fieldErrors.siblingsMobile ? 'true' : undefined}>
            <PhoneInput
              label="Sibling's Mobile"
              value={formData.siblingsMobile}
              required
              onChange={(normalized) => { setFormData(p => { const n = { ...p, siblingsMobile: normalized }; saveDraft(n); return n; }); }}
              error={fieldErrors.siblingsMobile}
              helperText="Required when you have brothers or sisters"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Home & Requirements</h2>
      <div className="border-t pt-4">
        <h3 className="font-semibold text-gray-900 mb-4">House Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Home Status</label>
            <select name="homeOwnership" value={formData.homeOwnership} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="owned">Owned</option>
              <option value="rented">Rented</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Size Unit</label>
            <select name="homeSize" value={formData.homeSize} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="kanal">Kanal</option>
              <option value="marla">Marla</option>
              <option value="sqft">Sq Ft</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Area Value</label>
          <input type="number" name="areaValue" value={formData.areaValue || ''} onChange={(e) => handleNumberChange('areaValue', parseInt(e.target.value) || 0)} placeholder="e.g., 2500"
            className={`mt-1 block w-full px-3 py-2 border rounded-lg ${fieldErrors.areaValue ? 'border-red-400' : 'border-gray-300'}`} />
          {fieldErrors.areaValue && <p className="text-xs text-red-600 mt-1">{fieldErrors.areaValue}</p>}
        </div>
      </div>
      <div className="border-t pt-4">
        <h3 className="font-semibold text-gray-900 mb-4">Match Requirements</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">Desired Criteria for Match</label>
          <textarea name="matchCriteria" value={formData.matchCriteria} onChange={handleInputChange} rows={3} placeholder="e.g., Educated, caring, family-oriented..." className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Desired Match Details</label>
          <textarea name="desiredMatchDetails" value={formData.desiredMatchDetails} onChange={handleInputChange} rows={3} placeholder="Additional preferences..." className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        {formData.gender === 'female' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Is Married Person Acceptable?</label>
            <select name="acceptMarriedPerson" value={formData.acceptMarriedPerson || 'No'} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
        )}
      </div>
      <div className="border-t pt-4">
        <h3 className="font-semibold text-gray-900 mb-4">Reference</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">Reference Name</label>
          <input type="text" name="reference" value={formData.reference} onChange={handleInputChange} placeholder="Referral name or contact" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Relation / Organization</label>
          <input type="text" name="referenceRelation" value={formData.referenceRelation} onChange={handleInputChange} placeholder="e.g., Family friend, colleague, organization name" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>
    </div>
  );

  // ── Per-step validation before advancing ──────────────────────────────────
  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};

    if (s === 1) {
      if (!formData.name.trim() || formData.name.trim().length < 2)
        errs.name = 'Full name is required (min 2 characters)';
      if (!formData.gender)
        errs.gender = 'Please select your gender';
      if (!formData.photo)
        errs.photo = 'Profile photo is required before proceeding';
      if (!formData.dateOfBirth) {
        errs.dateOfBirth = 'Date of birth is required';
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
      if (!formData.education)
        errs.education = 'Education level is required';
      if (!formData.profession)
        errs.profession = 'Profession is required';
    }

    if (s === 3) {
      if (!formData.city.trim())
        errs.city = 'City is required';
      if (!formData.caste.trim())
        errs.caste = 'Caste is required';
      // Conditional: siblings mobile required only if there are siblings
      const hasSiblings = formData.numBrothers > 0 || formData.numSisters > 0;
      if (hasSiblings && !formData.siblingsMobile) {
        errs.siblingsMobile = 'Please provide a sibling contact number';
      }
      // Married counts must not exceed total counts
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
    if (Object.keys(errs).length > 0) {
      scrollToFirstError();
      return false;
    }
    return true;
  };

  const checkDuplicate = async (params: Record<string, string>): Promise<{ field: string; message: string } | null> => {
    try {
      const excludeId = user?._id ? `&excludeId=${encodeURIComponent(user._id)}` : '';
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
      const r = await fetch(`${API}/api/profile/check-duplicate?${qs}${excludeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      const d = await r.json();
      if (d.duplicate) return { field: d.field, message: d.message };
    } catch { /* network errors caught by backend on submit */ }
    return null;
  };

  const handleNext = async () => {
    if (!validateStep(step)) return;

    if (step === 1) {
      const checks: Record<string, string> = {};
      if (formData.cnic) checks.cnic = formData.cnic;
      if (formData.photo) checks.photo = formData.photo;
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

    setStep(s => Math.min(totalSteps, s + 1));
  };

  const totalSteps = 4;

  // Show spinner while loading saved profile data
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-gray-200 border-t-green-600 rounded-full mx-auto mb-3" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Profile</h1>
          <p className="text-gray-600 mt-2">Step {step} of {totalSteps}</p>
        </div>
        <div className="mb-8 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-green-600 transition-all" style={{ width: `${(step / totalSteps) * 100}%` }} />
        </div>
        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error}</div>}
        <div ref={formRef} className="bg-white p-8 rounded-lg shadow-md">{step === 1 && renderStep1()}{step === 2 && renderStep2()}{step === 3 && renderStep3()}{step === 4 && renderStep4()}</div>
        <div className="mt-8 flex justify-between gap-4">
          <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">Previous</button>
          {step < totalSteps ? (
            <button onClick={handleNext} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Next</button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">{loading ? 'Saving...' : 'Complete Profile'}</button>
          )}
        </div>
      </div>
    </div>
  );
}