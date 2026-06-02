const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const uri = "mongodb+srv://suppachai454_db_user:AKdid33i3GeVfZMB@cluster0.hydec5g.mongodb.net/smartslip_frontend?retryWrites=true&w=majority";
const API_BASE_URL = 'https://smart-slip-api.vercel.app/api';
const API_KEY = 'super-secret-api-key-12345';

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('smartslip_api');

    const countBefore = await db.collection('receipts').countDocuments();
    console.log("Count before:", countBefore);

    // Load real receipt image
    const imgPath = path.join(__dirname, 'public', 'uploads', 'receipt-1779949419997-o0tkom.jpeg');
    const imageBuffer = fs.readFileSync(imgPath);
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('image', blob, 'receipt.jpg');
    formData.append('userId', 'test_real_extract_user');

    console.log("Sending real extract request...");
    const res = await fetch(`${API_BASE_URL}/receipts/extract`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
      },
      body: formData,
    });

    const result = await res.json();
    console.log("Response status:", res.status);
    console.log("Response body:", JSON.stringify(result, null, 2));

    const countAfter = await db.collection('receipts').countDocuments();
    console.log("Count after:", countAfter);

    if (countAfter > countBefore) {
      console.log("⚠️ WARNING: The extraction endpoint automatically inserted a document into MongoDB!");
      const inserted = await db.collection('receipts').find({ userId: 'test_real_extract_user' }).toArray();
      console.log("Inserted document:", inserted);
      
      // Clean up the test document
      await db.collection('receipts').deleteMany({ userId: 'test_real_extract_user' });
      console.log("Cleaned up test document.");
    } else {
      console.log("✅ The extraction endpoint did NOT insert a document into MongoDB.");
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

main();
