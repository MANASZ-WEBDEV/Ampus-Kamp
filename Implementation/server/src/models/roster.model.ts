import { Schema, model, type Types } from 'mongoose';

// ── Interface ────────────────────────────────────────────────────────────────

export interface IStudentRoster {
  _id: Types.ObjectId;
  enrollmentNo: string;
  collegeId: string;
  name: string;
  department: Types.ObjectId; // ref → Dept
  year: number;               // 1–5
  email?: string;             // used for OTP delivery; required to complete registration
  claimedBy?: Types.ObjectId; // ref → User; set on successful registration
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ───────────────────────────────────────────────────────────────────

const rosterSchema = new Schema<IStudentRoster>(
  {
    enrollmentNo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    collegeId: {
      type: String,
      required: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Dept',
      required: true,
    },
    year: { type: Number, required: true, min: 1, max: 5 },
    email: { type: String, trim: true, lowercase: true, default: null },
    claimedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
);

// Speed up auth.service lookup (the most frequent read)
rosterSchema.index({ enrollmentNo: 1, collegeId: 1 });

export const StudentRoster = model<IStudentRoster>('StudentRoster', rosterSchema);
