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
    
    console.log(`Total receipts found: ${receipts.length}`);
    receipts.forEach(r => {
      const dateStr = r.extractedData?.date || r.createdAt;
      let date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        date = new Date(r.createdAt);
      }
      const year = date.getFullYear();
      const amountVal = r.amount !== undefined ? r.amount : r.totalAmount;
      console.log(`ID: ${r._id}, store: ${r.storeName}, amount: ${amountVal}, year: ${year}, date: ${dateStr}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
