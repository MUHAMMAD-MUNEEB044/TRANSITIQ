import mongoose from 'mongoose';
import { ENV } from './env.js';

let retryCount = 0;
const MAX_RETRIES = 5;
export let isUsingMemoryStore = false;

export const connectDB = async () => {
  const uri = ENV.MONGODB_URI;

  while (retryCount < MAX_RETRIES) {
    try {
      retryCount++;
      console.log(`[DB] Attempting MongoDB connection (${retryCount}/${MAX_RETRIES}) to ${uri}...`);
      
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 2000,
      });

      console.log(`[DB] MongoDB Connected successfully: ${conn.connection.host}`);
      isUsingMemoryStore = false;
      return conn;
    } catch (err) {
      console.warn(`[DB] MongoDB attempt ${retryCount} failed: ${err.message}`);
      if (retryCount >= MAX_RETRIES) {
        console.warn(`[DB] Max connection attempts (${MAX_RETRIES}) reached.`);
        console.warn('[DB] Seamlessly initializing In-Memory State Store with Pakistan Transit data...');
        isUsingMemoryStore = true;
        return null;
      }
      // Wait 1.5 seconds between retries during development
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[DB] MongoDB disconnected. Falling back to active memory store.');
  isUsingMemoryStore = true;
});

mongoose.connection.on('error', (err) => {
  console.error('[DB] MongoDB runtime error:', err.message);
});

export default connectDB;
