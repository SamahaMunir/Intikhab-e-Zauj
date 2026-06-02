// ─────────────────────────────────────────────────────────────────────────────
// Suggestion data for profile wizard dropdowns
// ─────────────────────────────────────────────────────────────────────────────

export const LANGUAGES = [
  'Urdu', 'Punjabi', 'Saraiki', 'Pashto', 'Sindhi', 'Balochi',
  'Kashmiri', 'Hindko', 'Brahui', 'Shina', 'Khowar', 'Wakhi',
  'Pothohari', 'Gojri', 'Kalami', 'Burushaski', 'Arabic', 'Persian',
  'English',
];

export const RELIGIONS = ['Islam', 'Christianity', 'Hinduism', 'Sikhism', 'Other'];

export const SECTS = [
  'Sunni – Hanafi',
  'Sunni – Barelvi',
  'Sunni – Deobandi',
  'Sunni – Ahl-e-Hadith / Salafi',
  'Shia – Ithna-Ashari (Twelver)',
  'Shia – Ismaili',
  'Shia – Dawoodi Bohra',
  'Ahmadiyya',
  'Non-denominational / No preference',
  'Other',
];

export const CASTES = [
  // Ashraf (high-lineage)
  'Syed', 'Sheikh', 'Mughal', 'Pathan / Khan',
  // Punjabi agricultural / zamindar
  'Arain', 'Jat', 'Rajput', 'Gujjar', 'Awan', 'Malhi',
  'Tarkhan / Mochi', 'Khokhar', 'Gondal', 'Rana',
  // Business / trading
  'Qureshi', 'Ansari', 'Butt', 'Chaudhry', 'Mirza',
  'Hashmi', 'Abbasi', 'Farooqi', 'Siddiqui',
  // Sindhi
  'Soomro', 'Bhutto', 'Memon', 'Brohi', 'Jakhrani',
  // Pashtun tribes
  'Yousafzai', 'Afridi', 'Wazir', 'Mehsud', 'Khattak',
  'Bangash', 'Kakar', 'Achakzai',
  // Baloch tribes
  'Bugti', 'Marri', 'Mengal', 'Rind', 'Zehri',
  // Other
  'Malik', 'Alvi', 'Rizvi', 'Naqvi', 'Kazmi', 'Zaidi',
  'No preference / Open',
];

export const CITIES = [
  // Punjab
  'Lahore', 'Faisalabad', 'Rawalpindi', 'Gujranwala', 'Multan',
  'Sialkot', 'Sheikhupura', 'Sargodha', 'Bahawalpur', 'Gujrat',
  'Rahim Yar Khan', 'Jhang', 'Dera Ghazi Khan', 'Sahiwal',
  'Wah Cantt', 'Kasur', 'Okara', 'Chiniot', 'Khushab',
  // Islamabad / Rawalpindi
  'Islamabad', 'Taxila', 'Attock', 'Chakwal',
  // Sindh
  'Karachi', 'Hyderabad', 'Sukkur', 'Larkana', 'Mirpur Khas',
  'Nawabshah', 'Khairpur', 'Jacobabad', 'Shikarpur',
  // KPK
  'Peshawar', 'Mardan', 'Swabi', 'Nowshera', 'Kohat',
  'Abbottabad', 'Mansehra', 'Swat', 'Haripur', 'Bannu',
  // Balochistan
  'Quetta', 'Turbat', 'Khuzdar', 'Hub', 'Gwadar',
  // AJK / Gilgit
  'Muzaffarabad', 'Mirpur (AJK)', 'Gilgit', 'Skardu',
  // Abroad (common expatriate hubs)
  'Dubai, UAE', 'Abu Dhabi, UAE', 'Sharjah, UAE',
  'Riyadh, Saudi Arabia', 'Jeddah, Saudi Arabia',
  'Doha, Qatar', 'Kuwait City, Kuwait', 'Muscat, Oman',
  'London, UK', 'Manchester, UK', 'Birmingham, UK',
  'Toronto, Canada', 'New York, USA', 'Houston, USA',
  'Sydney, Australia', 'Melbourne, Australia',
];

