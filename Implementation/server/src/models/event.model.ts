import { Schema, model, type Types } from 'mongoose';

// ── Type Unions ───────────────────────────────────────────────────────────────

export type EventType =
  | 'hackathon'
  | 'competition'
  | 'sports'
  | 'workshop'
  | 'seminar'
  | 'other';

export type EventStatus = 'draft' | 'published' | 'closed' | 'archived';

// ── Interface ────────────────────────────────────────────────────────────────

export interface IEvent {
  _id: Types.ObjectId;
  title: string;
  type: EventType;
  organizer?: string;
  deadline?: Date;
  eventDate?: Date;
  eligibility: {
    branches: string[];  // empty array = open to all branches
    years: number[];     // empty array = open to all years
    notes?: string;
  };
  teamSize: {
    min: number;
    max: number;
  };
  fee?: string;
  link?: string;
  summary?: string;
  registrationMode: 'in_app' | 'external';
  registrationDeadline?: Date;  // defaults to deadline on create
  counters: {
    students: number;   // confirmed individual + team members
    teams: number;      // submitted team registrations
    tracking: number;   // external "I registered" marks
  };
  rawMessage?: string;           // original pasted text — NEVER sent to students
  extraction?: {
    model?: string;              // LLM model name used
    promptVersion?: string;      // incremented when prompt changes (F-3)
    editedFields: string[];      // fields faculty changed after extraction
    usedFallback: boolean;       // true if regex fallback was used
  };
  postedBy: Types.ObjectId;      // ref → User
  status: EventStatus;
  deletedAt?: Date;              // soft-delete — null = active
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ───────────────────────────────────────────────────────────────────

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },

    type: {
      type: String,
      enum: ['hackathon', 'competition', 'sports', 'workshop', 'seminar', 'other'],
      required: true,
      index: true,
    },

    organizer: { type: String, trim: true, default: undefined },
    deadline: { type: Date, default: undefined },
    eventDate: { type: Date, default: undefined },

    eligibility: {
      branches: { type: [String], default: [] }, // [] = open to all
      years: { type: [Number], default: [] },    // [] = open to all
      notes: { type: String, trim: true, default: undefined },
    },

    teamSize: {
      min: { type: Number, default: 1, min: 1 },
      max: { type: Number, default: 1, min: 1 },
    },

    fee: { type: String, trim: true, default: undefined },
    link: { type: String, trim: true, default: undefined },
    summary: { type: String, trim: true, maxlength: 200, default: undefined },

    registrationMode: {
      type: String,
      enum: ['in_app', 'external'],
      default: 'external',
    },

    registrationDeadline: { type: Date, default: undefined },

    counters: {
      students: { type: Number, default: 0 },
      teams: { type: Number, default: 0 },
      tracking: { type: Number, default: 0 },
    },

    // Original pasted text — projection excludes this from student responses in service layer
    rawMessage: { type: String, default: undefined },

    extraction: {
      model: { type: String, default: undefined },
      promptVersion: { type: String, default: undefined },
      editedFields: { type: [String], default: [] },
      usedFallback: { type: Boolean, default: false },
      _id: false,
    },

    postedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    status: {
      type: String,
      enum: ['draft', 'published', 'closed', 'archived'],
      default: 'draft',
      index: true,
    },

    // Soft-delete: set to a Date when deleted; absent when active.
    // All feed queries must filter { deletedAt: { $exists: false } }.
    deletedAt: { type: Date, default: undefined },
  },
  { timestamps: true },
);

// ── Indexes ──────────────────────────────────────────────────────────────────

// Primary feed query: published events sorted by deadline
eventSchema.index({ status: 1, deadline: 1 });

// Type filter within the feed
eventSchema.index({ type: 1, deadline: 1 });

// "My events" for faculty — own events by creation time
eventSchema.index({ postedBy: 1, createdAt: -1 });

// Soft-delete admin view (sparse = only documents that have deletedAt are indexed)
eventSchema.index({ deletedAt: 1 }, { sparse: true });

// ── Model ────────────────────────────────────────────────────────────────────

export const Event = model<IEvent>('Event', eventSchema);
