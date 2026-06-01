import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection';
import { hashPassword } from '../utils/password';

const router = Router();

router.post('/seed', async (_req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const col = db.collection('profiles');

    // Only delete applicant profiles — never touch staff accounts
    await col.deleteMany({ role: 'applicant' });

    const profiles = [
      // 8 FEMALE profiles
      { name: 'Fatima Khan', email: 'fatima@test.com', phone: '03001111101', gender: 'female', age: 25, city: 'Lahore', education: 'Bachelors', profession: 'Engineer', caste: 'Arain', height: '5.4', houseStatus: 'owned', houseArea: '2500' },
      { name: 'Ayesha Ali', email: 'ayesha@test.com', phone: '03001111102', gender: 'female', age: 24, city: 'Lahore', education: 'Masters', profession: 'Doctor', caste: 'Sheikh', height: '5.3', houseStatus: 'owned', houseArea: '3000' },
      { name: 'Zainab Hassan', email: 'zainab@test.com', phone: '03001111103', gender: 'female', age: 28, city: 'Islamabad', education: 'Bachelors', profession: 'Teacher', caste: 'Malik', height: '5.5', houseStatus: 'rented', houseArea: '1800' },
      { name: 'Hira Ahmed', email: 'hira@test.com', phone: '03001111104', gender: 'female', age: 25, city: 'Rawalpindi', education: 'Bachelors', profession: 'Business Analyst', caste: 'Syed', height: '5.2', houseStatus: 'owned', houseArea: '2200' },
      { name: 'Maryam Khan', email: 'maryam@test.com', phone: '03001111105', gender: 'female', age: 27, city: 'Faisalabad', education: 'Masters', profession: 'Consultant', caste: 'Rajput', height: '5.3', houseStatus: 'owned', houseArea: '2800' },
      { name: 'Nida Malik', email: 'nida@test.com', phone: '03001111106', gender: 'female', age: 29, city: 'Lahore', education: 'Masters', profession: 'HR Manager', caste: 'Malik', height: '5.5', houseStatus: 'owned', houseArea: '2700' },
      { name: 'Sara Bibi', email: 'sara@test.com', phone: '03001111107', gender: 'female', age: 25, city: 'Rawalpindi', education: 'Bachelors', profession: 'Engineer', caste: 'Syed', height: '5.4', houseStatus: 'owned', houseArea: '2200' },
      { name: 'Amina Qureshi', email: 'amina@test.com', phone: '03001111108', gender: 'female', age: 26, city: 'Faisalabad', education: 'Masters', profession: 'Businesswoman', caste: 'Rajput', height: '5.3', houseStatus: 'owned', houseArea: '2800' },
      // 7 MALE profiles
      { name: 'Ahmed Hassan', email: 'ahmed@test.com', phone: '03002222201', gender: 'male', age: 28, city: 'Lahore', education: 'Masters', profession: 'Software Engineer', caste: 'Sheikh', height: '5.9', houseStatus: 'owned', houseArea: '2500' },
      { name: 'Ali Khan', email: 'ali@test.com', phone: '03002222202', gender: 'male', age: 26, city: 'Lahore', education: 'Bachelors', profession: 'Accountant', caste: 'Malik', height: '5.8', houseStatus: 'rented', houseArea: '2600' },
      { name: 'Hassan Ahmed', email: 'hassan@test.com', phone: '03002222203', gender: 'male', age: 30, city: 'Islamabad', education: 'Masters', profession: 'Project Manager', caste: 'Arain', height: '5.10', houseStatus: 'owned', houseArea: '3200' },
      { name: 'Imran Ali', email: 'imran@test.com', phone: '03002222204', gender: 'male', age: 27, city: 'Rawalpindi', education: 'Bachelors', profession: 'Engineer', caste: 'Syed', height: '5.9', houseStatus: 'owned', houseArea: '2100' },
      { name: 'Fahad Khan', email: 'fahad@test.com', phone: '03002222205', gender: 'male', age: 28, city: 'Faisalabad', education: 'Masters', profession: 'Businessman', caste: 'Rajput', height: '5.8', houseStatus: 'owned', houseArea: '2900' },
      { name: 'Faisal Ahmed', email: 'faisal@test.com', phone: '03002222206', gender: 'male', age: 32, city: 'Lahore', education: 'MBA', profession: 'Business Analyst', caste: 'Malik', height: '5.9', houseStatus: 'owned', houseArea: '2400' },
      { name: 'Bilal Raza', email: 'bilal@test.com', phone: '03002222207', gender: 'male', age: 27, city: 'Rawalpindi', education: 'Bachelors', profession: 'Engineer', caste: 'Arain', height: '5.10', houseStatus: 'owned', houseArea: '2300' },
    ];

    const docs = profiles.map((p, i) => ({
      _id: new ObjectId(),
      ...p,
      income: '500000-1000000',
      dob: new Date(),
      role: 'applicant',
      profileStatus: 'approved',
      active: true,
      password: hashPassword('password123'),
      emailVerified: true,
      bio: 'Looking for a compatible life partner',
      photo: `https://i.pravatar.cc/150?img=${i + 10}`,
      profileCompletion: 100,
      paymentStatus: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await col.insertMany(docs);

    res.json({
      success: true,
      message: `Seeded ${docs.length} applicant profiles (staff accounts preserved)`,
      breakdown: { female: 8, male: 7, total: docs.length },
    });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ error: 'Seed failed', message: err instanceof Error ? err.message : 'Unknown' });
  }
});

export default router;
