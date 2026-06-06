import mongoose from 'mongoose';
import { ensureDuplicateSearchIndex } from './searchIndexes';

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) {
      console.log('MongoDB already connected');
      // Still kick off the index bootstrap (it's idempotent and cached).
      ensureDuplicateSearchIndex().catch(() => {});
      return;
    }
    const mongoUri = process.env.MONGO_URI?.trim();
    if (!mongoUri) {
      throw new Error('MONGO_URI is not configured');
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Bootstrap the Atlas Search index used for duplicate detection.
    // Runs once per process, handled gracefully if Atlas Search isn't
    // available (e.g. shared-tier clusters).
    ensureDuplicateSearchIndex().catch((err) => {
      console.warn('[db] duplicate_detection_index bootstrap failed:', err);
    });
  } catch (error: any) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
};

export default connectDB;
