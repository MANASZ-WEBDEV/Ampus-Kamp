import { Schema, model, type Types } from 'mongoose';

// ── Interface ─────────────────────────────────────────────────────────────────

export interface IAuditLog {
  _id: Types.ObjectId;
  userId: Types.ObjectId;   // ref → User
  action: string;           // e.g. 'extraction', 'login', 'roster_import'
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    meta: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
  },
  { timestamps: true },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Quota check: count extractions by userId + action within a time window
auditLogSchema.index({ userId: 1, action: 1, createdAt: -1 });

// TTL: automatically purge logs older than 90 days (keeps DB lean)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

// ── Model ─────────────────────────────────────────────────────────────────────

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
