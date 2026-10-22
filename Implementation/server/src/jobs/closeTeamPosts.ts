import cron from 'node-cron';
import { TeamPost } from '@/models/teamPost.model';

/**
 * scheduleCloseTeamPosts — nightly cron that auto-expires open/full team
 * posts whose event deadline has passed.
 *
 * Schedule: 00:05 every day — 5 minutes past midnight.
 * Uses the denormalised expiresAt field (copied from event.deadline at post
 * creation time) to avoid a join with the Event collection on every run.
 *
 * Lifecycle note:
 *   TeamPost uses 'expired' (not 'closed') for deadline-triggered closure
 *   to distinguish it from manual owner closure ('closed').
 */
export function scheduleCloseTeamPosts(): void {
  cron.schedule('5 0 * * *', async () => {
    const label = '[closeTeamPosts cron]';
    try {
      console.log(`${label} Running — closing team posts past event deadline…`);
      const result = await TeamPost.updateMany(
        {
          status:    { $in: ['open', 'full'] },
          expiresAt: { $lt: new Date() },
        },
        { $set: { status: 'expired' } },
      );
      if (result.modifiedCount > 0) {
        console.log(`${label} Closed ${result.modifiedCount} team post(s).`);
      } else {
        console.log(`${label} No team posts to close.`);
      }
    } catch (err) {
      // Log but never crash the server process
      console.error(`${label} Failed:`, err);
    }
  });

  console.log('⏰  closeTeamPosts cron scheduled — daily at 00:05.');
}
