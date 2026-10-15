import { Schema, model, type Types } from 'mongoose';

// ── Interface ────────────────────────────────────────────────────────────────

export type UserRole = 'student' | 'faculty' | 'dept_head' | 'admin';
export type UserStatus = 'pending' | 'active' | 'suspended';

export interface IUser {
  _id: Types.ObjectId;
  enrollmentNo: string;
  collegeId: string;
  name: string;
  email: string;
  passwordHash: string;     // select:false — never in query results by default
  role: UserRole;
  department: Types.ObjectId; // ref → Dept
  year?: number;             // null for faculty/admin
  skills: string[];
  phone?: string;            // select:false
  phoneVisible: boolean;
  allowInvites: boolean;
  status: UserStatus;
  emailVerified: boolean;
  lastLoginAt?: Date;
  firstOpenedAt?: Date;      // set once on first ever login
  firstEventOpenedAt?: Date; // set once when they first open an event (F-2)
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ───────────────────────────────────────────────────────────────────

const userSchema = new Schema<IUser>(
  {
    enrollmentNo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    collegeId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // ← NEVER returned unless explicitly .select('+passwordHash')
    },
    role: {
      type: String,
      enum: ['student', 'faculty', 'dept_head', 'admin'],
      required: true,
      default: 'student',
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Dept',
      required: true,
    },
    year: { type: Number, min: 1, max: 5, default: null },
    skills: { type: [String], default: [] },
    phone: {
      type: String,
      trim: true,
      select: false, // ← NEVER returned unless explicitly selected
      default: null,
    },
    phoneVisible: { type: Boolean, default: false },
    allowInvites: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended'],
      default: 'pending',
    },
    emailVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
    firstOpenedAt: { type: Date, default: null },
    firstEventOpenedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// ── Indexes ──────────────────────────────────────────────────────────────────

// Team-finder filter: branch × year
userSchema.index({ department: 1, year: 1 });
// Skill search
userSchema.index({ skills: 1 });

export const User = model<IUser>('User', userSchema);
