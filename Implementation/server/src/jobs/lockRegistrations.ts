import cron from 'node-cron';
import { Registration } from '@/models/registration.model';
import { Event }        from '@/models/event.model';

/**
 * scheduleLockRegistrations — daily cron at 00:15 that finds all events
 * whose registrationDeadline has passed and locks their submitted registrations.
 *
 * Schedule: 00:15 daily — 10 minutes after closeTeamPosts (00:05).
 * This ordering ensures team post data is consistent before we lock registrations.
 *
 * SDE3 notes:
 *   1. Two-phase: first find expired event IDs, then bulk-update registrations.
 *      A single updateMany with $lookup would work but is harder to monitor.
 *   2. Only 'submitted' registrations are locked. 'draft' registrations are
 *      NOT locked — they become de-facto invalid but we let leaders withdraw
 *      them manually (keeps the UI cleaner; no surprise locked drafts).
 *   3. Counters are NOT modified — locking does not change the number of
 *      registered students.
 *   4. Idempotent: running twice is safe (locked → locked is a no-op).
 */
export function scheduleLockRegistrations(): void {
  cron.schedule('15 0 * * *', async () => {
    const label = '[lockRegistrations cron]';
    try {
      console.log(`${label} Running — locking registrations past deadline…`);

      // ── Step 1: Find events whose registrationDeadline has passed ────────
      const expiredEvents = await Event.find({
        registrationDeadline: { $lt: new Date() },
        status: { $in: ['published', 'closed'] },
        deletedAt: { $exists: false },
      })
        .select('_id')
        .lean();

      if (expiredEvents.length === 0) {
        console.log(`${label} No events with passed registration deadlines.`);
        return;
      }

      const expiredEventIds = expiredEvents.map(e => e._id);
      console.log(`${label} Found ${expiredEventIds.length} event(s) with expired deadlines.`);

      // ── Step 2: Bulk-lock submitted registrations for those events ────────
      // Only 'submitted' → 'locked'. Draft registrations are left as-is.
      const result = await Registration.updateMany(
        {
          eventId: { $in: expiredEventIds },
          status:  'submitted',
        },
        { $set: { status: 'locked' } },
      );

      if (result.modifiedCount > 0) {
        console.log(`${label} Locked ${result.modifiedCount} registration(s).`);
      } else {
        console.log(`${label} No submitted registrations to lock.`);
      }

    } catch (err) {
      // Log but never crash the server process
      console.error(`${label} Failed:`, err);
    }
  });

  console.log('⏰  lockRegistrations cron scheduled — daily at 00:15.');
}
