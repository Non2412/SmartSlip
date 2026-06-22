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
      const amountVal = r.amount !== undefined ? r.amount : r.totalAmount;
      if (parseFloat(amountVal) === 180 || amountVal === '180' || amountVal === 180) {
        console.log('FOUND 180 RECEIPT:', r);
      }
    });
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
