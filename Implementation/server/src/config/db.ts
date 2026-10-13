import mongoose from 'mongoose';
import { env } from '@/config/env';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3_000;

/**
 * Connect to MongoDB with retry logic.
 * Throws after MAX_RETRIES consecutive failures.
 */
export async function connectDB(): Promise<void> {
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5_000,
        socketTimeoutMS: 45_000,
      });

      console.log(
        JSON.stringify({
          level: 'info',
          message: '✅  MongoDB connected',
          host: mongoose.connection.host,
          name: mongoose.connection.name,
          timestamp: new Date().toISOString(),
        }),
      );
      return;
    } catch (err) {
      attempts++;
      const remaining = MAX_RETRIES - attempts;
      console.error(
        JSON.stringify({
          level: 'error',
          message: `❌  MongoDB connection failed (attempt ${attempts}/${MAX_RETRIES})`,
          retriesLeft: remaining,
          error: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString(),
        }),
      );

      if (remaining === 0) {
        throw new Error(`MongoDB: failed to connect after ${MAX_RETRIES} attempts.`);
      }

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

/**
 * Gracefully close the Mongoose connection.
 * Called during SIGTERM / SIGINT shutdown.
 */
export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  console.log(
    JSON.stringify({
      level: 'info',
      message: '🔌  MongoDB disconnected',
      timestamp: new Date().toISOString(),
    }),
  );
}
