import { Schema, model, type Types } from 'mongoose';

// ── Interface ────────────────────────────────────────────────────────────────

export interface IDept {
  _id: Types.ObjectId;
  code: string;      // e.g. "CS", "ECE", "MECH"
  name: string;      // e.g. "Computer Science & Engineering"
  studentStrength: number;
  headId?: Types.ObjectId; // ref → User (set after F-1)
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ───────────────────────────────────────────────────────────────────

const deptSchema = new Schema<IDept>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    studentStrength: { type: Number, default: 0, min: 0 },
    headId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

export const Dept = model<IDept>('Dept', deptSchema);
