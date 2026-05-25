import { MongoClient, ObjectId } from 'mongodb';

async function insertProfile() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('intikhab_dev');
    const profilesCol = db.collection('profiles');
    
    const result = await profilesCol.insertOne({
      _id: new ObjectId("6a107ece86657cc5f284f9e7"),
      email: "usamakhalid.uk14@gmail.com",
      name: "fake",
      gender: "male",
      age: 28,
      dob: new Date("1996-01-15"),
      city: "Lahore",
      education: "Masters",
      profession: "Engineer",
      income: "75000-100000",
      caste: "Kashmiri",
      height: "5'10",
      houseStatus: "own",
      houseArea: "1200",
      bio: "Test profile for matching",
      photo: "https://i.pravatar.cc/150?img=1",
      profileStatus: "approved",
      profileCompletion: 100,
      paymentStatus: "completed",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Profile inserted successfully!');
    console.log('Inserted ID:', result.insertedId);
  } catch (err) {
    console.error('❌ Error inserting profile:', err);
  } finally {
    await client.close();
  }
}

insertProfile();
