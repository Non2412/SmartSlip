/**
 * Sync googleSheetId from NextAuth users → backend User documents (by lineUserId)
 * Run once after creating Google Sheet for LINE users
 */
import { MongoClient, ObjectId } from 'mongodb';
import { readFileSync } from 'fs';

// Load .env.local manually
const envFile = readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envFile.split('\n')) {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
}
const MONGODB_URI = env['MONGODB_URI'];

const client = new MongoClient(MONGODB_URI);
try {
  await client.connect();
  const db = client.db();

  // Find all NextAuth users that have a googleSheetId
  const usersWithSheet = await db.collection('users')
    .find({ googleSheetId: { $exists: true, $ne: null } })
    .toArray();

  console.log(`Found ${usersWithSheet.length} NextAuth users with googleSheetId`);

  for (const user of usersWithSheet) {
    const userId = user._id.toString();

    // Find their LINE account
    const lineAccount = await db.collection('accounts').findOne({
      $or: [
        { userId: userId, provider: 'line' },
        { userId: ObjectId.isValid(userId) ? new ObjectId(userId) : userId, provider: 'line' },
      ],
    });

    if (!lineAccount?.providerAccountId) {
      console.log(`  ⚠️ No LINE account for user ${user.name || userId}`);
      continue;
    }

    // Update backend User document
    const result = await db.collection('users').updateOne(
      { lineUserId: lineAccount.providerAccountId },
      { $set: { googleSheetId: user.googleSheetId } }
    );

    if (result.matchedCount > 0) {
      console.log(`  ✅ Synced ${user.name}: googleSheetId=${user.googleSheetId}`);
    } else {
      console.log(`  ⚠️ No backend User found for lineUserId=${lineAccount.providerAccountId}`);
    }
  }
} finally {
  await client.close();
}