export const PROFESSIONS = [
  // Medicine & Health
  'Doctor (MBBS)', 'Specialist Doctor', 'Dentist', 'Pharmacist',
  'Nurse', 'Physiotherapist', 'Nutritionist / Dietician',
  // Engineering
  'Software Engineer', 'Civil Engineer', 'Mechanical Engineer',
  'Electrical Engineer', 'Chemical Engineer', 'IT Professional',
  'Data Scientist / Analyst', 'Network Engineer',
  // Business & Finance
  'Businessman / Entrepreneur', 'Accountant / CA', 'Banker',
  'Investment Analyst', 'Marketing Manager', 'Sales Manager',
  'HR Manager', 'Business Analyst',
  // Law & Government
  'Lawyer / Advocate', 'Judge', 'Government Officer (BPS)',
  'Army Officer', 'Police Officer', 'IAS / CSS Officer',
  // Education
  'Teacher (School)', 'Lecturer / Professor', 'Principal',
  'Academic Researcher',
  // Trades & Skilled
  'Electrician', 'Plumber', 'Carpenter', 'Mechanic', 'Contractor',
  // Media & Arts
  'Journalist', 'Content Creator', 'Graphic Designer',
  'Architect', 'Interior Designer', 'Photographer',
  // Agriculture
  'Farmer / Agriculturist', 'Livestock Farmer',
  // Household
  'Housewife / Homemaker',
  // Student
  'Student',
  // Other
  'Other',
];

export const DESIGNATIONS_BY_PROFESSION: Record<string, string[]> = {
  'Software Engineer': [
    'Junior Software Engineer', 'Software Engineer', 'Senior Software Engineer',
    'Lead Engineer', 'Staff Engineer', 'Principal Engineer',
    'Engineering Manager', 'CTO', 'VP Engineering',
  ],
  'Doctor (MBBS)': [
    'House Officer', 'Medical Officer', 'Senior Medical Officer',
    'Registrar', 'Senior Registrar', 'Consultant', 'Associate Professor',
    'Professor & HOD',
  ],
  'Lawyer / Advocate': [
    'Junior Advocate', 'Advocate', 'Senior Advocate',
    'Advocate High Court', 'Advocate Supreme Court', 'Partner',
  ],
  'Teacher (School)': ['Assistant Teacher', 'Teacher', 'Senior Teacher', 'Head of Department', 'Principal'],
  'Businessman / Entrepreneur': ['Owner', 'Co-founder', 'Managing Director', 'CEO', 'Director'],
  'Accountant / CA': ['Accountant', 'Senior Accountant', 'Finance Manager', 'CFO', 'Partner (CA)'],
  'Government Officer (BPS)': ['Grade 1–5', 'Grade 6–10', 'Grade 11–15', 'Grade 16–18', 'Grade 19–21', 'Grade 22+'],
};

export const GENERIC_DESIGNATIONS = [
  // Executive / Ownership
  'Owner', 'Co-Owner', 'Founder', 'Co-Founder',
  'CEO', 'Managing Director', 'Director',
  'Vice President', 'President',
  // Management
  'Head of Department', 'Senior Manager', 'Manager',
  'Team Lead', 'Supervisor',
  // Professional grades
  'Consultant', 'Senior Consultant',
  'Senior Analyst', 'Analyst',
  'Senior Officer', 'Officer', 'Junior Officer', 'Assistant',
  // Common titles
  'Software Engineer', 'Senior Software Engineer', 'Lead Engineer',
  'Project Manager', 'Product Manager', 'Business Development Manager',
  'Doctor', 'Senior Doctor', 'Consultant Doctor',
  'Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor',
  'Teacher', 'Senior Teacher',
  'Accountant', 'Senior Accountant', 'Finance Manager',
  'Government Officer (BPS 17)', 'Government Officer (BPS 18)',
  'Government Officer (BPS 19)', 'Government Officer (BPS 20)',
];

