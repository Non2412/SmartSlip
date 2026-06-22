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
    
    // Fetch user receipts (mimicking getUniqueReceipts logic)
    const rawReceipts = await db.collection('receipts').find({
      $or: [{ userId: '6a17fa8301511efaaaa32ebe' }, { userId: 'U6db706dac9268b203c79445e7cf2ad5f' }]
    }).toArray();
    
    // Map like in route handler
    const receipts = rawReceipts.map(r => {
      const doc: any = { ...r, id: r._id.toString(), _id: undefined };
      if (doc.amount !== undefined && doc.totalAmount === undefined) {
        doc.totalAmount = doc.amount;
      }
      return doc;
    });

    console.log(`Loaded ${receipts.length} receipts`);

    let sumTopLeft = 0;
    let sumChart = 0;

    receipts.forEach(r => {
      const amountVal = r.amount !== undefined ? r.amount : r.totalAmount;
      const val = amountVal || 0;
      sumTopLeft += val;

      const dateStr = r.extractedData?.date || r.createdAt;
      let date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        date = new Date(r.createdAt);
      }
      const year = date.getFullYear();
      
      const isInPeriod = (year === 2026);
      if (isInPeriod) {
        sumChart += val;
      } else {
        console.log(`EXCLUDED from 2026: ID: ${r.id}, store: ${r.storeName}, amount: ${val}, date: ${dateStr}, resolved year: ${year}`);
      }
    });

    console.log(`\nTop Left Card Sum: ฿${sumTopLeft}`);
    console.log(`Chart Sum: ฿${sumChart}`);
    console.log(`Difference: ฿${sumTopLeft - sumChart}`);
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
