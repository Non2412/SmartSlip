import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const options = {};

let client;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
  // During build phase on Vercel, MONGODB_URI might be missing.
  // Instead of throwing an error at the top level, we return a rejected promise
  // so that the build can complete, but runtime access will still fail with a clear message.
  clientPromise = Promise.reject(new Error('Please add your MONGODB_URI to your environment variables.'));
} else {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      console.log('🔌 [MongoDB] Connecting in development...');
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect()
        .then(conn => {
          console.log('✅ [MongoDB] Connected successfully in development');
          return conn;
        })
        .catch(err => {
          console.error('❌ [MongoDB] Connection error in development:', err);
          throw err;
        });
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    console.log('🔌 [MongoDB] Connecting in production...');
    client = new MongoClient(uri, options);
    clientPromise = client.connect()
      .then(conn => {
        console.log('✅ [MongoDB] Connected successfully in production');
        return conn;
      })
      .catch(err => {
        console.error('❌ [MongoDB] Connection error in production:', err);
        throw err;
      });
  }
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;
