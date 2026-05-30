import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection';
import { hashPassword } from '../utils/password';

const router = Router();

router.post('/seed', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const profilesCol = db.collection('profiles');

    // ✅ DELETE OLD DATA
    await profilesCol.deleteMany({});
    console.log('✅ Cleared old data');

    // ✅ SEED 10 FEMALE PROFILES
    const females = [
      { name: 'Fatima Khan', email: 'fatima@test.com', phone: '03001111111', gender: 'female', city: 'Karachi', education: 'Bachelors', profession: 'Engineer', income: '500000-1000000', caste: 'Arain', height: '5.4', houseStatus: 'Own' },
      { name: 'Ayesha Ali', email: 'ayesha@test.com', phone: '03001111112', gender: 'female', city: 'Lahore', education: 'Masters', profession: 'Doctor', income: '800000-1500000', caste: 'Sheikh', height: '5.3', houseStatus: 'Own' },
      { name: 'Zainab Hassan', email: 'zainab@test.com', phone: '03001111113', gender: 'female', city: 'Islamabad', education: 'Bachelors', profession: 'Teacher', income: '300000-600000', caste: 'Malik', height: '5.5', houseStatus: 'Rent' },
      { name: 'Hira Ahmed', email: 'hira@test.com', phone: '03001111114', gender: 'female', city: 'Rawalpindi', education: 'Bachelors', profession: 'Business Analyst', income: '400000-800000', caste: 'Syed', height: '5.2', houseStatus: 'Own' },
      { name: 'Maryam Khan', email: 'maryam@test.com', phone: '03001111115', gender: 'female', city: 'Faisalabad', education: 'Masters', profession: 'Consultant', income: '600000-1200000', caste: 'Rajput', height: '5.3', houseStatus: 'Own' },
    ];

    // ✅ SEED 10 MALE PROFILES
    const males = [
      { name: 'Ahmed Hassan', email: 'ahmed@test.com', phone: '03002222222', gender: 'male', city: 'Karachi', education: 'Masters', profession: 'Software Engineer', income: '700000-1300000', caste: 'Sheikh', height: '5.9', houseStatus: 'Own' },
      { name: 'Ali Khan', email: 'ali@test.com', phone: '03002222223', gender: 'male', city: 'Lahore', education: 'Bachelors', profession: 'Accountant', income: '400000-700000', caste: 'Malik', height: '5.8', houseStatus: 'Rent' },
      { name: 'Hassan Ahmed', email: 'hassan@test.com', phone: '03002222224', gender: 'male', city: 'Islamabad', education: 'Masters', profession: 'Project Manager', income: '800000-1500000', caste: 'Arain', height: '5.10', houseStatus: 'Own' },
      { name: 'Imran Ali', email: 'imran@test.com', phone: '03002222225', gender: 'male', city: 'Rawalpindi', education: 'Bachelors', profession: 'Engineer', income: '500000-900000', caste: 'Syed', height: '5.9', houseStatus: 'Own' },
      { name: 'Fahad Khan', email: 'fahad@test.com', phone: '03002222226', gender: 'male', city: 'Faisalabad', education: 'Masters', profession: 'Businessman', income: '1000000-2000000', caste: 'Rajput', height: '5.8', houseStatus: 'Own' },
    ];

    // ✅ CREATE PROFILE DOCUMENTS
    const allProfiles = [...females, ...males].map(p => ({
      _id: new ObjectId(),
      ...p,
      age: Math.floor(Math.random() * 10) + 23,
      dob: new Date(),
      role: 'applicant',
      profileStatus: 'approved',
      active: true,
      password: hashPassword('password123'),
      emailVerified: true,
      bio: 'Looking for genuine connection',
      photo: `https://i.pravatar.cc/150?img=${Math.random() * 70}`,
      profileCompletion: 100,
      paymentStatus: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await profilesCol.insertMany(allProfiles);
    console.log(`✅ Seeded ${allProfiles.length} test profiles`);

    res.json({ success: true, message: `Seeded ${allProfiles.length} profiles` });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Seed failed', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;