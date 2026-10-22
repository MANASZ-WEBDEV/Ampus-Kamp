import cron from 'node-cron';
import { TeamPost } from '@/models/teamPost.model';
import { LookingFlag } from '@/models/lookingFlag.model';

/**
 * scheduleCloseTeamPosts — nightly cron that auto-expires open/full team
 * posts whose event deadline has passed, then clears LookingFlags for
 * those events (students can no longer be "looking" for a closed event).
 *
 * Schedule: 00:05 every day — 5 minutes past midnight.
 * Uses the denormalised expiresAt field (copied from event.deadline at post
 * creation time) to avoid a join with the Event collection on every run.
 */
export function scheduleCloseTeamPosts(): void {
  cron.schedule('5 0 * * *', async () => {
    const label = '[closeTeamPosts cron]';
    try {
      console.log(`${label} Running — closing team posts past event deadline…`);

      // ── 1. Find posts about to be expired (collect eventIds first) ─────────
      const expiring = await TeamPost.find({
        status:    { $in: ['open', 'full'] },
        expiresAt: { $lt: new Date() },
      })
        .select('eventId')
        .lean();

      if (expiring.length === 0) {
        console.log(`${label} No team posts to close.`);
        return;
      }

      const expiredEventIds = [...new Set(expiring.map(p => p.eventId.toString()))];

      // ── 2. Expire the posts ────────────────────────────────────────────────
      const postResult = await TeamPost.updateMany(
        {
          status:    { $in: ['open', 'full'] },
          expiresAt: { $lt: new Date() },
        },
        { $set: { status: 'expired' } },
      );

      console.log(`${label} Closed ${postResult.modifiedCount} team post(s).`);

      // ── 3. Clear LookingFlags for expired events ──────────────────────────
      // Students can no longer be "looking" for an event that is now closed.
      // One deleteMany covers all affected events — no loop.
      const flagResult = await LookingFlag.deleteMany({
        eventId: { $in: expiredEventIds },
      });

      if (flagResult.deletedCount > 0) {
        console.log(`${label} Cleared ${flagResult.deletedCount} looking flag(s) for expired events.`);
      }
    } catch (err) {
      // Log but never crash the server process
      console.error(`${label} Failed:`, err);
    }
  });

  console.log('⏰  closeTeamPosts cron scheduled — daily at 00:05.');
}

