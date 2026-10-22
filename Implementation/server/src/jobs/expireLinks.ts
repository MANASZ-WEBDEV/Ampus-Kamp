import cron from 'node-cron';
import { TeamLink } from '@/models/teamLink.model';

/**
 * scheduleExpireLinks — nightly cron that sets status='expired' on all
 * pending TeamLinks whose expiresAt has passed (7-day TTL).
 *
 * Schedule: 00:10 every day — 10 minutes past midnight.
 * Runs after closeTeamPosts (00:05) so a post is already expired before
 * we process its pending links.
 *
 * Performance: uses the { expiresAt: 1 } partial index (status='pending')
 * so the updateMany scans only pending links, not the whole collection.
 */
export function scheduleExpireLinks(): void {
  cron.schedule('10 0 * * *', async () => {
    const label = '[expireLinks cron]';
    try {
      console.log(`${label} Running — expiring pending links past 7-day TTL…`);
      const result = await TeamLink.updateMany(
        {
          status:    'pending',
          expiresAt: { $lt: new Date() },
        },
        { $set: { status: 'expired' } },
      );
      if (result.modifiedCount > 0) {
        console.log(`${label} Expired ${result.modifiedCount} link(s).`);
      } else {
        console.log(`${label} No links to expire.`);
      }
    } catch (err) {
      // Log but never crash the server process
      console.error(`${label} Failed:`, err);
    }
  });

  console.log('⏰  expireLinks cron scheduled — daily at 00:10.');
}
