import { Schema, model, type Types } from 'mongoose';

// ── Verification sub-document ─────────────────────────────────────────────────

export type CredVerifStatus = 'pending' | 'verified' | 'rejected';
export type CredVerifMethod = 'issuer_qr' | 'faculty' | 'admin';
export type CredTier        = 'pass' | 'elite' | 'elite_silver' | 'elite_gold';

export interface IVerification {
  status:      CredVerifStatus;
  method:      CredVerifMethod;
  verifiedBy?: Types.ObjectId;   // ref → User (faculty/admin who actioned)
  verifiedAt?: Date;
  reason?:     string;           // rejection reason
  evidence?:   string;           // QR fetch HTML snippet (≤ 500 chars)
}

const verificationSchema = new Schema<IVerification>(
  {
    status:     { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    method:     { type: String, enum: ['issuer_qr', 'faculty', 'admin'], default: 'faculty' },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
    verifiedAt: { type: Date, default: undefined },
    reason:     { type: String, trim: true, default: undefined },
    evidence:   { type: String, trim: true, default: undefined },
  },
  { _id: false },
);

// ── QR sub-document ───────────────────────────────────────────────────────────

export interface IQr {
  url:  string;
  host: string;
}

const qrSchema = new Schema<IQr>(
  {
    url:  { type: String, required: true },
    host: { type: String, required: true },
  },
  { _id: false },
);

// ── Credential interface ───────────────────────────────────────────────────────

export interface ICredential {
  _id:             Types.ObjectId;
  studentId:       Types.ObjectId;   // ref → User  (from req.user — never body)
  department:      Types.ObjectId;   // ref → Dept  (from req.user — never body)
  courseId?:       Types.ObjectId;   // ref → Course; null if "Other" course
  otherCourseName?: string;          // set when courseId is null
  issuer:          string;
  session:         string;           // e.g. 'Jan–Apr 2026'
  year:            number;           // academic year (for F-8 analytics)
  tier:            CredTier;
  certificateId:   string;           // as printed on the certificate
  proofUrl:        string;           // stored file path/URL
  proofHash:       string;           // SHA-256 of uploaded file — server-computed ONLY
  qr?:             IQr;
  verification:    IVerification;
  createdAt:       Date;
  updatedAt:       Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const credentialSchema = new Schema<ICredential>(
  {
    studentId:  { type: Schema.Types.ObjectId, ref: 'User',   required: true },
    department: { type: Schema.Types.ObjectId, ref: 'Dept',   required: true },

    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      default: undefined,
    },
    otherCourseName: {
      type: String,
      trim: true,
      default: undefined,
    },

    issuer:        { type: String, required: true, trim: true },
    session:       { type: String, required: true, trim: true },
    year:          { type: Number, required: true },
    tier:          { type: String, enum: ['pass', 'elite', 'elite_silver', 'elite_gold'], required: true },
    certificateId: { type: String, required: true, trim: true },
    proofUrl:      { type: String, required: true },
    proofHash:     { type: String, required: true },

    qr:           { type: qrSchema, default: undefined },
    verification: { type: verificationSchema, required: true },
  },
  { timestamps: true },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// PARTIAL UNIQUE: same (issuer + certificateId) allowed only once while
// status is 'pending' or 'verified'. Rejected certs can be re-uploaded.
credentialSchema.index(
  { issuer: 1, certificateId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      'verification.status': { $in: ['pending', 'verified'] },
    },
    name: 'unique_active_cert_id',
  },
);

// ABSOLUTE UNIQUE: same file content can only exist once in the system
// (prevents credential laundering across students).
credentialSchema.index({ proofHash: 1 }, { unique: true, name: 'unique_proof_hash' });

// Faculty queue: dept-scoped pending queue sorted oldest-first
credentialSchema.index(
  { department: 1, year: 1, 'verification.status': 1 },
  { name: 'faculty_queue' },
);

// Student's own achievements list (newest first)
credentialSchema.index(
  { studentId: 1, createdAt: -1 },
  { name: 'student_credentials' },
);

// spotCheck cron: sample verified items by status + createdAt
credentialSchema.index(
  { 'verification.status': 1, createdAt: 1 },
  { name: 'spot_check' },
);

// ── Model ─────────────────────────────────────────────────────────────────────

export const Credential = model<ICredential>('Credential', credentialSchema);
