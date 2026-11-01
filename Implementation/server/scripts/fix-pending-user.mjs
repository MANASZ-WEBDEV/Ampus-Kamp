/**
 * scripts/fix-pending-user.mjs
 *
 * Fixes a student stuck in "pending" status (account created but OTP never
 * verified). Supports two modes:
 *
 *   Resend OTP (default):
 *     node scripts/fix-pending-user.mjs <email>
 *
 *   Force-activate (bypass OTP — use only when email delivery is broken):
 *     node scripts/fix-pending-user.mjs <email> --force-activate
 */

import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve('.env') });
dotenv.config({ path: path.resolve('..', '..', 'server', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('❌  MONGODB_URI not set.'); process.exit(1); }

const TARGET_EMAIL    = (process.argv[2] ?? '').toLowerCase();
const FORCE_ACTIVATE  = process.argv.includes('--force-activate');

if (!TARGET_EMAIL) {
  console.error('Usage: node scripts/fix-pending-user.mjs <email> [--force-activate]');
  process.exit(1);
}

// ── Minimal inline schemas ────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  enrollmentNo:  String,
  collegeId:     String,
  name:          String,
  email:         String,
  passwordHash:  { type: String, select: false },
  role:          String,
  department:    mongoose.Schema.Types.ObjectId,
  year:          Number,
  status:        String,   // 'pending' | 'active' | 'suspended'
  emailVerified: Boolean,
}, { timestamps: true });

const otpSchema = new mongoose.Schema({
  userId:    mongoose.Schema.Types.ObjectId,
  purpose:   String,
  codeHash:  String,
  attempts:  Number,
  expiresAt: Date,
}, { timestamps: true });

const rosterSchema = new mongoose.Schema({
  enrollmentNo: String,
  claimedBy:    { type: mongoose.Schema.Types.ObjectId, default: null },
}, { timestamps: true });

const User          = mongoose.models.User          ?? mongoose.model('User',          userSchema);
const Otp           = mongoose.models.Otp           ?? mongoose.model('Otp',           otpSchema);
const StudentRoster = mongoose.models.StudentRoster ?? mongoose.model('StudentRoster', rosterSchema);

// ── Connect ───────────────────────────────────────────────────────────────────
console.log('🔌  Connecting to MongoDB…');
await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15_000 });
console.log(`✅  Connected to: ${mongoose.connection.host}/${mongoose.connection.name}\n`);

// ── Find user ─────────────────────────────────────────────────────────────────
const user = await User.findOne({ email: TARGET_EMAIL });

if (!user) {
  console.log(`❌  No user found with email: ${TARGET_EMAIL}`);
  console.log('   They may not have started registration yet.\n');
  await mongoose.disconnect();
  process.exit(0);
}

console.log(`👤  Found user:`);
console.log(`   Name         : ${user.name}`);
console.log(`   Enrollment   : ${user.enrollmentNo}`);
console.log(`   Email        : ${user.email}`);
console.log(`   Status       : ${user.status}`);
console.log(`   EmailVerified: ${user.emailVerified}`);
console.log(`   Created      : ${user.createdAt}\n`);

if (user.status === 'active' && user.emailVerified) {
  console.log('✅  Account is already active and verified. Nothing to do.\n');
  await mongoose.disconnect();
  process.exit(0);
}

// ── Force activate ────────────────────────────────────────────────────────────
if (FORCE_ACTIVATE) {
  console.log('⚡  Force-activating account (bypassing OTP)…');
  await User.updateOne(
    { _id: user._id },
    { $set: { status: 'active', emailVerified: true } },
  );
  // Clean up any stale OTPs
  const deleted = await Otp.deleteMany({ userId: user._id });
  console.log(`✅  Account activated!`);
  if (deleted.deletedCount) console.log(`   Cleaned up ${deleted.deletedCount} stale OTP(s).`);

  console.log(`\n   ${user.name} can now sign in with:`);
  console.log(`     Enrollment No : ${user.enrollmentNo}`);
  console.log(`     Password      : (whatever they set during activation)\n`);

} else {
  // ── Resend OTP ──────────────────────────────────────────────────────────────
  console.log('📧  Resending OTP email…');

  // Dynamically import email service (it's TS compiled — use the built version
  // or fall back to the raw SMTP approach via nodemailer if available).
  // We'll do a direct approach using the server's email service.
  try {
    // Try to load compiled service
    const { sendOtpEmail }   = await import('../src/services/email.service.js').catch(() => ({}));
    const { generateOtpCode, hashOtpCode, OTP_TTL_MS } = await import('../src/shared/utils.js').catch(() => ({}));

    if (!sendOtpEmail || !generateOtpCode) {
      throw new Error('Could not load compiled email service — use --force-activate instead.');
    }

    const code = generateOtpCode();
    await Otp.deleteMany({ userId: user._id, purpose: 'email_verification' });
    await Otp.create({
      userId:    user._id,
      purpose:   'email_verification',
      codeHash:  hashOtpCode(code),
      attempts:  0,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });
    await sendOtpEmail({ to: user.email, name: user.name, code, purpose: 'email_verification' });
    console.log(`✅  OTP sent to ${user.email}`);
    console.log('   Ask the student to check their inbox (and spam folder).\n');
  } catch (err) {
    console.error(`❌  Could not resend OTP: ${err.message}`);
    console.log('\n   ➡️   Run with --force-activate to bypass OTP:\n');
    console.log(`       node scripts/fix-pending-user.mjs ${TARGET_EMAIL} --force-activate\n`);
  }
}

await mongoose.disconnect();
console.log('🔌  Disconnected. Done.');
