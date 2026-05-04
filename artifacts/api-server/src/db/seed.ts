import { Db } from 'mongodb';

type SeedUser = {
  _id: string;
  email: string;
  name: string;
  profileStatus: 'pending' | 'approved';
  age: number;
  city: string;
};

export async function seedTestData(db: Db) {
  const usersCollection = db.collection<SeedUser>('users');
  
  // Check if data already exists
  const count = await usersCollection.countDocuments();
  if (process.env.NODE_ENV === 'production') {
  console.log('ℹ️  Skipping seed in production');
  return;
}
  console.log('🌱 Seeding test data...');

  // Insert test users
  const testUsers: SeedUser[] = [
    {
      _id: 'u1',
      email: 'zainab@example.com',
      name: 'Zainab Khan',
      profileStatus: 'pending',
      age: 28,
      city: 'Karachi',
    },
    {
      _id: 'u2',
      email: 'ayesha@example.com',
      name: 'Ayesha Ali',
      profileStatus: 'pending',
      age: 26,
      city: 'Lahore',
    },
    {
      _id: 'u3',
      email: 'fatima@example.com',
      name: 'Fatima Hassan',
      profileStatus: 'pending',
      age: 30,
      city: 'Islamabad',
    },
    {
      _id: 'u4',
      email: 'hira@example.com',
      name: 'Hira Ahmed',
      profileStatus: 'approved',
      age: 25,
      city: 'Rawalpindi',
    },
  ];

  try {
    await usersCollection.insertMany(testUsers);
    console.log(`✓ Seeded ${testUsers.length} test users`);
  } catch (error) {
    console.error('Error seeding users:', error);
  }
}