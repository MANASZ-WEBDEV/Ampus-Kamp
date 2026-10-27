import { Schema, model, type Types } from 'mongoose';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'event_new'          // new published event matching student's dept/year
  | 'deadline'           // 48h or 4h before event deadline
  | 'link_received'      // team request/invite received
  | 'link_update'        // link accepted or declined
  | 'credential_update'  // credential verified or rejected
  | 'link_expiring';     // pending link expires tomorrow

export interface INotification {
  _id:      Types.ObjectId;
  userId:   Types.ObjectId;                 // ref → User
  type:     NotificationType;
  payload:  Record<string, unknown>;        // discriminated union enforced in service
  readAt?:  Date;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const notificationSchema = new Schema<INotification>(
  {
    userId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['event_new', 'deadline', 'link_received', 'link_update', 'credential_update', 'link_expiring'],
      required: true,
    },
    payload: { type: Schema.Types.Mixed, required: true },
    readAt:  { type: Date, default: null },
  },
  { timestamps: true },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Fast unread-first list per user — primary access pattern
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

// ── Model ─────────────────────────────────────────────────────────────────────

export const Notification = model<INotification>('Notification', notificationSchema);
