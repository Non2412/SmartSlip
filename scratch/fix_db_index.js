// eslint-disable-next-line @typescript-eslint/no-require-imports
const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is not defined.');
  process.exit(1);
}

async function run() {
  const client = new MongoClient(uri);
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    const db = client.db('smartslip_api');
    const users = db.collection('users');

    console.log('Checking indexes for collection: users');
    const indexes = await users.listIndexes().toArray();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));

    const lineUserIdIndex = indexes.find(idx => idx.name === 'lineUserId_1');
    if (lineUserIdIndex) {
      console.log('Dropping lineUserId_1 index...');
      await users.dropIndex('lineUserId_1');
      console.log('Re-creating lineUserId_1 index as sparse...');
      await users.createIndex({ lineUserId: 1 }, { unique: true, sparse: true });
      console.log('✅ Successfully updated lineUserId_1 index to be sparse.');
    } else {
      console.log('lineUserId_1 index not found. Creating it as sparse...');
      await users.createIndex({ lineUserId: 1 }, { unique: true, sparse: true });
      console.log('✅ Successfully created lineUserId_1 index as sparse.');
    }
  } catch (err) {
    console.error('❌ Error fixing index:', err);
  } finally {
    await client.close();
  }
}

run();
