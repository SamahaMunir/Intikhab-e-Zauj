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
        password: hashPassword('admin123'),
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
        password: hashPassword('staff123'),
        passwordSet: true,
        role: 'staff',
        status: 'active',
        createdAt: new Date(),
        createdBy: 'system',
      });

      console.log('✓ Initial staff seeded');
    }

    // ✅ SEED 15 TEST PROFILES TO 'profiles' COLLECTION
    console.log('\n🌱 Seeding 15 test applicant profiles...');
    
    // ✅ FIX: Use 'profiles' collection for ALL user profiles
    const profilesCol = db.collection('profiles');
    const existingProfiles = await profilesCol.countDocuments({ role: 'applicant' });

    if (existingProfiles >= 15) {
      console.log('✓ Test applicant profiles already exist, skipping seed');
    } else {

    // ✅ Test profile data - WITH ALL REQUIRED FIELDS FOR MATCHING
    const testProfiles = [
      {
        name: 'Fatima Khan',
        email: 'fatima.khan@test.com',
        phone: '03001234567',
        gender: 'female',
        age: 25,
        dob: new Date('1999-05-15'),
        city: 'Lahore',
        education: 'Bachelors',
        profession: 'Software Engineer',
        income: '500000-1000000',
        caste: 'Arain',
        height: '5.4',
        houseStatus: 'owned',
        houseArea: '2500',
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
        houseStatus: 'owned',
        houseArea: '3000',
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
        houseStatus: 'rented',
        houseArea: '1800',
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
        houseStatus: 'owned',
        houseArea: '2200',
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
        houseStatus: 'owned',
        houseArea: '2800',
        bio: 'Seeking a serious relationship',
        photo: 'https://i.pravatar.cc/150?img=5',
      },
      {
        name: 'Ahmed Hassan',
        email: 'ahmed.hassan@test.com',
        phone: '03001234572',
        gender: 'male',
        age: 28,
        dob: new Date('1996-02-14'),
        city: 'Lahore',
        education: 'Masters',
        profession: 'Software Engineer',
        income: '700000-1300000',
        caste: 'Sheikh',
        height: '5.9',
        houseStatus: 'owned',
        houseArea: '2500',
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
        houseStatus: 'rented',
        houseArea: '2600',
        bio: 'Simple, sincere, and caring',
        photo: 'https://i.pravatar.cc/150?img=7',
      },
      {
        name: 'Hassan Ahmed',
        email: 'hassan.ahmed@test.com',
        phone: '03001234574',
        gender: 'male',
        age: 30,
        dob: new Date('1994-09-23'),
        city: 'Islamabad',
        education: 'Masters',
        profession: 'Project Manager',
        income: '800000-1500000',
        caste: 'Arain',
        height: '5.10',
        houseStatus: 'owned',
        houseArea: '3200',
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
        houseStatus: 'owned',
        houseArea: '2100',
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
        houseStatus: 'owned',
        houseArea: '2900',
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
        houseStatus: 'owned',
        houseArea: '2700',
        bio: 'Professional woman with family values',
        photo: 'https://i.pravatar.cc/150?img=3',
      },
      {
        name: 'Faisal Ahmed',
        email: 'faisal.ahmed@test.com',
        phone: '03001234579',
        gender: 'male',
        age: 32,
        dob: new Date('1992-07-18'),
        city: 'Lahore',
        education: 'MBA',
        profession: 'Business Analyst',
        income: '1000000-1500000',
        caste: 'Malik',
        height: '5.9',
        houseStatus: 'owned',
        houseArea: '2400',
        bio: 'Successful professional seeking serious commitment',
        photo: 'https://i.pravatar.cc/150?img=4',
      },
      {
        name: 'Aisha Hussain',
        email: 'aisha.hussain@test.com',
        phone: '03001234580',
        gender: 'female',
        age: 27,
        dob: new Date('1997-01-22'),
        city: 'Islamabad',
        education: 'Bachelors',
        profession: 'Graphics Designer',
        income: '400000-800000',
        caste: 'Arain',
        height: '5.2',
        houseStatus: 'rented',
        houseArea: '1900',
        bio: 'Creative, independent woman looking for partner',
        photo: 'https://i.pravatar.cc/150?img=5',
      },
      {
        name: 'Sara Bibi',
        email: 'sara.bibi@test.com',
        phone: '03001234581',
        gender: 'female',
        age: 25,
        dob: new Date('1999-03-12'),
        city: 'Rawalpindi',
        education: 'Bachelors',
        profession: 'Engineer',
        income: '500000-900000',
        caste: 'Syed',
        height: '5.4',
        houseStatus: 'owned',
        houseArea: '2200',
        bio: 'Practical and family oriented',
        photo: 'https://i.pravatar.cc/150?img=11',
      },
      {
        name: 'Amina Qureshi',
        email: 'amina.qureshi@test.com',
        phone: '03001234582',
        gender: 'female',
        age: 26,
        dob: new Date('1998-09-18'),
        city: 'Faisalabad',
        education: 'Masters',
        profession: 'Businesswoman',
        income: '700000-1300000',
        caste: 'Rajput',
        height: '5.3',
        houseStatus: 'owned',
        houseArea: '2800',
        bio: 'Independent and goal-driven',
        photo: 'https://i.pravatar.cc/150?img=12',
      },
    ];

    // ✅ INSERT TEST PROFILES WITH ALL REQUIRED FIELDS
    const profilesToInsert = testProfiles.map(profile => ({
      _id: new ObjectId(),
      ...profile,
      
      // ✅ ROLE & STATUS
      role: 'applicant',
      profileStatus: 'approved',
      active: true,
      
      // ✅ COMPLETION & PAYMENT
      profileCompletion: 100,
      paymentStatus: 'completed',
      
      // ✅ AUTHENTICATION
      password: hashPassword('password123'),
      emailVerified: true,
      
      // ✅ TIMESTAMPS
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    }));

    await profilesCol.insertMany(profilesToInsert);

    console.log(`✓ ${testProfiles.length} test applicant profiles seeded!`);
    console.log('   Cities:', ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad']);
    console.log('   Ages:', '24-31');
    console.log('   All profiles: APPROVED + PAYMENT COMPLETED + EMAIL VERIFIED');
    }

    // ✅ INSERT USER'S OWN PROFILE (from test login)
    const userProfileId = '6a159819c6d8c440ed44246b';
    const userExists = await profilesCol.findOne({ _id: new ObjectId(userProfileId) });
    
    if (!userExists) {
      const userProfile = {
        _id: new ObjectId(userProfileId),
        
        // IDENTITY
        name: 'Usama Khalid',
        email: 'usamakhalid.uk14@gmail.com',
        phone: '03001234599',
        gender: 'male',
        age: 26,
        dob: new Date('1998-06-10'),
        
        // ROLE & STATUS
        role: 'applicant',
        profileStatus: 'approved',
        active: true,
        
        // PROFILE DATA - ALL FIELDS FOR MATCHING
        city: 'Karachi',
        education: 'Bachelors',
        profession: 'Software Engineer',
        income: '500000-1000000',
        caste: 'Sheikh',
        height: '5.9',
        houseStatus: 'owned',
        houseArea: '2500',
        bio: 'Tech enthusiast looking for genuine connection',
        photo: 'https://i.pravatar.cc/150?img=33',
        
        // AUTHENTICATION
        password: hashPassword('password123'),
        emailVerified: true,
        
        // COMPLETION & PAYMENT
        profileCompletion: 100,
        paymentStatus: 'completed',
        
        // TIMESTAMPS
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await profilesCol.insertOne(userProfile);
      console.log(`✓ User test profile added (${userProfileId})`);
    }

  } catch (error) {
    if (error instanceof Error && error.message.includes('E11000')) {
      console.log('ℹ Data already exists');
    } else {
      console.error('Error seeding data:', error);
    }
  }
}
