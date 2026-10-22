import { Schema, model, type Types } from 'mongoose';

// ── Sub-document: Member ──────────────────────────────────────────────────────
//
// SDE3 note on member lifecycle:
//   invited  → default when leader adds a teammate
//   confirmed → member explicitly accepted via PATCH /registrations/:id/members/:uid
//   declined  → member explicitly declined → removed from members[] by service
//
// The partial unique index on { members.userId, eventId } where status IN
// [draft, submitted, locked] guarantees ONE active registration per student
// per event at the DB level — no app-level mutex needed.

export type MemberStatus = 'invited' | 'confirmed' | 'declined';

export interface IMember {
  userId:      Types.ObjectId;   // ref → User
  status:      MemberStatus;
  respondedAt?: Date;
}

const memberSchema = new Schema<IMember>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status:      { type: String, enum: ['invited', 'confirmed', 'declined'], default: 'invited' },
    respondedAt: { type: Date, default: undefined },
  },
  { _id: false }, // embedded sub-doc — no separate _id needed
);

// ── Interface: Registration ───────────────────────────────────────────────────

export type RegistrationType   = 'individual' | 'team' | 'tracking';
export type RegistrationStatus = 'draft' | 'submitted' | 'withdrawn' | 'locked';

export interface IRegistration {
  _id:          Types.ObjectId;
  eventId:      Types.ObjectId;    // ref → Event
  type:         RegistrationType;
  teamName?:    string;            // required when type='team'; ≤ 60 chars
  leaderId:     Types.ObjectId;    // ref → User (always the creator)
  members:      IMember[];         // leader is always members[0] as 'confirmed'
  externalRegId?: string;          // optional: registration ID from external site
  status:       RegistrationStatus;
  submittedAt?: Date;
  createdAt:    Date;
  updatedAt:    Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const registrationSchema = new Schema<IRegistration>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },

    type: {
      type: String,
      enum: ['individual', 'team', 'tracking'],
      required: true,
    },

    teamName: {
      type: String,
      trim: true,
      maxlength: 60,
      default: undefined,
    },

    leaderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    members: {
      type: [memberSchema],
      default: [],
    },

    externalRegId: {
      type: String,
      trim: true,
      default: undefined,
    },

    status: {
      type: String,
      enum: ['draft', 'submitted', 'withdrawn', 'locked'],
      default: 'draft',
    },

    submittedAt: { type: Date, default: undefined },
  },
  { timestamps: true },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// ONE active registration per student per event.
// Partial filter: only applies when status is draft | submitted | locked.
// Withdrawn registrations are excluded — a student can re-register after withdrawing.
// This index catches duplicate insertions at the DB layer (Mongo error 11000 → 409).
registrationSchema.index(
  { 'members.userId': 1, eventId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['draft', 'submitted', 'locked'] } },
    name: 'unique_active_member_per_event',
  },
);

// Faculty roster query: all registrations for an event sorted by submission time
registrationSchema.index({ eventId: 1, status: 1, createdAt: -1 });

// Leader's own registration (my-registration lookup)
registrationSchema.index({ leaderId: 1, eventId: 1 });

// lockRegistrations cron: find submitted regs for events past registrationDeadline
registrationSchema.index({ status: 1, eventId: 1 });

// ── Model ─────────────────────────────────────────────────────────────────────

export const Registration = model<IRegistration>('Registration', registrationSchema);
