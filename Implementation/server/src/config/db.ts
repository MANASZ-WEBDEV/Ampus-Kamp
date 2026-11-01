import mongoose from 'mongoose';
import { env } from '@/config/env';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3_000;

/**
 * Connect to MongoDB with retry logic.
 * Throws after MAX_RETRIES consecutive failures.
 *
 * SDE3 tuning notes for Atlas replica set:
 *
 * serverSelectionTimeoutMS — how long the driver waits to find a healthy
 *   replica-set member before giving up on ONE operation. Atlas elections
 *   can take 10–15 s; 5 s caused 24-second login hangs because the driver
 *   retried the operation internally before surfacing the error.
 *   Raised to 15 s so a single election never hangs the request.
 *
 * heartbeatFrequencyMS — how often the driver pings each replica-set
 *   member to detect failures. Default is 10 s; lowering to 3 s means
 *   we detect a downed member ~3x faster and can fail-over sooner.
 *
 * socketTimeoutMS — how long a single TCP socket read/write waits.
 *   Kept at 45 s (MongoDB default). Most slow queries should time out
 *   via serverSelectionTimeoutMS long before this fires.
 *
 * retryWrites / retryReads — explicitly enabled (they are Atlas defaults
 *   but explicit is better than implicit). Idempotent write retries allow
 *   automatic recovery from transient primary step-downs.
 */
export async function connectDB(): Promise<void> {
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        maxPoolSize:              10,
        serverSelectionTimeoutMS: 15_000,  // raised from 5_000 — Atlas elections take ~10-15s
        heartbeatFrequencyMS:     3_000,   // detect downed members faster (default: 10_000)
        socketTimeoutMS:          45_000,
        retryWrites:              true,
        retryReads:               true,
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
