import { Schema, model, type Types } from 'mongoose';

// ── Interface ─────────────────────────────────────────────────────────────────
//
// A Report is a safety escalation — stored for admin review (F-10).
// The reporter's identity is recorded but never exposed to the target.
// Can reference either a user (profile-level abuse) or a specific link
// (message-level abuse).

export type ReportStatus = 'pending' | 'reviewed' | 'dismissed';

export interface IReport {
  _id:           Types.ObjectId;
  reporterId:    Types.ObjectId;   // ref → User (always required)
  targetUserId?: Types.ObjectId;   // ref → User — who is being reported
  linkId?:       Types.ObjectId;   // ref → TeamLink — the offending link
  reason:        string;           // ≤ 500 chars, required
  status:        ReportStatus;
  reviewedBy?:   Types.ObjectId;   // ref → User (admin who reviewed)
  reviewNotes?:  string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ───────────────────────────────────────────────────────────────────

const reportSchema = new Schema<IReport>(
  {
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },
    linkId: {
      type: Schema.Types.ObjectId,
      ref: 'TeamLink',
      default: undefined,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'dismissed'],
      default: 'pending',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },
    reviewNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: undefined,
    },
  },
  { timestamps: true },
);

// ── Indexes ──────────────────────────────────────────────────────────────────

// Admin queue: sorted by pending-first, newest-first
reportSchema.index({ status: 1, createdAt: -1 });

// Lookup all reports by a given user (anti-abuse tooling)
reportSchema.index({ reporterId: 1, createdAt: -1 });

// Lookup all reports against a target (admin triage)
reportSchema.index({ targetUserId: 1 });

// ── Model ────────────────────────────────────────────────────────────────────

export const Report = model<IReport>('Report', reportSchema);
