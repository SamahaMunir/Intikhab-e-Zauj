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

    const profilesCol = db.collection('profiles');

    // Staff/admin now live in the shared `profiles` collection (role-based).
    const staffMeta = { source: 'staff_entry', registeredBy: 'staff', emailVerified: true, active: true };
    if (await profilesCol.countDocuments({ role: { $in: ['staff', 'admin'] } }) === 0) {
      await profilesCol.insertOne({
        email: 'admin@intikhab.com',
        name: 'Admin User',
        password: hashPassword('admin123'),
        passwordSet: true,
        role: 'admin',
        status: 'active',
        createdAt: new Date(),
        createdBy: 'system',
        ...staffMeta,
      });
      await profilesCol.insertOne({
        email: 'staff@nikahnetwork.pk',
        name: 'Ayesha Staff',
        password: hashPassword('staff123'),
        passwordSet: true,
        role: 'staff',
        status: 'active',
        createdAt: new Date(),
        createdBy: 'system',
        ...staffMeta,
      });
      console.log('✓ Initial staff seeded (in profiles)');
    } else {
      console.log('✓ Staff already exists, skipping');
    }
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
        photo: (() => {
          const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><circle cx="60" cy="60" r="60" fill="#1D4ED8"/><circle cx="60" cy="60" r="56" fill="none" stroke="#93C5FD" stroke-width="2" opacity="0.4"/><text x="60" y="76" text-anchor="middle" font-size="40" font-family="Arial,Helvetica,sans-serif" font-weight="700" fill="white" letter-spacing="2">UK</text></svg>';
          return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
        })(),
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
