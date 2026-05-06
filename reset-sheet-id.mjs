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

const client = new MongoClient(vars.MONGODB_URI);
await client.connect();
const db = client.db();

const result = await db.collection('users').updateMany(
  { googleSheetId: { $exists: true } },
  { $unset: { googleSheetId: '' }, $set: { googleSheetSkipped: false } }
);

console.log(`✅ Reset googleSheetId for ${result.modifiedCount} user(s)`);

const users = await db.collection('users').find({}, { projection: { name: 1, googleSheetId: 1, googleSheetSkipped: 1 } }).toArray();
users.forEach(u => console.log(`  ${u.name}: sheetId=${u.googleSheetId ?? 'null'} skipped=${u.googleSheetSkipped}`));

await client.close();
