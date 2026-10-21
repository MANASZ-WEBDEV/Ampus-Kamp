import cron from 'node-cron';
import { closeExpiredEvents } from '@/modules/events/event.service';

/**
 * scheduleCloseEvents — registers a nightly cron that auto-closes all
 * published events whose deadline has passed.
 *
 * Schedule: 00:05 every day (5 minutes past midnight).
 * This gives a small buffer after midnight so the cron doesn't race with
 * any in-flight registration requests happening exactly at 00:00.
 *
 * The cron is registered once at server startup (called from server.ts).
 * Safe to call multiple times in tests — node-cron deduplicates by task object.
 *
 * Usage (in server.ts):
 *   import { scheduleCloseEvents } from '@/jobs/closeEvents';
 *   scheduleCloseEvents();
 */
export function scheduleCloseEvents(): void {
  cron.schedule('5 0 * * *', async () => {
    const label = '[closeEvents cron]';
    try {
      console.log(`${label} Running — checking for expired published events…`);
      const count = await closeExpiredEvents();
      if (count > 0) {
        console.log(`${label} Closed ${count} event(s).`);
      } else {
        console.log(`${label} No events to close.`);
      }
    } catch (err) {
      // Log but do not crash the server process
      console.error(`${label} Failed:`, err);
    }
  });

  console.log('⏰  closeEvents cron scheduled — daily at 00:05.');
}
