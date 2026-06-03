import { Db, ObjectId } from 'mongodb';
import { hashPassword } from '../utils/password.js';
import {
  generateFemaleProfiles,
  generateMaleProfiles,
  validateSeedProfile,
} from '../lib/seedGenerator.js';

export async function seedTestData(db: Db) {
  try {
    console.log('🌱 Seeding initial staff...');

    const staffCol = db.collection('staff');
    if (await staffCol.countDocuments() === 0) {
      await staffCol.insertOne({
        email: 'admin@intikhab.com',
        name: 'Admin User',
        password: hashPassword('admin123'),
        passwordSet: true,
        role: 'admin',
        status: 'active',
        createdAt: new Date(),
        createdBy: 'system',
      });
      await staffCol.insertOne({
        email: 'staff@nikahnetwork.pk',
        name: 'Ayesha Staff',
        password: hashPassword('staff123'),
        passwordSet: true,
        role: 'staff',
        status: 'active',
        createdAt: new Date(),
        createdBy: 'system',
      });
      console.log('✓ Initial staff seeded');
    } else {
      console.log('✓ Staff already exists, skipping');
    }

    const profilesCol = db.collection('profiles');
    const existingCount = await profilesCol.countDocuments({ role: 'applicant' });

    if (existingCount >= 15) {
      console.log(`✓ ${existingCount} applicant profiles already exist, skipping`);
    } else {
      // Generate 9 female + 6 male profiles via the generator
      const females = generateFemaleProfiles(9, 0);
      const males   = generateMaleProfiles(6, 0);
      const all     = [...females, ...males];

      // Validate every profile before any insert
      for (const p of all) {
        const errors = validateSeedProfile(p);
        if (errors.length > 0) {
          throw new Error(`Seed validation failed for "${p.name}": ${errors.join('; ')}`);
        }
      }

      await profilesCol.insertMany(all);
      console.log(`✓ ${all.length} seed profiles inserted (${females.length}F + ${males.length}M, all validated)`);
    }

    // ── Usama test user (real account, pinned ObjectId) ───────────────────────
    const userProfileId = '6a159819c6d8c440ed44246b';
    const userExists = await profilesCol.findOne({ _id: new ObjectId(userProfileId) });

    if (!userExists) {
      await profilesCol.insertOne({
        _id: new ObjectId(userProfileId),
        name: 'Usama Khalid',
        email: 'usamakhalid.uk14@gmail.com',
        phone: '03001234599',
        gender: 'male',
        age: 26,
        dob: new Date('1998-06-10'),
        role: 'applicant',
        profileStatus: 'approved',
        active: true,
        city: 'Lahore',
        education: 'Bachelors',
        profession: 'Software Engineer',
        monthlyIncome: '500000-1000000',
        caste: 'Sheikh',
        height: '5.9',
        houseStatus: 'owned',
        houseArea: '2500',
        bio: 'Tech enthusiast looking for genuine connection.',
        photo: 'https://avatar.iran.liara.app/public/boy?username=UsamaKhalid',
        country: 'Pakistan',
        religion: 'Islam',
        sect: 'Sunni',
        maritalStatus: 'Single',
        designation: 'Software Engineer',
        fatherOccupation: 'Businessman',
        motherOccupation: 'Housewife',
        matchCriteria: 'Educated, family-oriented.',
        password: hashPassword('password123'),
        emailVerified: true,
        profileCompletion: 100,
        paymentStatus: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✓ Test user Usama Khalid seeded (Lahore, male, men/20.jpg)');
    }

  } catch (error) {
    if (error instanceof Error && error.message.includes('E11000')) {
      console.log('ℹ Seed data already exists (duplicate key)');
    } else {
      console.error('Seed error:', error);
    }
  }
}