// Country phone codes for the phone input selector
export interface CountryCode {
  code: string;   // e.g. 'PK'
  name: string;
  dial: string;   // e.g. '+92'
  format: string; // e.g. '3XX XXXXXXX'
  pattern: RegExp;
  localLength: number; // digits after country code
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: 'PK', name: 'Pakistan',      dial: '+92',  format: '3XX XXXXXXX',  pattern: /^3\d{9}$/,       localLength: 10 },
  { code: 'AE', name: 'UAE',           dial: '+971', format: '5X XXX XXXX',  pattern: /^5\d{8}$/,        localLength: 9  },
  { code: 'SA', name: 'Saudi Arabia',  dial: '+966', format: '5X XXX XXXX',  pattern: /^5\d{8}$/,        localLength: 9  },
  { code: 'QA', name: 'Qatar',         dial: '+974', format: '7XXX XXXX',    pattern: /^[3-7]\d{7}$/,    localLength: 8  },
  { code: 'KW', name: 'Kuwait',        dial: '+965', format: '9XXX XXXX',    pattern: /^[569]\d{7}$/,    localLength: 8  },
  { code: 'BH', name: 'Bahrain',       dial: '+973', format: '3XXX XXXX',    pattern: /^[3-9]\d{7}$/,    localLength: 8  },
  { code: 'OM', name: 'Oman',          dial: '+968', format: '9XXX XXXX',    pattern: /^[79]\d{7}$/,     localLength: 8  },
  { code: 'GB', name: 'United Kingdom',dial: '+44',  format: '7XXX XXXXXX',  pattern: /^7\d{9}$/,        localLength: 10 },
  { code: 'US', name: 'United States', dial: '+1',   format: 'XXX XXX XXXX', pattern: /^\d{10}$/,        localLength: 10 },
  { code: 'CA', name: 'Canada',        dial: '+1',   format: 'XXX XXX XXXX', pattern: /^\d{10}$/,        localLength: 10 },
  { code: 'AU', name: 'Australia',     dial: '+61',  format: '4XX XXX XXX',  pattern: /^4\d{8}$/,        localLength: 9  },
  { code: 'DE', name: 'Germany',       dial: '+49',  format: '1XX XXXXXXX',  pattern: /^1[5-7]\d{8,9}$/, localLength: 10 },
  { code: 'TR', name: 'Turkey',        dial: '+90',  format: '5XX XXX XXXX', pattern: /^5\d{9}$/,        localLength: 10 },
  { code: 'MY', name: 'Malaysia',      dial: '+60',  format: '1X XXXX XXXX', pattern: /^1\d{8,9}$/,      localLength: 9  },
];

// Pakistani residential areas for address autocomplete
export const PK_AREAS_LAHORE = [
  'DHA (Defence Housing Authority)', 'Bahria Town', 'Johar Town', 'Gulberg',
  'Model Town', 'Garden Town', 'Allama Iqbal Town', 'Township',
  'Wapda Town', 'Valencia', 'Cantt', 'Cavalry Ground',
  'Askari', 'Raiwind Road', 'Ferozepur Road', 'Multan Road',
  'PCSIR Housing', 'NFC Housing', 'Suzuki Chowk', 'Shadbagh',
  'Samanabad', 'Ichra', 'New Garden Town', 'Thokar Niaz Baig',
];

export const PK_AREAS_ISLAMABAD = [
  'F-6', 'F-7', 'F-8', 'F-10', 'F-11',
  'G-9', 'G-10', 'G-11', 'G-13', 'G-15',
  'E-7', 'E-11', 'Bahria Town Islamabad',
  'DHA Islamabad', 'Margalla Hills Road',
  'Blue Area', 'I-8', 'I-10', 'I-14',
  'Sector H', 'Sector B', 'PWD Housing', 'PECHS',
];

export const PK_AREAS_KARACHI = [
  'DHA (Defence Housing Authority)', 'Clifton', 'Gulshan-e-Iqbal',
  'PECHS', 'North Nazimabad', 'Gulistan-e-Johar',
  'Federal B Area', 'Nazimabad', 'Sadar', 'Korangi',
  'Bahria Town Karachi', 'Malir', 'Liaquatabad', 'Orangi Town',
  'Landhi', 'Site Area', 'Keamari', 'Bin Qasim Town',
];

