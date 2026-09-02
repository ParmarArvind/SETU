import mongoose from 'mongoose';
import env from './env.js';

async function connectDB() {
  try {
    const conn = await mongoose.connect(env.mongodbUri);

    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
}

export default connectDB;