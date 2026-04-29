/**
 * reset-sheet-skipped.mjs
 * Reset googleSheetSkipped flag for a specific user or all users
 * Usage:
 *   node reset-sheet-skipped.mjs                    -- reset for ALL users
 *   node reset-sheet-skipped.mjs <userId>           -- reset for specific user
 */
import { MongoClient, ObjectId } from 'mongodb';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const vars = {};
env.split(/\r?\n/).forEach(line => {
  const idx = line.indexOf('=');
  if (idx === -1) return;
  const k = line.substring(0, idx).trim();
  const v = line.substring(idx + 1).trim().replace(/^"(.*)"$/s, '$1');
  if (k) vars[k] = v;
});

const uri = vars.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI not found in .env.local'); process.exit(1); }

const client = new MongoClient(uri);
await client.connect();
const db = client.db();

const targetUserId = process.argv[2];

let filter = { googleSheetSkipped: true };
if (targetUserId) {
  const idFilter = ObjectId.isValid(targetUserId)
    ? { $or: [{ _id: new ObjectId(targetUserId) }, { _id: targetUserId }] }
    : { _id: targetUserId };
  filter = { ...idFilter, googleSheetSkipped: true };
}

const result = await db.collection('users').updateMany(
  filter,
  { $set: { googleSheetSkipped: false } }
);

console.log(`✅ Reset googleSheetSkipped for ${result.modifiedCount} user(s)`);

// Show current state
const users = await db.collection('users').find(
  {}, { projection: { _id: 1, name: 1, googleSheetId: 1, googleSheetSkipped: 1, googleDriveFolderId: 1 } }
).toArray();

console.log('\nCurrent user states:');
users.forEach(u => {
  console.log(`  ${u.name || u._id}: sheetId=${u.googleSheetId || 'null'} skipped=${u.googleSheetSkipped || false} folder=${u.googleDriveFolderId ? '✅' : '❌'}`);
});

await client.close();
