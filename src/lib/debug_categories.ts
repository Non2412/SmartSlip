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
    const rawReceipts = await db.collection('receipts').find({
      $or: [{ userId: '6a17fa8301511efaaaa32ebe' }, { userId: 'U6db706dac9268b203c79445e7cf2ad5f' }]
    }).toArray();
    
    const receipts = rawReceipts.map(r => {
      const doc: any = { ...r, id: r._id.toString(), _id: undefined };
      if (doc.amount !== undefined && doc.totalAmount === undefined) {
        doc.totalAmount = doc.amount;
      }
      return doc;
    });

    const categoryAmounts: Record<string, number> = {
      'อาหาร': 0,
      'เดินทาง': 0,
      'ช้อปปิ้ง': 0,
      'อื่นๆ': 0
    };

    receipts.forEach(receipt => {
      const amountVal = receipt.amount !== undefined ? receipt.amount : receipt.totalAmount;
      if (!amountVal) return;

      const dateStr = receipt.extractedData?.date || receipt.createdAt;
      let date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        date = new Date(receipt.createdAt);
      }
      
      const year = date.getFullYear();
      if (year === 2026) {
        const rawCat = receipt.extractedData?.category || 'อื่นๆ';
        const category = ['อาหาร', 'เดินทาง', 'ช้อปปิ้ง'].includes(rawCat) ? rawCat : 'อื่นๆ';
        
        const oldVal = categoryAmounts[category];
        categoryAmounts[category] += amountVal;
        console.log(`Add to category [${category}]: store: ${receipt.storeName}, amount: ${amountVal}, category: ${rawCat}, old: ${oldVal}, new: ${categoryAmounts[category]}`);
      }
    });

    console.log('\nCategory totals:', categoryAmounts);
    const sum = Object.values(categoryAmounts).reduce((a, b) => a + b, 0);
    console.log('Total Sum:', sum);
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
