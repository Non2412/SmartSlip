const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://suppachai454_db_user:AKdid33i3GeVfZMB@cluster0.hydec5g.mongodb.net/smartslip_frontend?retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('smartslip_api');

    const receipts = await db.collection('receipts').find().sort({ createdAt: -1 }).limit(4).toArray();
    console.log("LAST 4 RECEIPTS FULL DOCUMENTS:");
    console.log(JSON.stringify(receipts, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

main();
