import { Schema, model, type Types } from 'mongoose';

// ── Interface ────────────────────────────────────────────────────────────────

export interface IOtp {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  purpose: 'email_verification' | 'password_reset';
  codeHash: string;  // SHA-256 of the 6-digit code — never store plaintext
  attempts: number;  // max 3 before record is deleted
  expiresAt: Date;   // TTL — 10 minutes from creation
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ───────────────────────────────────────────────────────────────────

const otpSchema = new Schema<IOtp>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    purpose: {
      type: String,
      enum: ['email_verification', 'password_reset'],
      required: true,
    },
    codeHash: { type: String, required: true, select: false },
    attempts: { type: Number, default: 0, min: 0, max: 3 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// TTL — MongoDB auto-deletes the document when expiresAt is in the past
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Useful for finding the latest OTP for a user+purpose
otpSchema.index({ userId: 1, purpose: 1 });

export const Otp = model<IOtp>('Otp', otpSchema);