export const PK_AREAS_RAWALPINDI = [
  'Bahria Town Phase 1-8', 'DHA', 'Satellite Town',
  'Westridge', 'Askari', 'Chaklala', 'Dhoke Kashmirian',
  'Murree Road', 'Committee Chowk', 'Commercial Market',
];

export const ALL_PK_AREAS = [
  ...PK_AREAS_LAHORE.map(a => `${a}, Lahore`),
  ...PK_AREAS_ISLAMABAD.map(a => `${a}, Islamabad`),
  ...PK_AREAS_KARACHI.map(a => `${a}, Karachi`),
  ...PK_AREAS_RAWALPINDI.map(a => `${a}, Rawalpindi`),
];

export const OCCUPATIONS = [
  ...PROFESSIONS,
  'Retired', 'Deceased',
];

// "Prefer not to disclose" intentionally removed — data quality requirement
export const INCOME_RANGES = [
  { value: 'below-30000',      label: 'Below PKR 30,000' },
  { value: '30000-50000',      label: 'PKR 30,000 – 50,000' },
  { value: '50000-100000',     label: 'PKR 50,000 – 100,000' },
  { value: '100000-200000',    label: 'PKR 100,000 – 200,000' },
  { value: '200000-500000',    label: 'PKR 200,000 – 500,000' },
  { value: '500000-1000000',   label: 'PKR 500,000 – 1,000,000' },
  { value: 'above-1000000',    label: 'Above PKR 1,000,000' },
];

export const EDUCATION_LEVELS = [
  'Primary (Class 1–5)',
  'Middle (Class 6–8)',
  'Matric (Class 9–10)',
  'Intermediate / FSc / FA / ICS / ICom (Class 11–12)',
  'Diploma / Certificate',
  'Bachelors (BA / BSc / BCS / BCom / MBBS / BBA / BE)',
  'Masters (MA / MSc / MBA / LLM / MS)',
  'MPhil',
  'PhD',
  'Post-Doctorate',
  'Religious Education (Aalim / Aalima)',
  'Other',
];

export const PAKISTANI_UNIVERSITIES = [
  // Punjab
  'University of the Punjab, Lahore',
  'Lahore University of Management Sciences (LUMS)',
  'University of Engineering & Technology (UET) Lahore',
  'Quaid-i-Azam University (QAU) Islamabad',
  'National University of Sciences & Technology (NUST)',
  'COMSATS University Islamabad',
  'Government College University (GCU) Lahore',
  'Forman Christian College, Lahore',
  'University of Veterinary & Animal Sciences, Lahore',
  'University of Central Punjab (UCP)',
  'Riphah International University',
  'Superior University, Lahore',
  'University of Management & Technology (UMT), Lahore',
  // Karachi
  'University of Karachi (KU)',
  'Institute of Business Administration (IBA) Karachi',
  'NED University of Engineering & Technology',
  'Aga Khan University (AKU)',
  'Karachi Institute of Technology & Entrepreneurship (KITE)',
  'Hamdard University, Karachi',
  'SZABIST Karachi',
  // Islamabad
  'International Islamic University Islamabad (IIUI)',
  'Bahria University, Islamabad',
  'Air University, Islamabad',
  'Federal Urdu University, Islamabad',
  // KPK
  'University of Peshawar',
  'University of Engineering & Technology (UET) Peshawar',
  'Khyber Medical University, Peshawar',
  'Abdul Wali Khan University, Mardan',
  // Other
  'University of Agriculture, Faisalabad',
  'Allama Iqbal Open University (AIOU)',
  'Virtual University of Pakistan',
  'Other / Not Listed',
];

/** Normalize a Pakistani phone number to +92XXXXXXXXXX format for storage */
export function normalizePakistaniPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('92') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+92${digits.slice(1)}`;
  if (digits.length === 10) return `+92${digits}`;
  return raw; // return as-is if can't normalize
}

/** Display a stored phone as 0300-1234567 */
export function formatPhoneDisplay(stored: string): string {
  const digits = stored.replace(/\D/g, '');
  const local = digits.startsWith('92') ? `0${digits.slice(2)}` : digits;
  if (local.length !== 11) return stored;
  return `${local.slice(0, 4)}-${local.slice(4)}`;
}
