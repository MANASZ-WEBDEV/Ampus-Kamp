import { Schema, model, type Types } from 'mongoose';
import type { IVerification } from './credential.model';

// Re-use the same verification sub-document structure (DRY)
const verificationSchema = new Schema<IVerification>(
  {
    status:     { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    method:     { type: String, enum: ['faculty', 'admin'], default: 'faculty' },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
    verifiedAt: { type: Date, default: undefined },
    reason:     { type: String, trim: true, default: undefined },
    evidence:   { type: String, trim: true, default: undefined },
  },
  { _id: false },
);

// ── Team member sub-document ──────────────────────────────────────────────────

export interface IParticipationMember {
  userId:     Types.ObjectId;
  department: Types.ObjectId;
}

const participationMemberSchema = new Schema<IParticipationMember>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: Schema.Types.ObjectId, ref: 'Dept', required: true },
  },
  { _id: false },
);

// ── Participation interface ───────────────────────────────────────────────────

export type ParticipationResult = 'winner' | 'runner_up' | 'participant' | 'finisher';

export interface IParticipation {
  _id:             Types.ObjectId;
  studentId:       Types.ObjectId;    // ref → User (from req.user — never body)
  eventId:         Types.ObjectId;    // ref → Event
  registrationId?: Types.ObjectId;    // ref → Registration (optional)
  teamName?:       string;
  members:         IParticipationMember[];
  result:          ParticipationResult;
  resultNote?:     string;            // e.g. '2nd place out of 45 teams'
  proofUrl:        string;            // certificate / screenshot
  proofHash:       string;            // SHA-256 server-computed
  verification:    IVerification;
  createdAt:       Date;
  updatedAt:       Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const participationSchema = new Schema<IParticipation>(
  {
    studentId:      { type: Schema.Types.ObjectId, ref: 'User',         required: true },
    eventId:        { type: Schema.Types.ObjectId, ref: 'Event',        required: true },
    registrationId: { type: Schema.Types.ObjectId, ref: 'Registration', default: undefined },

    teamName:   { type: String, trim: true, default: undefined },
    members:    { type: [participationMemberSchema], default: [] },

    result: {
      type: String,
      enum: ['winner', 'runner_up', 'participant', 'finisher'],
      required: true,
    },
    resultNote: { type: String, trim: true, maxlength: 200, default: undefined },

    proofUrl:  { type: String, required: true },
    proofHash: { type: String, required: true },

    verification: { type: verificationSchema, required: true },
  },
  { timestamps: true },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// One participation proof per student per event
participationSchema.index(
  { studentId: 1, eventId: 1 },
  { unique: true, name: 'unique_student_event_participation' },
);

// Faculty verification queue for a given event
participationSchema.index(
  { eventId: 1, 'verification.status': 1 },
  { name: 'event_participation_queue' },
);

// Student's own participation history
participationSchema.index(
  { studentId: 1, createdAt: -1 },
  { name: 'student_participations' },
);

// ── Model ─────────────────────────────────────────────────────────────────────

export const Participation = model<IParticipation>('Participation', participationSchema);
