import { Schema, model, type Types } from 'mongoose';

// ── Types ─────────────────────────────────────────────────────────────────────

export type VerificationMethod = 'issuer_qr' | 'faculty' | 'manual';

export interface ICourse {
  _id: Types.ObjectId;
  issuer: string;             // 'NPTEL' | 'Coursera' | 'Udemy' | …
  name: string;               // canonical name
  code?: string;              // e.g. 'CS101'
  category: string;           // 'programming' | 'data_science' | 'design' | …
  language?: string;
  aliases: string[];          // alternate spellings for fuzzy search
  verificationMethod: VerificationMethod;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const courseSchema = new Schema<ICourse>(
  {
    issuer: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      default: undefined,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    language: {
      type: String,
      trim: true,
      default: undefined,
    },
    aliases: {
      type: [String],
      default: [],
    },
    verificationMethod: {
      type: String,
      enum: ['issuer_qr', 'faculty', 'manual'],
      default: 'faculty',
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Unique: one canonical entry per issuer+name pair
courseSchema.index({ issuer: 1, name: 1 }, { unique: true, name: 'unique_issuer_name' });

// Text search for catalog endpoint — supports both name and alias lookups
courseSchema.index({ name: 'text', aliases: 'text' }, { name: 'course_text_search' });

// Filter by category (admin management)
courseSchema.index({ category: 1, active: 1 });

// ── Model ─────────────────────────────────────────────────────────────────────

export const Course = model<ICourse>('Course', courseSchema);
