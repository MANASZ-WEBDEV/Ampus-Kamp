import { Schema, model, type Types } from 'mongoose';

// ── Type Unions ───────────────────────────────────────────────────────────────

export type LinkDirection = 'request' | 'invite' | 'connect';
export type LinkStatus    = 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired';

// ── Interface ─────────────────────────────────────────────────────────────────

export interface ITeamLink {
  _id: Types.ObjectId;

  direction:   LinkDirection;
  // request — student asks to join a TeamPost (Path A — F-4)
  // invite  — leader invites a student from profile/search (Path B — F-5)
  // connect — direct connect to any student (Path C — F-5)

  fromUserId:  Types.ObjectId;  // sender
  toUserId:    Types.ObjectId;  // recipient

  eventId?:    Types.ObjectId;  // always set for request/invite; optional for connect
  teamPostId?: Types.ObjectId;  // set for direction='request'; null for invite/connect

  message?:    string;          // ≤ 200 chars, plain text, NO URLs — enforced by Zod

  status: LinkStatus;
  // Lifecycle:
  //   pending   → accepted | declined | withdrawn
  //   accepted  → (terminal)
  //   declined  → (terminal) — 30-day cool-down before pair can re-request
  //   withdrawn → (terminal) — sender pulled the request
  //   expired   → (terminal) — set by expireLinks cron after 7 days

  expiresAt:   Date;            // createdAt + 7 days; used by cron
  respondedAt?: Date;           // set on accept/decline

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ───────────────────────────────────────────────────────────────────

const teamLinkSchema = new Schema<ITeamLink>(
  {
    direction: {
      type: String,
      enum: ['request', 'invite', 'connect'],
      required: true,
    },

    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      default: undefined,
    },
    teamPostId: {
      type: Schema.Types.ObjectId,
      ref: 'TeamPost',
      default: undefined,
    },

    message: {
      type: String,
      trim: true,
      maxlength: 200,
      default: undefined,
      // URL check enforced at Zod layer — DB is last-resort safety net only
    },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'withdrawn', 'expired'],
      default: 'pending',
    },

    expiresAt: {
      type: Date,
      required: true,
      // Set to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) by service layer
    },

    respondedAt: {
      type: Date,
      default: undefined,
    },
  },
  { timestamps: true },
);

// ── Indexes ──────────────────────────────────────────────────────────────────

// Inbox: messages I received — sorted newest first
teamLinkSchema.index({ toUserId: 1, status: 1, createdAt: -1 });

// Sent: messages I sent
teamLinkSchema.index({ fromUserId: 1, status: 1, createdAt: -1 });

// One pending link per (sender, recipient, event) — prevents duplicate requests
// Partial index means this uniqueness only applies while status='pending'
// so a declined + re-request after cool-down is allowed at the DB level.
teamLinkSchema.index(
  { fromUserId: 1, toUserId: 1, eventId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
    name: 'one_pending_per_pair_event',
  },
);

// Cron: expire pending links past their expiresAt
teamLinkSchema.index(
  { expiresAt: 1 },
  {
    partialFilterExpression: { status: 'pending' },
    name: 'pending_expiry_cron',
  },
);

// ── Model ────────────────────────────────────────────────────────────────────

export const TeamLink = model<ITeamLink>('TeamLink', teamLinkSchema);
