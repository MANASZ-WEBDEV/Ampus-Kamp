import cron from 'node-cron';
import { Credential }  from '@/models/credential.model';
import { AuditLog }    from '@/models/auditLog.model';
import { getSetting }  from '@/models/setting.model';

// ─────────────────────────────────────────────────────────────────────────────
// Spot-Check Cron — runs on the 1st of every month at 03:00 AM
//
// Samples ~10% of all 'verified' credentials (via MongoDB $sample) and
// flags them for admin review by writing AuditLog entries.
//
// Uses $sample — O(n) on the collection but avoids app-level sorting.
// The 10% rate is configurable via Setting.spotCheckRate.
// ─────────────────────────────────────────────────────────────────────────────

export async function runSpotCheck(): Promise<void> {
  const startedAt = new Date();
  console.log(
    JSON.stringify({
      level:   'info',
      message: '🔍  spotCheck cron started',
      timestamp: startedAt.toISOString(),
    }),
  );

  try {
    // Count all verified credentials
    const totalVerified = await Credential.countDocuments({
      'verification.status': 'verified',
    });

    if (totalVerified === 0) {
      console.log(JSON.stringify({ level: 'info', message: 'spotCheck: no verified credentials found' }));
      return;
    }

    // Sample rate from Setting (default 10%)
    const spotCheckRate = await getSetting<number>('spotCheckRate', 0.1);
    const sampleSize    = Math.max(1, Math.round(totalVerified * spotCheckRate));

    // MongoDB $sample: picks random documents without full sort
    const sampled = await Credential.aggregate<{ _id: string }>([
      { $match: { 'verification.status': 'verified' } },
      { $sample: { size: sampleSize } },
      { $project: { _id: 1 } },
    ]);

    if (sampled.length === 0) return;

    // Write one AuditLog per sampled credential for admin review
    const auditDocs = sampled.map((doc) => ({
      // Using a sentinel "system" userId — create a dedicated system user
      // in the DB seed, or use a placeholder ObjectId for cron actions.
      userId: new (require('mongoose').Types.ObjectId)('000000000000000000000000'),
      action: 'credential_spot_check',
      meta:   {
        credentialId: doc._id.toString(),
        sampledAt:    new Date().toISOString(),
        totalVerified,
        sampleSize,
      },
    }));

    await AuditLog.insertMany(auditDocs, { ordered: false });

    console.log(
      JSON.stringify({
        level:   'info',
        message: '✅  spotCheck cron complete',
        sampled:  sampled.length,
        totalVerified,
        timestamp: new Date().toISOString(),
      }),
    );
  } catch (err) {
    console.error(
      JSON.stringify({
        level:   'error',
        message: 'spotCheck cron error',
        error:   err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      }),
    );
  }
}

/**
 * scheduleSpotCheck — registers the monthly spot-check cron.
 * Called once at server startup.
 */
export function scheduleSpotCheck(): void {
  // 1st day of every month at 03:00 AM
  cron.schedule('0 3 1 * *', () => {
    void runSpotCheck();
  });

  console.log(
    JSON.stringify({
      level:   'info',
      message: '📅  spotCheck cron registered (1st of month @ 03:00)',
      timestamp: new Date().toISOString(),
    }),
  );
}
