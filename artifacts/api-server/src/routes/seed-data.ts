import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection';
import { hashPassword } from '../utils/password';

const router = Router();

// Gender-coded UI avatars — unambiguous, no third-party face photos
function maleAvatar(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=ffffff&size=150&bold=true`;
}
function femaleAvatar(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ec4899&color=ffffff&size=150&bold=true`;
}

// Birth year from age (assumes current year 2026)
function dobFromAge(age: number, month = 6, day = 15): Date {
  return new Date(2026 - age, month - 1, day);
}

// Guard: throws on name/gender mismatch before any insert
const FEMALE_FIRST = new Set(['fatima','ayesha','zainab','hira','maryam','nida','aisha','sara','amina','bushra','sana','rabia','rukhsana','sadia','asma','naila','fozia','kiran','afshan','mehwish','iqra','sobia','razia','nazish']);
const MALE_FIRST   = new Set(['ahmed','ali','hassan','imran','fahad','faisal','bilal','usman','usama','omar','adnan','tariq','kamran','shahid','asif','zubair','naveed','waheed','umer','umar','hamza','saad','talha','sohail']);

function validateGender(name: string, gender: string) {
  const first = name.split(' ')[0].toLowerCase();
  if (gender === 'male'   && FEMALE_FIRST.has(first)) throw new Error(`"${name}" looks female but gender=male`);
  if (gender === 'female' && MALE_FIRST.has(first))   throw new Error(`"${name}" looks male but gender=female`);
}

router.post('/seed', async (_req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const col = db.collection('profiles');

    // Safe delete: applicants only, staff/admin untouched
    await col.deleteMany({ role: 'applicant' });

    // ── 8 FEMALE profiles ──────────────────────────────────────────────────────
    // Consistent: female name + gender=female + femaleAvatar + proper dob
    const females = [
      { name: 'Fatima Khan',    gender: 'female', age: 25, city: 'Lahore',      education: 'Bachelors', profession: 'Engineer',          caste: 'Arain',  height: '5.4', houseStatus: 'owned',  houseArea: '2500' },
      { name: 'Ayesha Ali',     gender: 'female', age: 24, city: 'Lahore',      education: 'Masters',   profession: 'Doctor',            caste: 'Sheikh', height: '5.3', houseStatus: 'owned',  houseArea: '3000' },
      { name: 'Zainab Hassan',  gender: 'female', age: 28, city: 'Islamabad',   education: 'Bachelors', profession: 'Teacher',           caste: 'Malik',  height: '5.5', houseStatus: 'rented', houseArea: '1800' },
      { name: 'Hira Ahmed',     gender: 'female', age: 25, city: 'Rawalpindi',  education: 'Bachelors', profession: 'Business Analyst',  caste: 'Syed',   height: '5.2', houseStatus: 'owned',  houseArea: '2200' },
      { name: 'Maryam Khan',    gender: 'female', age: 27, city: 'Faisalabad',  education: 'Masters',   profession: 'Consultant',        caste: 'Rajput', height: '5.3', houseStatus: 'owned',  houseArea: '2800' },
      { name: 'Nida Malik',     gender: 'female', age: 29, city: 'Lahore',      education: 'Masters',   profession: 'HR Manager',        caste: 'Malik',  height: '5.5', houseStatus: 'owned',  houseArea: '2700' },
      { name: 'Sara Bibi',      gender: 'female', age: 25, city: 'Rawalpindi',  education: 'Bachelors', profession: 'Engineer',          caste: 'Syed',   height: '5.4', houseStatus: 'owned',  houseArea: '2200' },
      { name: 'Amina Qureshi',  gender: 'female', age: 26, city: 'Faisalabad',  education: 'Masters',   profession: 'Businesswoman',     caste: 'Rajput', height: '5.3', houseStatus: 'owned',  houseArea: '2800' },
    ];

    // ── 7 MALE profiles ────────────────────────────────────────────────────────
    const males = [
      { name: 'Ahmed Hassan',   gender: 'male', age: 28, city: 'Lahore',       education: 'Masters',   profession: 'Software Engineer', caste: 'Sheikh', height: '5.9',  houseStatus: 'owned',  houseArea: '2500' },
      { name: 'Ali Khan',       gender: 'male', age: 26, city: 'Lahore',       education: 'Bachelors', profession: 'Accountant',        caste: 'Malik',  height: '5.8',  houseStatus: 'rented', houseArea: '2600' },
      { name: 'Hassan Ahmed',   gender: 'male', age: 30, city: 'Islamabad',    education: 'Masters',   profession: 'Project Manager',   caste: 'Arain',  height: '5.10', houseStatus: 'owned',  houseArea: '3200' },
      { name: 'Imran Ali',      gender: 'male', age: 27, city: 'Rawalpindi',   education: 'Bachelors', profession: 'Engineer',          caste: 'Syed',   height: '5.9',  houseStatus: 'owned',  houseArea: '2100' },
      { name: 'Fahad Khan',     gender: 'male', age: 28, city: 'Faisalabad',   education: 'Masters',   profession: 'Businessman',       caste: 'Rajput', height: '5.8',  houseStatus: 'owned',  houseArea: '2900' },
      { name: 'Faisal Ahmed',   gender: 'male', age: 32, city: 'Lahore',       education: 'MBA',       profession: 'Business Analyst',  caste: 'Malik',  height: '5.9',  houseStatus: 'owned',  houseArea: '2400' },
      { name: 'Bilal Raza',     gender: 'male', age: 27, city: 'Rawalpindi',   education: 'Bachelors', profession: 'Engineer',          caste: 'Arain',  height: '5.10', houseStatus: 'owned',  houseArea: '2300' },
    ];

    // Validate every profile before any DB write
    for (const p of [...females, ...males]) validateGender(p.name, p.gender);

    const docs = [...females, ...males].map(p => ({
      _id: new ObjectId(),
      ...p,
      // Proper DOB derived from age (not new Date() which gives today)
      dob: dobFromAge(p.age),
      income: '500000-1000000',
      role: 'applicant',
      profileStatus: 'approved',
      active: true,
      password: hashPassword('password123'),
      emailVerified: true,
      bio: 'Looking for a compatible life partner.',
      // Gender-coded avatar — no ambiguity
      photo: p.gender === 'female' ? femaleAvatar(p.name) : maleAvatar(p.name),
      profileCompletion: 100,
      paymentStatus: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await col.insertMany(docs);

    res.json({
      success: true,
      message: `Seeded ${docs.length} applicant profiles (staff accounts preserved)`,
      breakdown: {
        female: females.length,
        male: males.length,
        total: docs.length,
        note: 'All profiles gender-validated. Avatars are gender-coded (pink=female, blue=male).',
      },
    });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ error: 'Seed failed', message: err instanceof Error ? err.message : 'Unknown' });
  }
});

export default router;
