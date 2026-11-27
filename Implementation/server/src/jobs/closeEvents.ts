import cron from 'node-cron';
import {
  closeExpiredEvents,
  concludeExpiredEvents,
  autoArchiveOldEvents,
} from '@/modules/events/event.service';

/**
 * scheduleCloseEvents — three-stage nightly lifecycle runner:
 *
 *  00:05  closeExpiredEvents    published → registration_closed
 *                               (registrationDeadline passed, event not yet held)
 *
 *  00:10  concludeExpiredEvents registration_closed/published → concluded
 *                               (eventDate has passed)
 *
 *  1st of month 03:30  autoArchiveOldEvents  concluded → archived
 *                               (concluded > 90 days ago)
 */
export function scheduleCloseEvents(): void {
  // Stage 1 — registration deadline passed
  cron.schedule('5 0 * * *', async () => {
    const label = '[closeEvents cron]';
    try {
      console.log(`${label} Running — checking for registration deadline expirations…`);
      const count = await closeExpiredEvents();
      console.log(count > 0
        ? `${label} ${count} event(s) → registration_closed.`
        : `${label} No events to registration-close.`);
    } catch (err) {
      console.error(`${label} Failed:`, err);
    }
  });

  // Stage 2 — event date passed → conclude
  cron.schedule('10 0 * * *', async () => {
    const label = '[concludeEvents cron]';
    try {
      console.log(`${label} Running — checking for events past their event date…`);
      const count = await concludeExpiredEvents();
      console.log(count > 0
        ? `${label} ${count} event(s) → concluded.`
        : `${label} No events to conclude.`);
    } catch (err) {
      console.error(`${label} Failed:`, err);
    }
  });

  // Stage 3 — auto-archive concluded events older than 90 days (1st of month)
  cron.schedule('30 3 1 * *', async () => {
    const label = '[autoArchive cron]';
    try {
      console.log(`${label} Running — archiving concluded events older than 90 days…`);
      const count = await autoArchiveOldEvents();
      console.log(count > 0
        ? `${label} ${count} event(s) → archived.`
        : `${label} No events to auto-archive.`);
    } catch (err) {
      console.error(`${label} Failed:`, err);
    }
  });

  console.log('⏰  Event lifecycle crons scheduled — 00:05 (reg close), 00:10 (conclude), 1st-of-month 03:30 (archive).');
}
