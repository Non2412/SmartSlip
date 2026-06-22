import { MongoClient, ObjectId } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
const match = envContent.match(/MONGODB_URI=(.*)/);
const uri = match ? match[1].trim() : '';

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    console.log('Database:', db.databaseName);

    const token: any = { sub: '6a17fa8301511efaaaa32ebe' };
    
    // Simulate JWT logic
    if (token.sub && !token.lineUserId) {
      const queryUserId = ObjectId.isValid(token.sub) ? new ObjectId(token.sub) : token.sub;
      console.log('Querying accounts with userId:', queryUserId);
      const lineAccount = await db.collection('accounts').findOne({
        userId: queryUserId,
        provider: 'line'
      });
      if (lineAccount) {
        token.lineUserId = lineAccount.providerAccountId;
        console.log('🔍 Found lineUserId:', token.lineUserId);
      } else {
        console.log('❌ lineAccount not found');
      }
    }
    
    console.log('Final Token:', token);
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
