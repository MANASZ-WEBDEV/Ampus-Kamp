import { Schema, model, type Types } from 'mongoose';

// ── Interface ─────────────────────────────────────────────────────────────────
//
// A LookingFlag signals that a student is actively seeking teammates
// for a specific event. It is always event-scoped — a student can be
// "looking" for SIH but not for a parallel sports event.
//
// Lifecycle:
//   PUT /events/:id/looking → toggle (upsert if absent, delete if present)
//   Cleared automatically by closeTeamPosts cron when event expires.

export interface ILookingFlag {
  _id:     Types.ObjectId;
  userId:  Types.ObjectId;   // ref → User
  eventId: Types.ObjectId;   // ref → Event
  note?:   string;           // ≤ 120 chars — shown to other students
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ───────────────────────────────────────────────────────────────────

const lookingFlagSchema = new Schema<ILookingFlag>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 120,
      default: undefined,
    },
  },
  { timestamps: true },
);

// ── Indexes ──────────────────────────────────────────────────────────────────

// One flag per student per event (toggle semantics)
lookingFlagSchema.index({ userId: 1, eventId: 1 }, { unique: true });

// List all students looking for a given event (event detail "Looking" tab)
lookingFlagSchema.index({ eventId: 1, createdAt: -1 });

// ── Model ────────────────────────────────────────────────────────────────────

export const LookingFlag = model<ILookingFlag>('LookingFlag', lookingFlagSchema);
