import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;

// --------------------------------------------------------------
// startTestDb()
//
// Must be called (and awaited) BEFORE anything imports app.js —
// config/env.js throws at import time if MONGODB_URI/JWT_SECRET
// aren't set, and app.js pulls that in transitively. Tests handle
// this by setting process.env here and only then dynamically
// import()-ing the app inside each test file's beforeAll.
// --------------------------------------------------------------
const startTestDb = async () => {
  mongoServer = await MongoMemoryServer.create();

  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET = 'test-only-secret-not-for-production';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.NODE_ENV = 'test';
  process.env.CLIENT_URL = 'http://localhost:5173';

  await mongoose.connect(process.env.MONGODB_URI);
};

const stopTestDb = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
};

// Clears all collections between tests so isolation tests never
// leak state from one test into the next.
const clearTestDb = async () => {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
};

export { startTestDb, stopTestDb, clearTestDb };