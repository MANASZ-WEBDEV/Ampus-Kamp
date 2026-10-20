/**
 * seed-faculty.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time script: creates faculty users (bypassing the roster / OTP flow)
 * and prints signed JWTs you can paste straight into Postman / curl.
 *
 * Creates one faculty account per department that exists in the DB.
 * If a department has no faculty yet, it creates a default one.
 *
 * Usage:
 *   npx tsx scripts/seed-faculty.ts
 *
 * The script is idempotent — running it again skips existing accounts
 * and prints fresh tokens. It won't create duplicates.
 *
 * Seeded accounts:
 *   CS   →  FAC-CS-001  /  faculty.cs@campus.local   /  Faculty@1234
 *   IT   →  FAC-IT-001  /  faculty.it@campus.local   /  Faculty@1234
 *   ADMIN→  FAC-ADM-001 /  faculty.adm@campus.local  /  Faculty@1234
 *   (+ any other dept already in the DB gets one faculty)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import dotenv from 'dotenv';
dotenv.config(); // must be first — env needs JWT_SECRET

import mongoose from 'mongoose';
import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

// ── Minimal inline models (avoids path-alias issues outside the build) ────────

interface IDept {
  _id: mongoose.Types.ObjectId;
  code: string;
  name: string;
  studentStrength: number;
}
const Dept = model<IDept>('Dept', new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  studentStrength: { type: Number, default: 0 },
}, { timestamps: true }));

interface IUser {
  _id: mongoose.Types.ObjectId;
  enrollmentNo: string;
  collegeId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  department: mongoose.Types.ObjectId;
  status: string;
  emailVerified: boolean;
  year?: number;
  skills: string[];
  phoneVisible: boolean;
  allowInvites: boolean;
  lastLoginAt?: Date;
  firstOpenedAt?: Date;
  firstEventOpenedAt?: Date;
}

/** Lean-safe shape returned from both .lean() and .create() normalisation */
type UserLean = IUser;

const User = model<IUser>('User', new Schema({
  enrollmentNo:      { type: String, required: true, unique: true, uppercase: true, trim: true },
  collegeId:         { type: String, required: true, trim: true },
  name:              { type: String, required: true, trim: true },
  email:             { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash:      { type: String, required: true, select: false },
  role:              { type: String, enum: ['student', 'faculty', 'dept_head', 'admin'], default: 'student' },
  department:        { type: Schema.Types.ObjectId, ref: 'Dept', required: true },
  year:              { type: Number, default: null },
  skills:            { type: [String], default: [] },
  phone:             { type: String, default: null, select: false },
  phoneVisible:      { type: Boolean, default: false },
  allowInvites:      { type: Boolean, default: true },
  status:            { type: String, enum: ['pending', 'active', 'suspended'], default: 'pending' },
  emailVerified:     { type: Boolean, default: false },
  lastLoginAt:       { type: Date, default: null },
  firstOpenedAt:     { type: Date, default: null },
  firstEventOpenedAt:{ type: Date, default: null },
}, { timestamps: true }));

// ── Env ───────────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '30d';
const MONGO_URI = process.env.MONGODB_URI!;
const DEFAULT_PASSWORD = 'Faculty@1234'; // change after first use

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFacultyEnrollment(deptCode: string) {
  return `FAC-${deptCode.toUpperCase().slice(0, 3)}-001`;
}

function makeFacultyEmail(deptCode: string) {
  return `faculty.${deptCode.toLowerCase().slice(0, 3)}@campus.local`;
}

function signToken(userId: string, role: string, deptId: string, name: string, status: string) {
  return jwt.sign(
    { id: userId, role, department: deptId, name, status },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!JWT_SECRET) { console.error('❌  JWT_SECRET not set in .env'); process.exit(1); }
  if (!MONGO_URI) { console.error('❌  MONGODB_URI not set in .env'); process.exit(1); }

  console.log('🔌  Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected.\n');

  // Fetch all existing departments
  let depts = await Dept.find({}).lean();

  // If no depts exist at all (fresh DB), create a default CS dept
  if (depts.length === 0) {
    console.log('ℹ️   No departments found — creating default CS department…');
    const cs = await Dept.create({ code: 'CS', name: 'Computer Science & Engineering', studentStrength: 0 });
    depts = [cs];
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  const results: Array<{ dept: string; enrollmentNo: string; email: string; token: string }> = [];

  console.log(`📋  Processing ${depts.length} department(s)…\n`);

  for (const dept of depts) {
    const enrollmentNo = makeFacultyEnrollment(dept.code);
    const email = makeFacultyEmail(dept.code);
    const name = `Faculty (${dept.code})`;
    const collegeId = `FAC-${dept.code.slice(0, 3).toUpperCase()}-001`;

    let userLean: UserLean | null = await User.findOne({ enrollmentNo }).lean();

    if (!userLean) {
      console.log(`  👤  Creating faculty for dept: ${dept.code} (${enrollmentNo})…`);
      // .create() returns a Mongoose Document — convert to lean plain object immediately
      const created = await User.create({
        enrollmentNo,
        collegeId,
        name,
        email,
        passwordHash,
        role: 'faculty',
        department: dept._id,
        status: 'active',
        emailVerified: true,
      });
      userLean = created.toObject() as UserLean;
      console.log(`  ✅  Created: ${email}`);
    } else {
      console.log(`  ℹ️   Already exists: ${email} — skipping creation`);
    }

    const token = signToken(
      userLean._id.toString(),
      'faculty',
      dept._id.toString(),
      userLean.name,
      'active',
    );

    results.push({ dept: dept.code, enrollmentNo, email, token });
  }

  // ── Save tokens to file ───────────────────────────────────────────────────

  const tokensDir = path.join(process.cwd(), 'scripts');
  const tokensFile = path.join(tokensDir, 'faculty-tokens.txt');

  const fileLines = results.map(r =>
    `DEPT=${r.dept}  |  ${r.enrollmentNo}  |  ${r.email}\n${r.token}`,
  ).join('\n\n' + '─'.repeat(60) + '\n\n');

  fs.writeFileSync(tokensFile, fileLines, 'utf8');
  console.log(`\n💾  All tokens saved (one per line) → scripts/faculty-tokens.txt`);

  // ── Print summary ─────────────────────────────────────────────────────────

  console.log('\n' + '═'.repeat(60));
  console.log('🎟️   FACULTY JWT TOKENS  (valid for', JWT_EXPIRES_IN, ')');
  console.log('═'.repeat(60));

  for (const r of results) {
    console.log(`\n📐  Dept: ${r.dept}  |  ${r.email}  |  pwd: ${DEFAULT_PASSWORD}`);
    console.log('─'.repeat(60));
    console.log(r.token);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n📋  How to use in Postman:');
  console.log('    Authorization tab → Bearer Token → paste the token for the dept you want\n');
  console.log('📋  How to use with curl (example — create a draft event):');
  console.log('    curl -X POST http://localhost:5000/api/v1/events \\');
  console.log('      -H "Authorization: Bearer <TOKEN>" \\');
  console.log('      -H "Content-Type: application/json" \\');
  console.log('      -d \'{"title":"Test Hackathon","type":"hackathon","deadline":"2026-11-30T23:59:00Z"}\'\n');
  console.log('💡  Tip: open scripts/faculty-tokens.txt — each token is on a single line (no wrapping).\n');

  await mongoose.disconnect();
  console.log('👋  Done.');
}

main().catch((err) => {
  console.error('💥  Script failed:', err);
  process.exit(1);
});
