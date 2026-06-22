import { MongoClient } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
const match = envContent.match(/MONGODB_URI=(.*)/);
const uri = match ? match[1].trim() : '';

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('smartslip_api');
    const receipts = await db.collection('receipts').find({
      $or: [{ userId: '6a17fa8301511efaaaa32ebe' }, { userId: 'U6db706dac9268b203c79445e7cf2ad5f' }]
    }).toArray();
    
    receipts.forEach(r => {
      if (r.amount !== undefined && r.totalAmount !== undefined && r.amount !== r.totalAmount) {
        console.log(`DIFFERENCE DETECTED: ID: ${r._id}, store: ${r.storeName}, amount: ${r.amount}, totalAmount: ${r.totalAmount}`);
      }
    });
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
