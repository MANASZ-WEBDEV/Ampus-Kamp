import { Schema, model, type Types } from 'mongoose';

// ── Type Unions ───────────────────────────────────────────────────────────────

export type TeamPostStatus = 'open' | 'full' | 'closed' | 'expired';

// ── Interface ─────────────────────────────────────────────────────────────────

export interface ITeamPost {
  _id: Types.ObjectId;
  eventId:     Types.ObjectId;   // ref → Event (must be published)
  ownerId:     Types.ObjectId;   // ref → User (student who created the post)

  title:       string;           // ≤ 100 chars — shown in the card header
  description: string;           // ≤ 500 chars — markdown-lite plain text
  rolesNeeded: string[];         // ≤ 5 items; each ≤ 50 chars — e.g. ['Frontend', 'ML']

  spotsTotal:  number;           // set at creation; 1–10
  spotsLeft:   number;           // decremented atomically on accept; capped at 0

  status: TeamPostStatus;
  // Lifecycle:
  //   open     — accepting requests
  //   full     — spotsLeft reached 0 (set automatically on accept)
  //   closed   — owner manually closed it
  //   expired  — event deadline passed (set by closeTeamPosts cron)

  expiresAt: Date;               // copied from event.deadline at creation time
                                 // used by closeTeamPosts cron for efficient queries

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ───────────────────────────────────────────────────────────────────

const teamPostSchema = new Schema<ITeamPost>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    rolesNeeded: {
      type: [String],
      default: [],
      validate: {
        validator: (arr: string[]) => arr.length <= 5 && arr.every(r => r.length <= 50),
        message: 'rolesNeeded: max 5 roles, each ≤ 50 chars.',
      },
    },

    spotsTotal: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    spotsLeft: {
      type: Number,
      required: true,
      min: 0,
      // Set to spotsTotal at creation by service layer.
      // Updated atomically via $inc with { spotsLeft: { $gt: 0 } } guard.
    },

    status: {
      type: String,
      enum: ['open', 'full', 'closed', 'expired'],
      default: 'open',
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      // Copied from event.deadline at creation. The closeTeamPosts cron uses
      // this field to avoid joining the Event collection on every run.
    },
  },
  { timestamps: true },
);

// ── Indexes ──────────────────────────────────────────────────────────────────

// Primary feed query: list open posts for a specific event
teamPostSchema.index({ eventId: 1, status: 1 });

// My posts view (owner dashboard)
teamPostSchema.index({ ownerId: 1, createdAt: -1 });

// Cron: find posts to expire by event deadline
teamPostSchema.index({ expiresAt: 1 }, { partialFilterExpression: { status: { $in: ['open', 'full'] } } });

// ── Model ────────────────────────────────────────────────────────────────────

export const TeamPost = model<ITeamPost>('TeamPost', teamPostSchema);
