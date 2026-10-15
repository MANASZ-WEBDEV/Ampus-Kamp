import mongoose from 'mongoose';
import { StudentRoster } from '@/models/roster.model';
import { User } from '@/models/user.model';
import { Otp } from '@/models/otp.model';
import {
  hashPassword,
  comparePassword,
  signToken,
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
  OTP_TTL_MS,
  OTP_MAX_ATTEMPTS,
} from '@/shared/utils';
import { sendOtpEmail } from '@/services/email.service';
import {
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
} from '@/shared/errors';
import type { AuthUser } from '@/shared/types';
import type { RegisterBody, LoginBody, VerifyOtpBody, ResendOtpBody } from './auth.schema';

// ── Register ─────────────────────────────────────────────────────────────────

export async function register(body: RegisterBody) {
  const { enrollmentNo, collegeId, password } = body;

  // 1. Verify against roster (both fields must match)
  const rosterEntry = await StudentRoster.findOne({ enrollmentNo, collegeId })
    .populate('department', 'code name')
    .lean();

  if (!rosterEntry) {
    throw new NotFoundError(
      'Enrollment number or college ID not found in the student roster. ' +
      'Contact your department office if you believe this is an error.',
    );
  }

  // 2. Check not already claimed
  if (rosterEntry.claimedBy) {
    throw new ConflictError(
      'This enrollment number has already been registered. ' +
      'Use the login page or contact IT if you did not create this account.',
    );
  }

  // 3. Check roster has an email (required for OTP delivery)
  if (!rosterEntry.email) {
    throw new ValidationError(
      'No email address is associated with this enrollment number in the roster. ' +
      'Ask your department admin to add your college email.',
    );
  }

  // 4. Check email not already taken (safety net for data anomalies)
  const emailTaken = await User.exists({ email: rosterEntry.email });
  if (emailTaken) {
    throw new ConflictError(
      'This email is already associated with another account.',
    );
  }

  // 5. Create user (status: pending, role: student)
  //    name, department, year copied from roster — never from body
  const passwordHash = await hashPassword(password);
  const user = await User.create({
    enrollmentNo: rosterEntry.enrollmentNo,
    collegeId: rosterEntry.collegeId,
    name: rosterEntry.name,
    email: rosterEntry.email,
    passwordHash,
    role: 'student',
    department: rosterEntry.department,
    year: rosterEntry.year,
    status: 'pending',
    emailVerified: false,
  });

  // 6. Mark roster as claimed (atomic — use findOneAndUpdate)
  await StudentRoster.findByIdAndUpdate(rosterEntry._id, {
    claimedBy: user._id,
  });

  // 7. Generate OTP and send email
  const code = generateOtpCode();
  await Otp.deleteMany({ userId: user._id, purpose: 'email_verification' }); // clean stale
  await Otp.create({
    userId: user._id,
    purpose: 'email_verification',
    codeHash: hashOtpCode(code),
    attempts: 0,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  await sendOtpEmail({ to: rosterEntry.email, name: user.name, code, purpose: 'email_verification' });

  return { userId: user._id.toString(), message: `OTP sent to ${rosterEntry.email}` };
}

// ── Verify OTP ───────────────────────────────────────────────────────────────

export async function verifyOtp(body: VerifyOtpBody) {
  const { userId, code } = body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ValidationError('Invalid userId.');
  }

  // Fetch OTP record (+codeHash is select:false)
  const otp = await Otp.findOne({
    userId,
    purpose: 'email_verification',
  })
    .select('+codeHash')
    .lean();

  if (!otp) {
    throw new UnauthorizedError(
      'No active OTP found. It may have expired — request a new one.',
    );
  }

  // Max attempts exceeded
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await Otp.deleteOne({ _id: otp._id });
    throw new UnauthorizedError(
      'Too many failed attempts. Request a new OTP.',
    );
  }

  // Wrong code — increment attempts
  if (!verifyOtpCode(code, otp.codeHash)) {
    const remaining = OTP_MAX_ATTEMPTS - (otp.attempts + 1);
    await Otp.updateOne({ _id: otp._id }, { $inc: { attempts: 1 } });
    throw new UnauthorizedError(
      `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    );
  }

  // Correct — activate user, delete OTP
  const user = await User.findByIdAndUpdate(
    userId,
    { status: 'active', emailVerified: true },
    { new: true },
  ).populate('department', 'code name');

  if (!user) throw new NotFoundError('User not found.');

  await Otp.deleteOne({ _id: otp._id });

  // Issue JWT
  const payload: AuthUser = {
    id: user._id.toString(),
    role: user.role,
    department: user._id.toString(), // corrected below
    name: user.name,
    status: user.status,
  };
  // Override with actual dept id
  (payload as AuthUser).department = (user.department as unknown as { _id: { toString(): string } })._id?.toString()
    ?? user.department.toString();

  const token = signToken(payload);
  return { token, user: toPublicUser(user) };
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function login(body: LoginBody) {
  const { enrollmentNo, password } = body;

  // Must select passwordHash explicitly (select:false)
  const user = await User.findOne({ enrollmentNo })
    .select('+passwordHash')
    .populate('department', 'code name');

  if (!user) {
    // Generic message — do NOT reveal whether the account exists
    throw new UnauthorizedError('Incorrect enrollment number or password.');
  }

  // Status check before password comparison (prevents timing leak)
  if (user.status === 'pending') {
    throw new ForbiddenError(
      'Account not yet verified. Check your email for the OTP.',
    );
  }
  if (user.status === 'suspended') {
    throw new ForbiddenError('Account suspended. Contact campus IT support.');
  }

  // Password check
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Incorrect enrollment number or password.');
  }

  // Update login timestamps
  const now = new Date();
  const update: Record<string, Date> = { lastLoginAt: now };
  if (!user.firstOpenedAt) update.firstOpenedAt = now;
  await User.updateOne({ _id: user._id }, { $set: update });

  const token = signToken({
    id: user._id.toString(),
    role: user.role,
    department: (user.department as unknown as { _id: { toString(): string } })?._id?.toString()
      ?? user.department.toString(),
    name: user.name,
    status: user.status,
  });

  return { token, user: toPublicUser(user) };
}

// ── Resend OTP ────────────────────────────────────────────────────────────────

export async function resendOtp(body: ResendOtpBody) {
  const { userId } = body;

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found.');
  if (user.status !== 'pending') {
    throw new ConflictError('Account is already verified.');
  }

  const code = generateOtpCode();
  await Otp.deleteMany({ userId: user._id, purpose: 'email_verification' });
  await Otp.create({
    userId: user._id,
    purpose: 'email_verification',
    codeHash: hashOtpCode(code),
    attempts: 0,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  await sendOtpEmail({ to: user.email, name: user.name, code, purpose: 'email_verification' });

  return { message: `OTP resent to ${user.email}` };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip all sensitive fields for API responses. */
function toPublicUser(user: InstanceType<typeof User>) {
  return {
    id: user._id.toString(),
    enrollmentNo: user.enrollmentNo,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    year: user.year,
    skills: user.skills,
    status: user.status,
    phoneVisible: user.phoneVisible,
    allowInvites: user.allowInvites,
    emailVerified: user.emailVerified,
  };
}
