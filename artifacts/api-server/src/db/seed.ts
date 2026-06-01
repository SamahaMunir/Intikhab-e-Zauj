import { Db, ObjectId } from 'mongodb';
import { hashPassword } from '../utils/password.js';

// Gender-coded avatars: blue background = male, pink = female
function maleAvatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=ffffff&size=150&bold=true`;
}
function femaleAvatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ec4899&color=ffffff&size=150&bold=true`;
}

// Validation guard — throws if gender/name mismatch detected
function validateProfile(p: { name: string; gender: string }) {
  const femaleMarkers = ['fatima','ayesha','zainab','hira','maryam','nida','aisha','sara','amina','bushra','sana','rabia','rukhsana','sadia','asma','naila','fozia','kiran','afshan','mehwish','iqra'];
  const maleMarkers   = ['ahmed','ali','hassan','imran','fahad','faisal','bilal','usman','usama','omar','adnan','tariq','kamran','shahid','asif','zubair','naveed','waheed'];
  const first = p.name.split(' ')[0].toLowerCase();
  if (p.gender === 'male'   && femaleMarkers.includes(first)) throw new Error(`Seed error: "${p.name}" has female name but gender=male`);
  if (p.gender === 'female' && maleMarkers.includes(first))   throw new Error(`Seed error: "${p.name}" has male name but gender=female`);
}

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
    const existingProfiles = await profilesCol.countDocuments({ role: 'applicant' });

    if (existingProfiles >= 15) {
      console.log('✓ Test applicant profiles already exist, skipping');
    } else {
      // ── FEMALE profiles (9) ─────────────────────────────────────────────────
      // Rules: female name, gender=female, femaleAvatar(), realistic DOB from age
      const testProfiles = [
        {
          name: 'Fatima Khan',       gender: 'female', age: 25, dob: new Date('1999-05-15'),
          email: 'fatima.khan@test.com', phone: '03001234567',
          city: 'Lahore', education: 'Bachelors', profession: 'Software Engineer',
          income: '500000-1000000', caste: 'Arain', height: '5.4',
          houseStatus: 'owned', houseArea: '2500',
          bio: 'Loving, caring, looking for genuine connection.',
          photo: femaleAvatar('Fatima Khan'),
        },
        {
          name: 'Ayesha Ali',        gender: 'female', age: 24, dob: new Date('2000-08-22'),
          email: 'ayesha.ali@test.com', phone: '03001234568',
          city: 'Lahore', education: 'Masters', profession: 'Doctor',
          income: '800000-1500000', caste: 'Sheikh', height: '5.3',
          houseStatus: 'owned', houseArea: '3000',
          bio: 'Career-focused with strong family values.',
          photo: femaleAvatar('Ayesha Ali'),
        },
        {
          name: 'Zainab Hassan',     gender: 'female', age: 28, dob: new Date('1996-03-10'),
          email: 'zainab.hassan@test.com', phone: '03001234569',
          city: 'Islamabad', education: 'Bachelors', profession: 'Teacher',
          income: '300000-600000', caste: 'Malik', height: '5.5',
          houseStatus: 'rented', houseArea: '1800',
          bio: 'Family-oriented, loves reading and traveling.',
          photo: femaleAvatar('Zainab Hassan'),
        },
        {
          name: 'Hira Ahmed',        gender: 'female', age: 25, dob: new Date('1999-11-07'),
          email: 'hira.ahmed@test.com', phone: '03001234570',
          city: 'Rawalpindi', education: 'Bachelors', profession: 'Business Analyst',
          income: '400000-800000', caste: 'Syed', height: '5.2',
          houseStatus: 'owned', houseArea: '2200',
          bio: 'Ambitious and independent, seeking serious commitment.',
          photo: femaleAvatar('Hira Ahmed'),
        },
        {
          name: 'Maryam Khan',       gender: 'female', age: 27, dob: new Date('1997-07-19'),
          email: 'maryam.khan@test.com', phone: '03001234571',
          city: 'Faisalabad', education: 'Masters', profession: 'Consultant',
          income: '600000-1200000', caste: 'Rajput', height: '5.3',
          houseStatus: 'owned', houseArea: '2800',
          bio: 'Seeking a serious, God-fearing relationship.',
          photo: femaleAvatar('Maryam Khan'),
        },
        {
          name: 'Nida Malik',        gender: 'female', age: 29, dob: new Date('1995-12-08'),
          email: 'nida.malik@test.com', phone: '03001234578',
          city: 'Lahore', education: 'Masters', profession: 'HR Manager',
          income: '600000-1200000', caste: 'Malik', height: '5.5',
          houseStatus: 'owned', houseArea: '2700',
          bio: 'Professional woman with strong family values.',
          photo: femaleAvatar('Nida Malik'),
        },
        {
          name: 'Aisha Hussain',     gender: 'female', age: 27, dob: new Date('1997-01-22'),
          email: 'aisha.hussain@test.com', phone: '03001234580',
          city: 'Islamabad', education: 'Bachelors', profession: 'Graphics Designer',
          income: '400000-800000', caste: 'Arain', height: '5.2',
          houseStatus: 'rented', houseArea: '1900',
          bio: 'Creative and independent, looking for a genuine partner.',
          photo: femaleAvatar('Aisha Hussain'),
        },
        {
          name: 'Sara Bibi',         gender: 'female', age: 25, dob: new Date('1999-03-12'),
          email: 'sara.bibi@test.com', phone: '03001234581',
          city: 'Rawalpindi', education: 'Bachelors', profession: 'Engineer',
          income: '500000-900000', caste: 'Syed', height: '5.4',
          houseStatus: 'owned', houseArea: '2200',
          bio: 'Practical and family-oriented.',
          photo: femaleAvatar('Sara Bibi'),
        },
        {
          name: 'Amina Qureshi',     gender: 'female', age: 26, dob: new Date('1998-09-18'),
          email: 'amina.qureshi@test.com', phone: '03001234582',
          city: 'Faisalabad', education: 'Masters', profession: 'Businesswoman',
          income: '700000-1300000', caste: 'Rajput', height: '5.3',
          houseStatus: 'owned', houseArea: '2800',
          bio: 'Independent and goal-driven.',
          photo: femaleAvatar('Amina Qureshi'),
        },
        // ── MALE profiles (6) ─────────────────────────────────────────────────
        // Rules: male name, gender=male, maleAvatar()
        {
          name: 'Ahmed Hassan',      gender: 'male', age: 28, dob: new Date('1996-02-14'),
          email: 'ahmed.hassan@test.com', phone: '03001234572',
          city: 'Lahore', education: 'Masters', profession: 'Software Engineer',
          income: '700000-1300000', caste: 'Sheikh', height: '5.9',
          houseStatus: 'owned', houseArea: '2500',
          bio: 'Tech enthusiast with strong family values.',
          photo: maleAvatar('Ahmed Hassan'),
        },
        {
          name: 'Ali Khan',          gender: 'male', age: 26, dob: new Date('1998-06-11'),
          email: 'ali.khan@test.com', phone: '03001234573',
          city: 'Lahore', education: 'Bachelors', profession: 'Accountant',
          income: '400000-700000', caste: 'Malik', height: '5.8',
          houseStatus: 'rented', houseArea: '2600',
          bio: 'Simple, sincere and caring.',
          photo: maleAvatar('Ali Khan'),
        },
        {
          name: 'Hassan Ahmed',      gender: 'male', age: 30, dob: new Date('1994-09-23'),
          email: 'hassan.ahmed@test.com', phone: '03001234574',
          city: 'Islamabad', education: 'Masters', profession: 'Project Manager',
          income: '800000-1500000', caste: 'Arain', height: '5.10',
          houseStatus: 'owned', houseArea: '3200',
          bio: 'Looking for a compatible and pious life partner.',
          photo: maleAvatar('Hassan Ahmed'),
        },
        {
          name: 'Imran Ali',         gender: 'male', age: 27, dob: new Date('1997-01-30'),
          email: 'imran.ali@test.com', phone: '03001234575',
          city: 'Rawalpindi', education: 'Bachelors', profession: 'Engineer',
          income: '500000-900000', caste: 'Syed', height: '5.9',
          houseStatus: 'owned', houseArea: '2100',
          bio: 'Honest and hardworking.',
          photo: maleAvatar('Imran Ali'),
        },
        {
          name: 'Fahad Khan',        gender: 'male', age: 28, dob: new Date('1996-04-05'),
          email: 'fahad.khan@test.com', phone: '03001234576',
          city: 'Faisalabad', education: 'Masters', profession: 'Businessman',
          income: '1000000-2000000', caste: 'Rajput', height: '5.8',
          houseStatus: 'owned', houseArea: '2900',
          bio: 'Successful entrepreneur, family-oriented.',
          photo: maleAvatar('Fahad Khan'),
        },
        {
          name: 'Faisal Ahmed',      gender: 'male', age: 32, dob: new Date('1992-07-18'),
          email: 'faisal.ahmed@test.com', phone: '03001234579',
          city: 'Lahore', education: 'MBA', profession: 'Business Analyst',
          income: '1000000-1500000', caste: 'Malik', height: '5.9',
          houseStatus: 'owned', houseArea: '2400',
          bio: 'Successful professional seeking serious commitment.',
          photo: maleAvatar('Faisal Ahmed'),
        },
      ];

      // Validate every profile before insert
      for (const p of testProfiles) validateProfile(p);

      const profilesToInsert = testProfiles.map(profile => ({
        _id: new ObjectId(),
        ...profile,
        role: 'applicant',
        profileStatus: 'approved',
        active: true,
        profileCompletion: 100,
        paymentStatus: 'completed',
        password: hashPassword('password123'),
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await profilesCol.insertMany(profilesToInsert);
      console.log(`✓ ${testProfiles.length} test profiles seeded (9F + 6M, gender-validated)`);
    }

    // ── Usama test user (Lahore so location filter passes) ────────────────────
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
        city: 'Lahore',          // Lahore — matches most seed profiles
        education: 'Bachelors',
        profession: 'Software Engineer',
        income: '500000-1000000',
        caste: 'Sheikh',
        height: '5.9',
        houseStatus: 'owned',
        houseArea: '2500',
        bio: 'Tech enthusiast looking for genuine connection.',
        photo: maleAvatar('Usama Khalid'),
        password: hashPassword('password123'),
        emailVerified: true,
        profileCompletion: 100,
        paymentStatus: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✓ Test user Usama Khalid seeded (Lahore)');
    }

  } catch (error) {
    if (error instanceof Error && error.message.includes('E11000')) {
      console.log('ℹ Seed data already exists');
    } else {
      console.error('Seed error:', error);
    }
  }
}
