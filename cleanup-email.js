const { MongoClient } = require('mongodb');

const DATABASE_URL = process.env.DATABASE_URL || 'mongodb+srv://samimunir196_db_user:hAYDBiHMyEnvXTV0@cluster0.8avsmql.mongodb.net/?Intikhab-e-Zauj=Cluster0';
const emailToDelete = process.argv[2] || 'samimunir196@gmail.com';

async function cleanupEmail() {
  const client = new MongoClient(DATABASE_URL);
  
  try {
    await client.connect();
    const db = client.db('intikhab_dev');

    console.log(`🔍 Cleaning up email: ${emailToDelete}\n`);

    // Delete from users collection
    const usersRes = await db.collection('users').deleteMany({ email: emailToDelete });
    console.log(`✅ Deleted ${usersRes.deletedCount} from users collection`);

    // Delete from profiles collection
    const profilesRes = await db.collection('profiles').deleteMany({ email: emailToDelete });
    console.log(`✅ Deleted ${profilesRes.deletedCount} from profiles collection`);

    // Delete from staff collection
    const staffRes = await db.collection('staff').deleteMany({ email: emailToDelete });
    console.log(`✅ Deleted ${staffRes.deletedCount} from staff collection`);

    // Delete from payments collection
    const paymentsRes = await db.collection('payments').deleteMany({ email: emailToDelete });
    console.log(`✅ Deleted ${paymentsRes.deletedCount} from payments collection`);

    console.log(`\n✨ Cleanup complete! You can now register with ${emailToDelete}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

cleanupEmail();
