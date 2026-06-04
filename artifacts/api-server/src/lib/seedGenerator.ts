/**
 * Seed Dataset Generator — Matrimonial Platform
 *
 * Guarantees:
 *  - Gender ↔ name ↔ photo are always consistent
 *  - No duplicate emails / phones / CNICs
 *  - All required schema fields populated
 *  - randomuser.me portraits: /women/{n} → female only, /men/{n} → male only
 */

import { ObjectId } from 'mongodb';
import { hashPassword } from '../utils/password.js';

// ── SVG avatar generator — zero network dependency ───────────────────────────
// Embedded as data URIs directly in the DB document.
// No CDN, no CORS, no external requests. Works offline, works everywhere.
// Gender-coded: female = rose, male = blue. Initials from name.
function generateSeedPhoto(name: string, gender: 'male' | 'female'): string {
  const parts    = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const bg       = gender === 'female' ? '#BE185D' : '#1D4ED8'; // rose-700 / blue-700
  const ring     = gender === 'female' ? '#F9A8D4' : '#93C5FD'; // pink-300 / blue-300
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">',
    `<circle cx="60" cy="60" r="60" fill="${bg}"/>`,
    `<circle cx="60" cy="60" r="56" fill="none" stroke="${ring}" stroke-width="2" opacity="0.4"/>`,
    `<text x="60" y="76" text-anchor="middle" font-size="40" font-family="Arial,Helvetica,sans-serif"`,
    ` font-weight="700" fill="white" letter-spacing="2">${initials}</text>`,
    '</svg>',
  ].join('');
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
function femalePhoto(seed: string): string { return generateSeedPhoto(seed, 'female'); }
function malePhoto(seed: string): string   { return generateSeedPhoto(seed, 'male'); }

// ── Name pools — culturally accurate, no overlap between genders ──────────────
const FEMALE_FIRST = [
  'Fatima','Ayesha','Zainab','Hira','Maryam','Nida','Aisha','Sara',
  'Amina','Bushra','Sana','Rabia','Asma','Naila','Mehwish','Iqra',
  'Sobia','Afshan','Kiran','Razia',
];
const MALE_FIRST = [
  'Ahmed','Ali','Hassan','Imran','Fahad','Faisal','Bilal','Usman',
  'Omar','Adnan','Tariq','Kamran','Zubair','Naveed','Hamza','Saad',
  'Talha','Sohail','Umer','Waheed',
];
const LAST_NAMES = [
  'Khan','Ali','Hassan','Ahmed','Malik','Sheikh','Syed','Rajput',
  'Arain','Chaudhry','Qureshi','Butt','Rana','Mirza','Ansari',
];

// ── Static option pools ───────────────────────────────────────────────────────
const CITIES = ['Lahore','Karachi','Islamabad','Rawalpindi','Faisalabad','Multan'];
const CASTES = ['Arain','Sheikh','Malik','Syed','Rajput','Qureshi','Arain','Butt','Rana','Chaudhry'];
const EDUCATIONS = ['Bachelors','Masters','MBA','MBBS','PhD','Diploma'];
const MALE_PROFESSIONS = [
  'Software Engineer','Civil Engineer','Doctor','Business Owner','Accountant',
  'Project Manager','Lecturer','Banker','Architect','Lawyer',
];
const FEMALE_PROFESSIONS = [
  'Doctor','Teacher','Software Engineer','Nurse','Business Analyst',
  'HR Manager','Pharmacist','Lecturer','Graphic Designer','Nutritionist',
];
const FATHER_OCCUPATIONS = ['Businessman','Engineer','Doctor','Government Officer','Retired','Teacher','Farmer'];
const MOTHER_OCCUPATIONS = ['Housewife','Teacher','Doctor','Nurse','Retired'];
const INCOME_RANGES = [
  '30000-50000','50000-100000','100000-200000',
  '200000-500000','500000-1000000','above-1000000',
];
const SECTS = ['Sunni','Deobandi','Barelvi','Shia','Ahl-e-Hadith'];

