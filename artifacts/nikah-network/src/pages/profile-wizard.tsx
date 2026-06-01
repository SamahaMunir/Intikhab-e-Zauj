import { useState } from 'react';
import { useLocation } from 'wouter';

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
}

export default function ProfileWizard() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  // Never silently default gender — missing gender must be set explicitly in Step 1
  const userGender: 'male' | 'female' = (user?.gender === 'male' || user?.gender === 'female')
    ? user.gender
    : 'male'; // fallback only if localStorage has valid gender; Step 1 forces explicit selection

  const [formData, setFormData] = useState<ProfileFormData>({
    name: user?.name || '',
    dateOfBirth: '',
    age: 0,
    height: '',
    caste: '',
    motherTongue: '',
    disability: 'No',
    religion: 'Islam',
    sect: '',
    prayerRegularity: 'Regular',
    cnic: '',
    education: '',
    institution: '',
    profession: '',
    jobType: '',
    designation: '',
    monthlyIncome: '',
    officeAddress: '',
    city: '',
    address: '',
    fatherName: '',
    fatherOccupation: '',
    motherName: '',
    motherOccupation: '',
    fatherMobile: '',
    motherMobile: '',
    siblingsMobile: '',
    numBrothers: 0,
    numMarriedBrothers: 0,
    numSisters: 0,
    numMarriedSisters: 0,
    employedSiblingsDetails: '',
    siblingDisability: 'No',
    homeOwnership: 'owned',
    homeSize: 'kanal',
    areaValue: 0,
    matchCriteria: '',
    desiredMatchDetails: '',
    reference: '',
    referenceRelation: '',
    acceptMarriedPerson: userGender === 'female' ? 'No' : undefined,
    gender: userGender as 'male' | 'female',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Guard: parseInt('') = NaN — fallback to 0, never store NaN in state
  const handleNumberChange = (name: string, value: number) => {
    const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
    setFormData((prev) => ({ ...prev, [name]: safe }));
  };

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    // Guard: invalid date string produces NaN timestamp
    if (isNaN(birthDate.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return Math.max(0, age);
  };

  const handleDOBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dob = e.target.value;
    const age = calculateAge(dob);
    setFormData((prev) => ({ ...prev, dateOfBirth: dob, age }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!formData.name || !formData.caste || !formData.city || !formData.profession) {
        setError('Please fill all required fields');
        return;
      }

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
        <label className="block text-sm font-medium text-gray-700">Name *</label>
        <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500" placeholder="Your full name" />
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
        <p className="text-xs text-gray-500 mt-1">This determines who you are matched with. Male users see female profiles; female users see male profiles.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Date of Birth *</label>
          <input type="date" value={formData.dateOfBirth} onChange={handleDOBChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Age (Auto)</label>
          <input type="number" value={Number.isFinite(formData.age) && formData.age > 0 ? formData.age : ''} disabled className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Height (ft.in) *</label>
          <input type="text" name="height" value={formData.height} onChange={handleInputChange} placeholder="e.g., 5.9" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Caste *</label>
          <input type="text" name="caste" value={formData.caste} onChange={handleInputChange} placeholder="e.g., Sheikh, Syed, Awan" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Mother Tongue</label>
          <input type="text" name="motherTongue" value={formData.motherTongue} onChange={handleInputChange} placeholder="e.g., Urdu, Punjabi" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
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
          <label className="block text-sm font-medium text-gray-700">Religion</label>
          <select name="religion" value={formData.religion} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg">
            <option value="Islam">Islam</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">School of Thought / Sect</label>
          <input type="text" name="sect" value={formData.sect} onChange={handleInputChange} placeholder="e.g., Sunni, Shia" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
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
          <input type="text" name="cnic" value={formData.cnic} onChange={handleInputChange} placeholder="e.g., 12345-1234567-1" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Education & Employment</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700">Educational Qualification *</label>
        <select name="education" value={formData.education} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">Select Education</option>
          <option value="Matric">Matric</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Bachelors">Bachelors</option>
          <option value="Masters">Masters</option>
          <option value="PhD">PhD</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">College/University</label>
        <input type="text" name="institution" value={formData.institution} onChange={handleInputChange} placeholder="Name of institution" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Profession/Occupation *</label>
        <select name="profession" value={formData.profession} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">Select Profession</option>
          <option value="Engineer">Engineer</option>
          <option value="Doctor">Doctor</option>
          <option value="Teacher">Teacher</option>
          <option value="Businessman">Businessman</option>
          <option value="Accountant">Accountant</option>
          <option value="Lawyer">Lawyer</option>
          <option value="IT Professional">IT Professional</option>
          <option value="Housewife">Housewife</option>
          <option value="Student">Student</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Job Type</label>
          <select name="jobType" value={formData.jobType} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg">
            <option value="">Select</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Self-employed">Self-employed</option>
            <option value="Business">Business</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Designation</label>
          <input type="text" name="designation" value={formData.designation} onChange={handleInputChange} placeholder="Job title" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Monthly Income Range</label>
        <select name="monthlyIncome" value={formData.monthlyIncome} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">Select Range</option>
          <option value="30000-50000">30,000 - 50,000</option>
          <option value="50000-100000">50,000 - 100,000</option>
          <option value="100000-200000">100,000 - 200,000</option>
          <option value="200000-500000">200,000 - 500,000</option>
          <option value="500000+">500,000+</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Office/Institution Address</label>
        <textarea name="officeAddress" value={formData.officeAddress} onChange={handleInputChange} rows={3} placeholder="Office location details" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Family & Residence</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700">City/Country *</label>
        <input type="text" name="city" value={formData.city} onChange={handleInputChange} placeholder="e.g., Lahore, Karachi" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Residential Address</label>
        <textarea name="address" value={formData.address} onChange={handleInputChange} rows={3} placeholder="Full address" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
      </div>
      <div className="border-t pt-4">
        <h3 className="font-semibold text-gray-900 mb-4">Parents Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Father's Name</label>
            <input type="text" name="fatherName" value={formData.fatherName} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Father's Occupation</label>
            <input type="text" name="fatherOccupation" value={formData.fatherOccupation} onChange={handleInputChange} placeholder="Job or business" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Mother's Name</label>
            <input type="text" name="motherName" value={formData.motherName} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Mother's Occupation</label>
            <input type="text" name="motherOccupation" value={formData.motherOccupation} onChange={handleInputChange} placeholder="Job, business or housewife" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <input type="tel" name="fatherMobile" value={formData.fatherMobile} onChange={handleInputChange} placeholder="Father's Mobile" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <input type="tel" name="motherMobile" value={formData.motherMobile} onChange={handleInputChange} placeholder="Mother's Mobile" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
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
        <div className="mt-4">
          <input type="tel" name="siblingsMobile" value={formData.siblingsMobile} onChange={handleInputChange} placeholder="Sibling's Mobile Number" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
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
          <input type="number" name="areaValue" value={formData.areaValue || ''} onChange={(e) => handleNumberChange('areaValue', parseInt(e.target.value) || 0)} placeholder="e.g., 2500" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg" />
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

  const totalSteps = 4;

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
        <div className="bg-white p-8 rounded-lg shadow-md">{step === 1 && renderStep1()}{step === 2 && renderStep2()}{step === 3 && renderStep3()}{step === 4 && renderStep4()}</div>
        <div className="mt-8 flex justify-between gap-4">
          <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">Previous</button>
          {step < totalSteps ? (
            <button onClick={() => setStep(step + 1)} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Next</button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">{loading ? 'Saving...' : 'Complete Profile'}</button>
          )}
        </div>
      </div>
    </div>
  );
}