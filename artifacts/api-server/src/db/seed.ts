import { Db, ObjectId } from 'mongodb';
import { hashPassword } from '../utils/password.js';

export async function seedTestData(db: Db) {
  try {
    console.log('🌱 Seeding initial staff...');
    
    const staffCol = db.collection('staff');
    const existing = await staffCol.countDocuments();
    
    if (existing > 0) {
      console.log('✓ Staff already exists, skipping seed');
    } else {
      // Seed default admin
      await staffCol.insertOne({
        email: 'admin@intikhab.com',
        name: 'Admin User',
        password: 'admin123',
        passwordSet: true,
        role: 'admin',
        status: 'active',
        createdAt: new Date(),
        createdBy: 'system',
      });

      // Seed default staff
      await staffCol.insertOne({
        email: 'staff@nikahnetwork.pk',
        name: 'Ayesha Staff',
        password: 'staff123',
        passwordSet: true,
        role: 'staff',
        status: 'active',
        createdAt: new Date(),
        createdBy: 'system',
      });

      console.log('✓ Initial staff seeded');
    }

    // ✅ SEED 15 TEST PROFILES
    console.log('\n🌱 Seeding 15 test profiles...');
    
    const profilesCol = db.collection('profiles');
    const existingProfiles = await profilesCol.countDocuments();

    if (existingProfiles >= 15) {
      console.log('✓ Test profiles already exist, skipping seed');
      // Continue to ensure user profile is added (don't return early)
    } else {

    // ✅ Test profile data
    const testProfiles = [
      {
        name: 'Fatima Khan',
        email: 'fatima.khan@test.com',
        phone: '03001234567',
        gender: 'female',
        age: 26,
        dob: new Date('1998-05-15'),
        city: 'Karachi',
        education: 'Bachelors',
        profession: 'Software Engineer',
        income: '500000-1000000',
        caste: 'Arain',
        height: '5.4',
        houseStatus: 'Own',
        houseArea: '2000 sqft',
        bio: 'Loving, caring, and looking for genuine connection',
        photo: 'https://i.pravatar.cc/150?img=1',
      },
      {
        name: 'Ayesha Ali',
        email: 'ayesha.ali@test.com',
        phone: '03001234568',
        gender: 'female',
        age: 24,
        dob: new Date('2000-08-22'),
        city: 'Lahore',
        education: 'Masters',
        profession: 'Doctor',
        income: '800000-1500000',
        caste: 'Sheikh',
        height: '5.3',
        houseStatus: 'Own',
        houseArea: '2500 sqft',
        bio: 'Career-focused with family values',
        photo: 'https://i.pravatar.cc/150?img=2',
      },
      {
        name: 'Zainab Hassan',
        email: 'zainab.hassan@test.com',
        phone: '03001234569',
        gender: 'female',
        age: 28,
        dob: new Date('1996-03-10'),
        city: 'Islamabad',
        education: 'Bachelors',
        profession: 'Teacher',
        income: '300000-600000',
        caste: 'Malik',
        height: '5.5',
        houseStatus: 'Rent',
        houseArea: '1500 sqft',
        bio: 'Family-oriented, loves traveling',
        photo: 'https://i.pravatar.cc/150?img=3',
      },
      {
        name: 'Hira Ahmed',
        email: 'hira.ahmed@test.com',
        phone: '03001234570',
        gender: 'female',
        age: 25,
        dob: new Date('1999-11-07'),
        city: 'Rawalpindi',
        education: 'Bachelors',
        profession: 'Business Analyst',
        income: '400000-800000',
        caste: 'Syed',
        height: '5.2',
        houseStatus: 'Own',
        houseArea: '1800 sqft',
        bio: 'Ambitious and independent',
        photo: 'https://i.pravatar.cc/150?img=4',
      },
      {
        name: 'Maryam Khan',
        email: 'maryam.khan@test.com',
        phone: '03001234571',
        gender: 'female',
        age: 27,
        dob: new Date('1997-07-19'),
        city: 'Faisalabad',
        education: 'Masters',
        profession: 'Consultant',
        income: '600000-1200000',
        caste: 'Rajput',
        height: '5.3',
        houseStatus: 'Own',
        houseArea: '2200 sqft',
        bio: 'Seeking a serious relationship',
        photo: 'https://i.pravatar.cc/150?img=5',
      },
      {
        name: 'Ahmed Hassan',
        email: 'ahmed.hassan@test.com',
        phone: '03001234572',
        gender: 'male',
        age: 29,
        dob: new Date('1995-02-14'),
        city: 'Karachi',
        education: 'Masters',
        profession: 'Software Engineer',
        income: '700000-1300000',
        caste: 'Sheikh',
        height: '5.9',
        houseStatus: 'Own',
        houseArea: '2500 sqft',
        bio: 'Tech enthusiast, family values',
        photo: 'https://i.pravatar.cc/150?img=6',
      },
      {
        name: 'Ali Khan',
        email: 'ali.khan@test.com',
        phone: '03001234573',
        gender: 'male',
        age: 26,
        dob: new Date('1998-06-11'),
        city: 'Lahore',
        education: 'Bachelors',
        profession: 'Accountant',
        income: '400000-700000',
        caste: 'Malik',
        height: '5.8',
        houseStatus: 'Rent',
        houseArea: '1600 sqft',
        bio: 'Simple, sincere, and caring',
        photo: 'https://i.pravatar.cc/150?img=7',
      },
      {
        name: 'Hassan Ahmed',
        email: 'hassan.ahmed@test.com',
        phone: '03001234574',
        gender: 'male',
        age: 31,
        dob: new Date('1993-09-23'),
        city: 'Islamabad',
        education: 'Masters',
        profession: 'Project Manager',
        income: '800000-1500000',
        caste: 'Arain',
        height: '5.10',
        houseStatus: 'Own',
        houseArea: '3000 sqft',
        bio: 'Looking for compatible life partner',
        photo: 'https://i.pravatar.cc/150?img=8',
      },
      {
        name: 'Imran Ali',
        email: 'imran.ali@test.com',
        phone: '03001234575',
        gender: 'male',
        age: 27,
        dob: new Date('1997-01-30'),
        city: 'Rawalpindi',
        education: 'Bachelors',
        profession: 'Engineer',
        income: '500000-900000',
        caste: 'Syed',
        height: '5.9',
        houseStatus: 'Own',
        houseArea: '2000 sqft',
        bio: 'Honest and hardworking',
        photo: 'https://i.pravatar.cc/150?img=9',
      },
      {
        name: 'Fahad Khan',
        email: 'fahad.khan@test.com',
        phone: '03001234576',
        gender: 'male',
        age: 28,
        dob: new Date('1996-04-05'),
        city: 'Faisalabad',
        education: 'Masters',
        profession: 'Businessman',
        income: '1000000-2000000',
        caste: 'Rajput',
        height: '5.8',
        houseStatus: 'Own',
        houseArea: '3500 sqft',
        bio: 'Successful entrepreneur',
        photo: 'https://i.pravatar.cc/150?img=10',
      },
      {
    name: 'Nida Malik',
    email: 'nida.malik@test.com',
    phone: '03001234578',
    gender: 'female',
    age: 29,
    dob: new Date('1996-12-08'),
    city: 'Lahore',
    education: 'Masters',
    profession: 'HR Manager',
    income: '600000-1200000',
    caste: 'Malik',
    height: '5.5',
    houseStatus: 'Own',
    houseArea: '2200 sqft',
    bio: 'Professional woman with family values',
    photo: 'https://i.pravatar.cc/150?img=3',
  },
  {
    name: 'Faisal Ahmed',
    email: 'faisal.ahmed@test.com',
    phone: '03001234579',
    gender: 'male',
    age: 33,
    dob: new Date('1991-07-18'),
    city: 'Karachi',
    caste: 'Malik',
    education: 'MBA',
    profession: 'Business Analyst',
    income: '1000000-1500000',
    height: '5.9',
    houseStatus: 'Own',
    houseArea: '3000 sqft',
    bio: 'Successful professional seeking serious commitment',
    photo: 'https://i.pravatar.cc/150?img=4',
  },
  {
    name: 'Aisha Hussain',
    email: 'aisha.hussain@test.com',
    phone: '03001234580',
    gender: 'female',
    age: 27,
    dob: new Date('1998-01-22'),
    city: 'Islamabad',
    education: 'Bachelors',
    profession: 'Graphics Designer',
    income: '400000-800000',
    caste: 'Hussain',
    height: '5.2',
    houseStatus: 'Rented',
    houseArea: '1500 sqft',
    bio: 'Creative, independent woman looking for partner',
    photo: 'https://i.pravatar.cc/150?img=5',
  }
    ];

    // ✅ INSERT TEST PROFILES
    const profilesToInsert = testProfiles.map(profile => ({
      _id: new ObjectId(),
      ...profile,
      profileStatus: 'approved', // ✅ APPROVED
      profileCompletion: 100,
      profileCompletedAt: new Date(),
      paymentStatus: 'completed', // ✅ PAID
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random past date
      updatedAt: new Date(),
      role: 'applicant',
      emailVerified: true,
      active: true,
    }));

    await profilesCol.insertMany(profilesToInsert);

    console.log(`✓ ${testProfiles.length} test profiles seeded!`);
    console.log('   Cities:', ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad']);
    console.log('   Ages:', '24-31');
    console.log('   All profiles: APPROVED + PAYMENT COMPLETED');
    }

    // ✅ INSERT USER'S PROFILE (from JWT token: 6a107ece86657cc5f284f9e7) - ALWAYS CHECK
    const userProfileId = '6a107ece86657cc5f284f9e7';
    const userExists = await profilesCol.findOne({ _id: userProfileId });
    
    if (!userExists) {
      const userProfile = {
        _id: userProfileId,
        name: 'Usama Khalid',
        email: 'usamakhalid.uk14@gmail.com',
        phone: '03001234599',
        gender: 'male',
        age: 26,
        dob: new Date('1998-06-10'),
        city: 'Karachi',
        education: 'Bachelors',
        profession: 'Software Engineer',
        income: '500000-1000000',
        caste: 'Sheikh',
        height: '5.9',
        houseStatus: 'Own',
        houseArea: '2500 sqft',
        bio: 'Tech enthusiast looking for genuine connection',
        photo: 'https://i.pravatar.cc/150?img=33',
        profileStatus: 'approved',
        profileCompletion: 100,
        paymentStatus: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
        role: 'applicant',
        emailVerified: true,
        active: true,
      };
      
      await profilesCol.insertOne(userProfile);
      console.log(`✓ User profile added (${userProfileId})`);
    }

  } catch (error) {
    if (error instanceof Error && error.message.includes('E11000')) {
      console.log('ℹ Data already exists');
    } else {
      console.error('Error seeding data:', error);
    }
  }
}