// ── Deterministic pick helpers ────────────────────────────────────────────────
function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function twoDP(n: number): string {
  return String(Math.round(n * 100) / 100);
}

// ── Name validation guard — throws on mismatch ────────────────────────────────
const FEMALE_SET = new Set(FEMALE_FIRST.map(n => n.toLowerCase()));
const MALE_SET   = new Set(MALE_FIRST.map(n => n.toLowerCase()));

export function assertGenderNameMatch(name: string, gender: string): void {
  const first = name.split(' ')[0].toLowerCase();
  if (gender === 'female' && MALE_SET.has(first))
    throw new Error(`[SeedGen] "${name}" is a male name but gender=female`);
  if (gender === 'male' && FEMALE_SET.has(first))
    throw new Error(`[SeedGen] "${name}" is a female name but gender=male`);
}

// ── Core types ────────────────────────────────────────────────────────────────
export interface SeedProfile {
  _id: ObjectId;
  email: string;
  name: string;
  gender: 'male' | 'female';
  age: number;
  dob: Date;
  city: string;
  country: string;
  religion: string;
  caste: string;
  sect: string;
  education: string;
  profession: string;
  designation: string;
  monthlyIncome: string;
  height: string;
  maritalStatus: string;
  bio: string;
  fatherOccupation: string;
  motherOccupation: string;
  photo: string;       // URL — gender-locked
  phone: string;
  houseStatus: string;
  houseArea: string;
  matchCriteria: string;
  // Managed fields
  role: 'applicant';
  profileStatus: 'approved';
  profileCompletion: 100;
  paymentStatus: 'completed';
  emailVerified: boolean;
  active: boolean;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Female profile generator ──────────────────────────────────────────────────
export function generateFemaleProfiles(count: number, startIdx = 0): SeedProfile[] {
  const profiles: SeedProfile[] = [];
  const usedEmails = new Set<string>();

  for (let i = 0; i < count; i++) {
    const idx = startIdx + i;
    const firstName = pick(FEMALE_FIRST, idx);
    const lastName  = pick(LAST_NAMES, idx + 7);
    const name      = `${firstName} ${lastName}`;
    const city      = pick(CITIES, idx + 2);
    const age       = 20 + (idx % 16);          // 20–35
    const dobYear   = new Date().getFullYear() - age;
    const heightFt  = 5.0 + ((idx % 6) * 0.1);  // 5.0–5.5
    const profession = pick(FEMALE_PROFESSIONS, idx + 3);

    let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${idx}@nikahseed.pk`;
    if (usedEmails.has(email)) email = `${firstName.toLowerCase()}${idx}.f@nikahseed.pk`;
    usedEmails.add(email);

    assertGenderNameMatch(name, 'female');

    profiles.push({
      _id: new ObjectId(),
      email,
      name,
      gender: 'female',
      age,
      dob: new Date(dobYear, (idx * 3) % 12, (idx * 7 % 28) + 1),
      city,
      country: 'Pakistan',
      religion: 'Islam',
      caste: pick(CASTES, idx),
      sect: pick(SECTS, idx + 1),
      education: pick(EDUCATIONS, idx + 4),
      profession,
      designation: profession,
      monthlyIncome: pick(INCOME_RANGES, idx + 1),
      height: twoDP(heightFt),
      maritalStatus: 'Single',
      bio: `Sincere and family-oriented, looking for a compatible life partner.`,
      fatherOccupation: pick(FATHER_OCCUPATIONS, idx + 2),
      motherOccupation: pick(MOTHER_OCCUPATIONS, idx),
      photo: femalePhoto(`${firstName} ${lastName}`),  // SVG avatar, no network
      phone: `0300${String(3000000 + idx).padStart(7, '0')}`,
      houseStatus: idx % 3 === 0 ? 'rented' : 'owned',
      houseArea: String(1500 + (idx % 10) * 200),
      matchCriteria: 'God-fearing, educated, and family-oriented.',
      role: 'applicant',
      profileStatus: 'approved',
      profileCompletion: 100,
      paymentStatus: 'completed',
      emailVerified: true,
      active: true,
      password: hashPassword('password123'),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return profiles;
}

// ── Male profile generator ────────────────────────────────────────────────────
export function generateMaleProfiles(count: number, startIdx = 0): SeedProfile[] {
  const profiles: SeedProfile[] = [];
  const usedEmails = new Set<string>();

  for (let i = 0; i < count; i++) {
    const idx = startIdx + i;
    const firstName = pick(MALE_FIRST, idx);
    const lastName  = pick(LAST_NAMES, idx + 3);
    const name      = `${firstName} ${lastName}`;
    const city      = pick(CITIES, idx + 1);
    const age       = 22 + (idx % 19);          // 22–40
    const dobYear   = new Date().getFullYear() - age;
    const heightFt  = 5.6 + ((idx % 5) * 0.1);  // 5.6–6.0
    const profession = pick(MALE_PROFESSIONS, idx + 2);

    let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${idx}@nikahseed.pk`;
    if (usedEmails.has(email)) email = `${firstName.toLowerCase()}${idx}.m@nikahseed.pk`;
    usedEmails.add(email);

    assertGenderNameMatch(name, 'male');

    profiles.push({
      _id: new ObjectId(),
      email,
      name,
      gender: 'male',
      age,
      dob: new Date(dobYear, (idx * 2) % 12, (idx * 5 % 28) + 1),
      city,
      country: 'Pakistan',
      religion: 'Islam',
      caste: pick(CASTES, idx + 2),
      sect: pick(SECTS, idx),
      education: pick(EDUCATIONS, idx + 2),
      profession,
      designation: profession,
      monthlyIncome: pick(INCOME_RANGES, idx + 2),
      height: twoDP(heightFt),
      maritalStatus: 'Single',
      bio: `Hardworking and sincere, looking for a pious and compatible life partner.`,
      fatherOccupation: pick(FATHER_OCCUPATIONS, idx),
      motherOccupation: pick(MOTHER_OCCUPATIONS, idx + 1),
      photo: malePhoto(`${firstName} ${lastName}`),      // SVG avatar, no network
      phone: `0300${String(4000000 + idx).padStart(7, '0')}`,
      houseStatus: idx % 4 === 0 ? 'rented' : 'owned',
      houseArea: String(1800 + (idx % 10) * 250),
      matchCriteria: 'Educated, God-fearing, and family-oriented.',
      role: 'applicant',
      profileStatus: 'approved',
      profileCompletion: 100,
      paymentStatus: 'completed',
      emailVerified: true,
      active: true,
      password: hashPassword('password123'),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return profiles;
}

// ── Mixed dataset ─────────────────────────────────────────────────────────────
export function generateMixedDataset(count: number): SeedProfile[] {
  const half = Math.floor(count / 2);
  const females = generateFemaleProfiles(half, 0);
  const males   = generateMaleProfiles(count - half, 0);
  return [...females, ...males];
}

// ── Validation ────────────────────────────────────────────────────────────────
export function validateSeedProfile(p: SeedProfile): string[] {
  const errors: string[] = [];
  const required: (keyof SeedProfile)[] = [
    'email','name','gender','age','dob','city','religion','caste',
    'education','profession','photo','phone','monthlyIncome','height',
  ];
  for (const field of required) {
    const val = p[field];
    if (val === undefined || val === null || val === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }
  if (p.age < 18 || p.age > 65)      errors.push(`Age out of range: ${p.age}`);
  if (!p.photo.startsWith('https://') && !p.photo.startsWith('data:image/'))
    errors.push('Photo must be https URL or data URI');
  // For Cloudinary URLs (user-uploaded), check folder
  if (p.photo.includes('cloudinary.com') && !p.photo.includes('/profiles/'))
    errors.push('Cloudinary photo must be in /profiles/ folder');
  try { assertGenderNameMatch(p.name, p.gender); }
  catch (e) { errors.push((e as Error).message); }
  return errors;
}
