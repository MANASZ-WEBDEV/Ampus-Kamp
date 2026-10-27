import cron         from 'node-cron';
import mongoose      from 'mongoose';
import { Event }    from '@/models/event.model';
import { Registration } from '@/models/registration.model';
import { AuditLog } from '@/models/auditLog.model';
import { sendNotification } from '@/modules/notifications/notification.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * isAlreadySent — checks AuditLog for a recent reminder for the given
 * (eventId, hoursLeft) pair within a 2-hour dedup window.
 *
 * Why AuditLog (not an Event field)?
 *   Separates the scheduling concern from the domain model (SRP).
 *   AuditLog is already indexed on (action, createdAt).
 */
async function isAlreadySent(eventId: string, hoursLeft: 48 | 4): Promise<boolean> {
  const since = new Date(Date.now() - 2 * 3600 * 1000);
  const found = await AuditLog.exists({
    action:          'deadline_reminder',
    'meta.eventId':  eventId,
    'meta.hoursLeft': hoursLeft,
    createdAt:       { $gte: since },
  });
  return !!found;
}

/**
 * processWindow — finds events whose deadline falls in [loBound, hiBound],
 * skips already-sent reminders, fans out in-app (+ email for 48h) notifications
 * to all registered students, then records in AuditLog for dedup.
 */
async function processWindow(
  hoursLeft: 48 | 4,
  loBound:   Date,
  hiBound:   Date,
): Promise<void> {
  const label = `[deadlineReminders:${hoursLeft}h]`;

  const events = await Event.find({
    status:   'published',
    deadline: { $gte: loBound, $lt: hiBound },
    deletedAt: { $exists: false },
  })
    .select('_id title')
    .lean();

  if (events.length === 0) return;

  for (const event of events) {
    const eventId = event._id.toString();

    // Dedup: skip if already sent within the last 2 hours
    if (await isAlreadySent(eventId, hoursLeft)) {
      continue;
    }

    // Fan-out to all registrants (submitted or locked — excludes withdrawn/draft)
    // Registrants are stored in IRegistration.members[].userId (sub-document).
    const registrations = await Registration.find({
      eventId: new mongoose.Types.ObjectId(eventId),
      status:  { $in: ['submitted', 'locked'] },
    })
      .select('members')
      .lean();

    if (registrations.length === 0) continue;

    // Collect unique user IDs across all registrations (a team registers once,
    // all members get the notification)
    const userIds = new Set<string>();
    for (const reg of registrations) {
      for (const member of reg.members) {
        if (member.status !== 'declined') {
          userIds.add(member.userId.toString());
        }
      }
    }

    console.log(`${label} Notifying ${userIds.size} registrant(s) for "${event.title}".`);

    for (const userId of userIds) {
      void sendNotification(userId, {
        type:       'deadline',
        eventId,
        eventTitle: event.title,
        hoursLeft,
      });
    }

    // Record in AuditLog — dedup key for next run
    await AuditLog.create({
      action: 'deadline_reminder',
      meta:   { eventId, hoursLeft },
    });
  }
}

// ── Cron ──────────────────────────────────────────────────────────────────────

/**
 * scheduleDeadlineReminders — runs every hour on the hour.
 *
 * On each tick:
 *   48h window: events with deadline ∈ [now+47h, now+49h]
 *    4h window: events with deadline ∈ [now+3h,  now+5h]
 *
 * The ±1h window (not exact match) handles timing drift from the hourly cron.
 * AuditLog dedup ensures no double-sends even if the cron drifts slightly.
 */
export function scheduleDeadlineReminders(): void {
  cron.schedule('0 * * * *', async () => {
    const label = '[deadlineReminders cron]';
    try {
      const now = new Date();

      await Promise.all([
        processWindow(
          48,
          new Date(now.getTime() + 47 * 3600 * 1000),
          new Date(now.getTime() + 49 * 3600 * 1000),
        ),
        processWindow(
          4,
          new Date(now.getTime() + 3 * 3600 * 1000),
          new Date(now.getTime() + 5 * 3600 * 1000),
        ),
      ]);
    } catch (err) {
      // Never crash the server process
      console.error(`${label} Failed:`, err);
    }
  });

  console.log('⏰  deadlineReminders cron scheduled — every hour on the hour.');
}
