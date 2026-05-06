import { Db } from 'mongodb';

export async function seedTestData(db: Db) {
  try {
    console.log('🌱 Seeding initial staff...');
    
    const staffCol = db.collection('staff');
    const existing = await staffCol.countDocuments();
    
    if (existing > 0) {
      console.log('✓ Staff already exists, skipping seed');
      return;
    }

    // Seed default admin with password already set
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

    // Seed default staff with password already set
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
  } catch (error) {
    if (error instanceof Error && error.message.includes('E11000')) {
      console.log('ℹ Staff already exists');
    } else {
      console.error('Error seeding staff:', error);
    }
  }
}