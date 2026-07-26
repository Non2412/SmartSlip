const { MongoClient } = require('mongodb');
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 1. Load variables from .env.local
let uri = '';
let googleProjectId = '';
let googleEmail = '';
let googleKey = '';

try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    
    const uriMatch = envContent.match(/MONGODB_URI=(.*)/);
    if (uriMatch) uri = uriMatch[1].trim().replace(/^["']|["']$/g, '');

    const idMatch = envContent.match(/GOOGLE_PROJECT_ID=(.*)/);
    if (idMatch) googleProjectId = idMatch[1].trim().replace(/^["']|["']$/g, '');

    const emailMatch = envContent.match(/GOOGLE_SERVICE_ACCOUNT_EMAIL=(.*)/);
    if (emailMatch) googleEmail = emailMatch[1].trim().replace(/^["']|["']$/g, '');

    // Try to match multi-line key or single line key with escaped newlines
    const keyMatch = envContent.match(/GOOGLE_PRIVATE_KEY="((?:[^"\\]|\\.)*)"/);
    if (keyMatch) {
      googleKey = keyMatch[1].replace(/\\n/g, '\n');
    } else {
      const keyMatchNoQuotes = envContent.match(/GOOGLE_PRIVATE_KEY=(.*)/);
      if (keyMatchNoQuotes) {
        googleKey = keyMatchNoQuotes[1].trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
      }
    }
  }
} catch (err) {
  console.error('Error reading .env.local:', err.message);
}

if (!uri) {
  console.error('Error: MONGODB_URI not found in .env.local');
  process.exit(1);
}

// 2. Initialize GCS Client if credentials are available
let gcs = null;
if (googleProjectId && googleEmail && googleKey) {
  try {
    gcs = new Storage({
      projectId: googleProjectId,
      credentials: {
        client_email: googleEmail,
        private_key: googleKey,
      }
    });
    console.log('✅ Google Cloud Storage SDK initialized with service account.');
  } catch (err) {
    console.warn('⚠️ GCS client init failed, will fallback to HTTP fetch:', err.message);
  }
} else {
  console.warn('⚠️ GCS credentials missing in .env.local. Fetch will fallback to HTTP requests.');
}

async function run() {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('smartslip_api');
    const collection = db.collection('receipts');

    // 3. Create sparse index on imageHash
    console.log('Creating sparse index on imageHash...');
    await collection.createIndex({ imageHash: 1 }, { sparse: true });
    console.log('✅ Sparse index on imageHash created/verified.');

    // 4. Find receipts that have an image URL but no imageHash
    console.log('Scanning database for receipts missing imageHash...');
    const query = {
      imageHash: { $in: [null, ""] },
      $or: [
        { imageUrl: { $regex: '^http' } },
        { imageURL: { $regex: '^http' } },
        { "extractedData.imageData": { $regex: '^http' } }
      ]
    };

    const receipts = await collection.find(query).toArray();
    console.log(`Found ${receipts.length} receipts missing imageHash.`);

    if (receipts.length === 0) {
      console.log('Nothing to backfill.');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < receipts.length; i++) {
      const receipt = receipts[i];
      const id = receipt._id.toString();
      
      // Determine the image URL
      let rawUrl = receipt.imageUrl || receipt.imageURL || (receipt.extractedData && receipt.extractedData.imageData);
      if (!rawUrl) continue;

      // Clean the URL if it's a proxy URL
      let targetUrl = rawUrl;
      if (rawUrl.includes('gcs-image?url=')) {
        try {
          const parts = rawUrl.split('gcs-image?url=');
          const encodedPart = parts[1];
          if (encodedPart) {
            const cleanEncodedPart = encodedPart.split('&')[0];
            targetUrl = decodeURIComponent(cleanEncodedPart);
          }
        } catch (e) {
          console.error(`[${id}] Failed to parse GCS proxy URL:`, e.message);
        }
      }

      console.log(`[${i + 1}/${receipts.length}] Processing Receipt ID: ${id}`);
      console.log(`  URL: ${targetUrl}`);

      try {
        let buffer;

        // Check if URL is GCS and GCS SDK is available
        const gcsMatch = targetUrl.match(/^https:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)$/);
        if (gcsMatch && gcs) {
          const [, bucketName, objectPath] = gcsMatch;
          console.log(`  Downloading via Google Cloud Storage SDK...`);
          const file = gcs.bucket(bucketName).file(objectPath);
          const [downloadedBuffer] = await file.download();
          buffer = downloadedBuffer;
        } else {
          console.log(`  Downloading via HTTP fetch...`);
          const response = await fetch(targetUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        }

        // Calculate SHA-256 hash
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');

        // Update the receipt in the database
        await collection.updateOne(
          { _id: receipt._id },
          { $set: { imageHash: hash, updatedAt: new Date().toISOString() } }
        );

        console.log(`  ✅ Hash generated and saved: ${hash}`);
        successCount++;
      } catch (err) {
        console.error(`  ❌ Failed to process:`, err.message);
        failCount++;
      }
    }

    console.log('\n--- Migration Summary ---');
    console.log(`Successfully backfilled: ${successCount} receipts`);
    console.log(`Failed to process: ${failCount} receipts`);
    console.log('-------------------------');

  } catch (err) {
    console.error('Database migration error:', err);
  } finally {
    await client.close();
    console.log('Connection closed.');
  }
}

run();
