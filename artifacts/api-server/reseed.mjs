/**
 * Direct MongoDB reseed — bypasses backend server entirely.
 * Deletes all applicant profiles, inserts 9F + 6M with SVG data URI photos.
 *
 * Run: node reseed.mjs
 */

import { webcrypto } from 'crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;

import { MongoClient, ObjectId } from 'mongodb';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env
for (const file of ['.env.local', '.env']) {
  try {
    for (const line of readFileSync(join(__dirname, file), 'utf8').split('\n')) {
      const eq = line.indexOf('=');
      if (eq < 1) continue;
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim().replace(/^"|"$/g, '');
      if (k && v && !process.env[k]) process.env[k] = v;
    }
  } catch {}
}

const MONGO_URI = (process.env.DATABASE_URL || 'mongodb://localhost:27017').replace(/\?.*$/, '');
const DB_NAME   = 'intikhab_dev';

// ── SVG data URI generator ─────────────────────────────────────────────────────
function photo(name, gender) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const bg   = gender === 'female' ? '#BE185D' : '#1D4ED8';
  const ring = gender === 'female' ? '#F9A8D4' : '#93C5FD';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><circle cx="60" cy="60" r="60" fill="${bg}"/><circle cx="60" cy="60" r="56" fill="none" stroke="${ring}" stroke-width="2" opacity="0.4"/><text x="60" y="76" text-anchor="middle" font-size="40" font-family="Arial,Helvetica,sans-serif" font-weight="700" fill="white" letter-spacing="2">${initials}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Simple password hash (sha256 + salt like the app does — adjust if app uses bcrypt)
function hashPw(pw) {
  // The app uses a custom hashPassword from utils/password — replicate here with sha256
  return createHash('sha256').update(pw + 'intikhab_salt').digest('hex');
}

function dob(age) {
  return new Date(new Date().getFullYear() - age, 5, 15);
}

// ── Seed data ──────────────────────────────────────────────────────────────────
const FEMALES = [
  { name: 'Fatima Khan',   age: 25, city: 'Lahore',      education: 'Bachelors', profession: 'Engineer',         caste: 'Arain',  height: '5.4', income: '500000-1000000' },
  { name: 'Ayesha Ali',    age: 24, city: 'Lahore',      education: 'Masters',   profession: 'Doctor',           caste: 'Sheikh', height: '5.3', income: '800000-1500000' },
  { name: 'Zainab Hassan', age: 28, city: 'Islamabad',   education: 'Bachelors', profession: 'Teacher',          caste: 'Malik',  height: '5.5', income: '300000-600000'  },
  { name: 'Hira Ahmed',    age: 25, city: 'Rawalpindi',  education: 'Bachelors', profession: 'Business Analyst', caste: 'Syed',   height: '5.2', income: '400000-800000'  },
  { name: 'Maryam Khan',   age: 27, city: 'Faisalabad',  education: 'Masters',   profession: 'Consultant',       caste: 'Rajput', height: '5.3', income: '600000-1200000' },
  { name: 'Nida Malik',    age: 29, city: 'Lahore',      education: 'Masters',   profession: 'HR Manager',       caste: 'Malik',  height: '5.5', income: '600000-1200000' },
  { name: 'Sara Bibi',     age: 25, city: 'Rawalpindi',  education: 'Bachelors', profession: 'Engineer',         caste: 'Syed',   height: '5.4', income: '500000-900000'  },
  { name: 'Amina Qureshi', age: 26, city: 'Faisalabad',  education: 'Masters',   profession: 'Businesswoman',    caste: 'Rajput', height: '5.3', income: '700000-1300000' },
  { name: 'Aisha Hussain', age: 27, city: 'Islamabad',   education: 'Bachelors', profession: 'Designer',         caste: 'Arain',  height: '5.2', income: '400000-800000'  },
];

const MALES = [
  { name: 'Ahmed Hassan',  age: 28, city: 'Lahore',      education: 'Masters',   profession: 'Software Engineer', caste: 'Sheikh', height: '5.9',  income: '700000-1300000'  },
  { name: 'Ali Khan',      age: 26, city: 'Lahore',      education: 'Bachelors', profession: 'Accountant',        caste: 'Malik',  height: '5.8',  income: '400000-700000'   },
  { name: 'Hassan Ahmed',  age: 30, city: 'Islamabad',   education: 'Masters',   profession: 'Project Manager',   caste: 'Arain',  height: '5.10', income: '800000-1500000'  },
  { name: 'Imran Ali',     age: 27, city: 'Rawalpindi',  education: 'Bachelors', profession: 'Engineer',          caste: 'Syed',   height: '5.9',  income: '500000-900000'   },
  { name: 'Fahad Khan',    age: 28, city: 'Faisalabad',  education: 'Masters',   profession: 'Businessman',       caste: 'Rajput', height: '5.8',  income: '1000000-2000000' },
  { name: 'Faisal Ahmed',  age: 32, city: 'Lahore',      education: 'MBA',       profession: 'Business Analyst',  caste: 'Malik',  height: '5.9',  income: '1000000-1500000' },
];

function makeDoc(p, gender) {
  const slug = p.name.toLowerCase().replace(/\s+/g, '.');
  return {
    _id: new ObjectId(),
    name: p.name,
    email: `${slug}@nikahseed.pk`,
    phone: `0300${Math.floor(1000000 + Math.random() * 9000000)}`,
    gender,
    age: p.age,
    dob: dob(p.age),
    city: p.city,
    education: p.education,
    profession: p.profession,
    caste: p.caste,
    height: p.height,
    monthlyIncome: p.income,
    income: p.income,
    houseStatus: 'owned',
    houseArea: '2500',
    homeOwnership: 'owned',
    religion: 'Islam',
    sect: 'Sunni',
    prayerRegularity: 'Regular',
    disability: 'No',
    bio: 'Looking for a compatible and pious life partner.',
    photo: photo(p.name, gender),
    role: 'applicant',
    profileStatus: 'approved',
    profileCompletion: 100,
    paymentStatus: 'completed',
    emailVerified: true,
    active: true,
    password: hashPw('password123'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  console.log('✓ Connected to MongoDB');

  const db  = client.db(DB_NAME);
  const col = db.collection('profiles');

  // Delete all applicants (staff/admin preserved)
  const del = await col.deleteMany({ role: 'applicant' });
  console.log(`✓ Deleted ${del.deletedCount} old applicant profiles`);

  const docs = [
    ...FEMALES.map(p => makeDoc(p, 'female')),
    ...MALES.map(p => makeDoc(p, 'male')),
  ];

  const ins = await col.insertMany(docs);
  console.log(`✓ Inserted ${ins.insertedCount} profiles (${FEMALES.length}F + ${MALES.length}M)`);
  console.log('✓ Photos: SVG data URIs — no network, no CDN, no CORS');

  // Verify
  const count = await col.countDocuments({ role: 'applicant' });
  console.log(`✓ Verified: ${count} applicant profiles in DB`);

  await client.close();
  console.log('\n✅ Reseed complete. Refresh the matches page.');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
