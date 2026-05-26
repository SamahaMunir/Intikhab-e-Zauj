const { MongoClient } = require('mongodb');

const DATABASE_URL = process.env.DATABASE_URL || 'mongodb+srv://samimunir196_db_user:hAYDBiHMyEnvXTV0@cluster0.8avsmql.mongodb.net/?Intikhab-e-Zauj=Cluster0';

async function addUserProfile() {
  const client = new MongoClient(DATABASE_URL);
  
  try {
    await client.connect();
    const db = client.db('intikhab_dev');
    const profilesCol = db.collection('profiles');

    // User's profile ID from JWT token
    const userId = '6a107ece86657cc5f284f9e7';

    // Check if already exists
    const existing = await profilesCol.findOne({ _id: userId });
    if (existing) {
      console.log('✓ User profile already exists');
      await client.close();
      return;
    }

    // Create profile matching test data structure
    const userProfile = {
      _id: userId,
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
      profileCompletion: 100,
      paymentStatus: 'completed',
      profileStatus: 'approved',
      createdAt: new Date(),
    };

    const result = await profilesCol.insertOne(userProfile);
    console.log('✓ User profile added with ID:', result.insertedId);

    // Verify
    const count = await profilesCol.countDocuments();
    console.log(`✓ Total profiles in database: ${count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

addUserProfile();
