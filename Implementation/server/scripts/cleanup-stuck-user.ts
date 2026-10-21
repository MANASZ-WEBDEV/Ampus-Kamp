/**
 * cleanup-stuck-user.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Removes a "stuck" registration — a user created during registration whose
 * OTP email failed, leaving them in status:pending with claimedBy set on the
 * roster (so the student can't re-register).
 *
 * Usage:
 *   npx tsx scripts/cleanup-stuck-user.ts <enrollmentNo>
 *
 * Example:
 *   npx tsx scripts/cleanup-stuck-user.ts 0827CS231144
 * ─────────────────────────────────────────────────────────────────────────────
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Schema, model } from 'mongoose';

// ── Minimal inline models ─────────────────────────────────────────────────────

const User = model('User', new Schema({
  enrollmentNo: String,
  status: String,
  email: String,
  name: String,
}, { timestamps: true }));

const StudentRoster = model('StudentRoster', new Schema({
  enrollmentNo: String,
  claimedBy: { type: Schema.Types.ObjectId, default: null },
}, { timestamps: true }));

const Otp = model('Otp', new Schema({
  userId: Schema.Types.ObjectId,
}, { timestamps: true }));

// ── Main ──────────────────────────────────────────────────────────────────────

const enrollmentNo = process.argv[2]?.toUpperCase();
if (!enrollmentNo) {
  console.error('❌  Usage: npx tsx scripts/cleanup-stuck-user.ts <enrollmentNo>');
  process.exit(1);
}

async function main() {
  console.log(`\n🔌  Connecting to MongoDB…`);
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log(`✅  Connected.\n`);

  // Find the stuck user
  const user = await User.findOne({ enrollmentNo }).lean();
  if (!user) {
    console.log(`ℹ️   No user found with enrollmentNo: ${enrollmentNo}`);
    await mongoose.disconnect();
    return;
  }

  console.log(`👤  Found user: ${user.name} (${user.email}) — status: ${user.status}`);

  if ((user.status as string) === 'active') {
    console.log(`⚠️   This user is already ACTIVE. Aborting — this is a real account!`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // 1. Delete OTP records
  const otpResult = await Otp.deleteMany({ userId: user._id });
  console.log(`🗑️   Deleted ${otpResult.deletedCount} OTP record(s)`);

  // 2. Release roster claim
  const rosterResult = await StudentRoster.updateOne(
    { enrollmentNo },
    { $set: { claimedBy: null } },
  );
  console.log(`🔓  Roster claim released (modified: ${rosterResult.modifiedCount})`);

  // 3. Delete the pending user
  await User.deleteOne({ _id: user._id });
  console.log(`🗑️   Pending user deleted\n`);

  console.log(`✅  Done! ${enrollmentNo} can now register fresh.\n`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('💥  Script failed:', err);
  process.exit(1);
});
