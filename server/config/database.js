import dns from 'dns';
import mongoose from 'mongoose';
import env from './env.js';

// Resolve MongoDB Atlas SRV records reliably (bypasses Windows local DNS ECONNREFUSED)
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (dnsErr) {
  console.warn('[DB] Could not set custom DNS servers:', dnsErr.message);
}

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