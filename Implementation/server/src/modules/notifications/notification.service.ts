import { Notification, type NotificationType } from '@/models/notification.model';
import { User }                               from '@/models/user.model';
import { sendNotificationEmail }             from '@/services/email.service';
import type { NotificationEmailPayload }     from '@/services/email.service';
import mongoose                              from 'mongoose';

// ── Discriminated union — type-safe payload per notification type ──────────────

type NotifPayload =
  | { type: 'event_new';         eventId: string; eventTitle: string }
  | { type: 'deadline';          eventId: string; eventTitle: string; hoursLeft: 48 | 4 }
  | { type: 'link_received';     linkId:  string; fromName:   string }
  | { type: 'link_update';       linkId:  string; status: 'accepted' | 'declined' }
  | { type: 'credential_update'; credId:  string; status: 'verified' | 'rejected'; courseName?: string }
  | { type: 'link_expiring';     linkId:  string };

// ── Email eligibility ─────────────────────────────────────────────────────────

/**
 * Conservative email strategy — only send email for high-value, actionable types.
 * Link-related and expiry notifications are in-app only to avoid spam.
 */
function shouldEmail(payload: NotifPayload): boolean {
  if (payload.type === 'event_new')          return true;
  if (payload.type === 'credential_update')  return true;
  if (payload.type === 'deadline')           return payload.hoursLeft === 48;
  return false;
}

// ── Email payload builder ─────────────────────────────────────────────────────

function buildEmailPayload(
  userName: string,
  userEmail: string,
  payload: NotifPayload,
): NotificationEmailPayload {
  switch (payload.type) {
    case 'event_new':
      return {
        to:       userEmail,
        name:     userName,
        subject:  `New Event: ${payload.eventTitle}`,
        heading:  `New event published: ${payload.eventTitle}`,
        body:     'A new event has been posted for your department. Register before the deadline.',
        ctaUrl:   `/events/${payload.eventId}`,
        ctaLabel: 'View Event',
      };

    case 'deadline':
      return {
        to:       userEmail,
        name:     userName,
        subject:  `Deadline in 48h: ${payload.eventTitle}`,
        heading:  `Deadline approaching: ${payload.eventTitle}`,
        body:     'Registration closes in 48 hours. Make sure you\'ve submitted your entry.',
        ctaUrl:   `/events/${payload.eventId}`,
        ctaLabel: 'Register Now',
      };

    case 'credential_update': {
      const isVerified = payload.status === 'verified';
      const course     = payload.courseName ?? 'your certificate';
      return {
        to:       userEmail,
        name:     userName,
        subject:  isVerified ? `Certificate Verified ✓` : `Certificate Needs Attention`,
        heading:  isVerified
          ? `${course} has been verified`
          : `${course} needs review`,
        body: isVerified
          ? 'Your certificate has been successfully verified by a faculty member. It now contributes to your department ranking.'
          : 'A faculty member has reviewed your certificate and requires more information. Please check your badges page.',
        ctaUrl:   '/badges',
        ctaLabel: 'View Badges',
      };
    }

    // These types never send email — this branch is unreachable due to shouldEmail() guard
    default:
      throw new Error(`buildEmailPayload called for non-email type: ${(payload as NotifPayload).type}`);
  }
}

// ── Core fire-and-forget ──────────────────────────────────────────────────────

/**
 * _send — async implementation. Always writes in-app notification.
 * Sends email only for eligible types. Never throws — errors are logged only.
 */
async function _send(userId: string, payload: NotifPayload): Promise<void> {
  try {
    // 1. Always: write in-app notification (includes payload for UI rendering)
    await Notification.create({
      userId: new mongoose.Types.ObjectId(userId),
      type:   payload.type,
      payload,
    });

    // 2. Conditionally: send email for high-value types
    if (shouldEmail(payload)) {
      const user = await User.findById(userId).select('email name').lean();
      if (user) {
        const emailPayload = buildEmailPayload(user.name, user.email, payload);
        await sendNotificationEmail(emailPayload);
      }
    }
  } catch (err) {
    // Notification errors must never propagate to the caller.
    // Logging here gives ops visibility without breaking the main request.
    console.error(
      JSON.stringify({
        level:   'error',
        message: 'sendNotification failed',
        userId,
        type:    payload.type,
        error:   err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      }),
    );
  }
}

/**
 * sendNotification — fire-and-forget entry point.
 *
 * Returns void synchronously. The Promise is intentionally dropped.
 * Spec: "notification sending never blocks API response."
 *
 * Usage:
 *   void sendNotification(userId, { type: 'credential_update', ... });
 *   // or equivalently:
 *   sendNotification(userId, { type: 'credential_update', ... });
 */
export function sendNotification(userId: string, payload: NotifPayload): void {
  void _send(userId, payload);
}

// ── API-facing functions ──────────────────────────────────────────────────────

/**
 * getNotifications — cursor-based pagination (ObjectId cursor, stable on fast-inserting collection).
 * Returns one extra item to determine hasMore; pops it and returns nextCursor if present.
 */
export async function getNotifications(
  userId:  string,
  cursor?: string,
  limit    = 20,
): Promise<{
  notifications: ReturnType<typeof toNotifShape>[];
  nextCursor?:   string;
}> {
  const filter: mongoose.FilterQuery<InstanceType<typeof Notification>> = { userId };

  // Cursor: show items older than the cursor _id
  if (cursor && mongoose.isValidObjectId(cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const raw = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore   = raw.length > limit;
  const items     = hasMore ? raw.slice(0, limit) : raw;
  const nextCursor = hasMore ? items[items.length - 1]?._id.toString() : undefined;

  return { notifications: items.map(toNotifShape), nextCursor };
}

/**
 * markRead — idempotent. No-op if already read or not found.
 * userId guard prevents marking another user's notification.
 */
export async function markRead(userId: string, notificationId: string): Promise<void> {
  if (!mongoose.isValidObjectId(notificationId)) return;
  await Notification.findOneAndUpdate(
    { _id: notificationId, userId, readAt: null },
    { $set: { readAt: new Date() } },
  );
}

// ── Shape helper ──────────────────────────────────────────────────────────────

function toNotifShape(doc: {
  _id:      mongoose.Types.ObjectId;
  type:     NotificationType;
  payload:  Record<string, unknown>;
  readAt?:  Date | null;
  createdAt: Date;
}) {
  return {
    id:        doc._id.toString(),
    type:      doc.type,
    payload:   doc.payload,
    readAt:    doc.readAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}
