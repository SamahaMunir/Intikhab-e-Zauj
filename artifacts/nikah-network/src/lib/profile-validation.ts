// Shared validation and formatting for Profile Wizard and Staff Data Entry.
// Single source of truth — any change here applies to both forms.

export function validateCNIC(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[-\s]/g, '');
  if (!/^\d{13}$/.test(digits)) return 'CNIC must be 13 digits (format: 12345-1234567-1)';
  return null;
}

export function validatePakistaniPhone(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[-\s+]/g, '');
  if (!/^(0|92)?3\d{9}$/.test(digits))
    return 'Enter a valid Pakistani mobile number (e.g. 03001234567)';
  return null;
}

export function validateAge(dob: string): string | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return 'Invalid date of birth';
  const today = new Date();
  const age =
    today.getFullYear() - birth.getFullYear() -
    (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
  if (age < 18) return 'Minimum age for registration is 18 years';
  if (age > 60) return 'Maximum age for registration is 60 years';
  return null;
}

export function validateHeight(h: string): string | null {
  if (!h) return null;
  const v = parseFloat(h);
  if (isNaN(v)) return 'Height must be a number (e.g. 5.9)';
  if (v < 4.0 || v > 7.5) return 'Height must be between 4.0 and 7.5 feet';
  return null;
}

export function validateHouseArea(area: number): string | null {
  if (!area || area === 0) return null;
  if (area < 1 || area > 50000) return 'House area must be between 1 and 50,000';
  return null;
}

export function formatCNIC(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function calculateAge(dob: string): number {
  if (!dob) return 0;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return Math.max(0, age);
}

// Shared ProfileFormData — same interface used by wizard and staff form
export interface ProfileFormData {
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

export const EMPTY_PROFILE_FORM = (gender: 'male' | 'female', name = ''): ProfileFormData => ({
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
