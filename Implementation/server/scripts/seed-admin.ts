/**
 * seed-admin.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time script: creates an admin user (bypassing the roster / OTP flow)
 * and prints a signed JWT you can paste straight into Postman / curl.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 *
 * The script is idempotent — running it again just prints a fresh token for
 * the existing admin account; it won't create a duplicate.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import dotenv from 'dotenv';
dotenv.config();                        // must be first — env needs JWT_SECRET

import mongoose from 'mongoose';
import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ── Minimal inline models (avoids path-alias issues outside the build) ────────

interface IDept { _id: mongoose.Types.ObjectId; code: string; name: string; studentStrength: number; }
const Dept = model<IDept>('Dept', new Schema({
  code:            { type: String, required: true, unique: true, uppercase: true, trim: true },
  name:            { type: String, required: true, trim: true },
  studentStrength: { type: Number, default: 0 },
}, { timestamps: true }));

interface IUser {
  _id:           mongoose.Types.ObjectId;
  enrollmentNo:  string;
  collegeId:     string;
  name:          string;
  email:         string;
  passwordHash:  string;
  role:          string;
  department:    mongoose.Types.ObjectId;
  status:        string;
  emailVerified: boolean;
  skills:        string[];
  phoneVisible:  boolean;
  allowInvites:  boolean;
}
const User = model<IUser>('User', new Schema({
  enrollmentNo:  { type: String, required: true, unique: true, uppercase: true, trim: true },
  collegeId:     { type: String, required: true, trim: true },
  name:          { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash:  { type: String, required: true, select: false },
  role:          { type: String, enum: ['student','faculty','dept_head','admin'], default: 'student' },
  department:    { type: Schema.Types.ObjectId, ref: 'Dept', required: true },
  year:          { type: Number, default: null },
  skills:        { type: [String], default: [] },
  phone:         { type: String, default: null, select: false },
  phoneVisible:  { type: Boolean, default: false },
  allowInvites:  { type: Boolean, default: true },
  status:        { type: String, enum: ['pending','active','suspended'], default: 'pending' },
  emailVerified: { type: Boolean, default: false },
  lastLoginAt:   { type: Date, default: null },
  firstOpenedAt: { type: Date, default: null },
}, { timestamps: true }));

// ── Config ────────────────────────────────────────────────────────────────────

const ADMIN = {
  enrollmentNo: 'ADMIN001',
  collegeId:    'ADMIN-001',
  name:         'Campus Admin',
  email:        'admin@campus.local',
  password:     'Admin@1234',          // ← change after first use
  deptCode:     'ADMIN',
};

const JWT_SECRET     = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '30d';
const MONGO_URI      = process.env.MONGODB_URI!;

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!JWT_SECRET) { console.error('❌  JWT_SECRET not set in .env'); process.exit(1); }
  if (!MONGO_URI)  { console.error('❌  MONGODB_URI not set in .env'); process.exit(1); }

  console.log('🔌  Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected.\n');

  // 1. Upsert an ADMIN dept
  const dept = await Dept.findOneAndUpdate(
    { code: ADMIN.deptCode },
    { $setOnInsert: { code: ADMIN.deptCode, name: 'Administration', studentStrength: 0 } },
    { upsert: true, new: true },
  );

  // 2. Upsert the admin user
  let user = await User.findOne({ enrollmentNo: ADMIN.enrollmentNo }).select('+passwordHash');

  if (!user) {
    console.log('👤  Admin user not found — creating…');
    const passwordHash = await bcrypt.hash(ADMIN.password, 12);
    user = await User.create({
      enrollmentNo:  ADMIN.enrollmentNo,
      collegeId:     ADMIN.collegeId,
      name:          ADMIN.name,
      email:         ADMIN.email,
      passwordHash,
      role:          'admin',
      department:    dept._id,
      status:        'active',
      emailVerified: true,
    });
    console.log('✅  Admin user created.\n');
  } else {
    console.log('ℹ️   Admin user already exists — skipping creation.\n');
  }

  // 3. Sign a fresh JWT
  const token = jwt.sign(
    {
      id:         user._id.toString(),
      role:       user.role,
      department: dept._id.toString(),
      name:       user.name,
      status:     user.status,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  );

  // 4. Print instructions
  console.log('─────────────────────────────────────────────────────────');
  console.log('🎟️   ADMIN JWT TOKEN (valid for', JWT_EXPIRES_IN, ')');
  console.log('─────────────────────────────────────────────────────────');
  console.log(token);
  console.log('─────────────────────────────────────────────────────────\n');

  console.log('📋  How to use in Postman:');
  console.log('    Tab: Authorization → Bearer Token → paste the token above\n');

  console.log('📋  How to use with curl:');
  console.log(`    curl -X POST http://localhost:5000/api/v1/roster/import \\`);
  console.log(`      -H "Authorization: Bearer <TOKEN_ABOVE>" \\`);
  console.log(`      -F "file=@roster.csv"\n`);

  await mongoose.disconnect();
  console.log('👋  Done.');
}

main().catch((err) => {
  console.error('💥  Script failed:', err);
  process.exit(1);
});
