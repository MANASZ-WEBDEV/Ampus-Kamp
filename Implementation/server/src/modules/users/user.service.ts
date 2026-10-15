import mongoose from 'mongoose';
import { User } from '@/models/user.model';
import { NotFoundError } from '@/shared/errors';
import type { AuthUser } from '@/shared/types';
import type { UpdateMeBody } from './user.schema';

// ── GET /api/v1/users/me ──────────────────────────────────────────────────────

export async function getMe(actor: AuthUser) {
  const user = await User.findById(actor.id)
    .populate('department', 'code name')
    .select('+phone') // own profile: include phone
    .lean();

  if (!user) throw new NotFoundError('User not found.');

  return {
    id: user._id.toString(),
    enrollmentNo: user.enrollmentNo,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    year: user.year,
    skills: user.skills,
    phone: user.phone ?? null,
    phoneVisible: user.phoneVisible,
    allowInvites: user.allowInvites,
    status: user.status,
    emailVerified: user.emailVerified,
    lastLoginAt: user.lastLoginAt,
    firstOpenedAt: user.firstOpenedAt,
  };
}

// ── PUT /api/v1/users/me ──────────────────────────────────────────────────────

export async function updateMe(actor: AuthUser, body: UpdateMeBody) {
  const update: Partial<{
    skills: string[];
    phone: string | null;
    phoneVisible: boolean;
    allowInvites: boolean;
  }> = {};

  if (body.skills !== undefined) update.skills = body.skills;
  if (body.phone !== undefined) update.phone = body.phone;
  if (body.phoneVisible !== undefined) update.phoneVisible = body.phoneVisible;
  if (body.allowInvites !== undefined) update.allowInvites = body.allowInvites;

  const user = await User.findByIdAndUpdate(
    actor.id,
    { $set: update },
    { new: true, runValidators: true },
  )
    .populate('department', 'code name')
    .select('+phone')
    .lean();

  if (!user) throw new NotFoundError('User not found.');

  return {
    id: user._id.toString(),
    name: user.name,
    skills: user.skills,
    phone: user.phone ?? null,
    phoneVisible: user.phoneVisible,
    allowInvites: user.allowInvites,
  };
}

// ── GET /api/v1/users/:id ─────────────────────────────────────────────────────

export async function getUserById(_actor: AuthUser, targetId: string) {
  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    throw new NotFoundError('User not found.');
  }

  const user = await User.findById(targetId)
    .populate('department', 'code name')
    // phone is select:false — never included here (public profile)
    .lean();

  if (!user || user.status !== 'active') {
    throw new NotFoundError('User not found.');
  }

  // Spec: GET /users/:id — never returns phone or email
  return {
    id: user._id.toString(),
    name: user.name,
    branch: user.department,      // alias "branch" as per API spec
    year: user.year,
    skills: user.skills,
    allowInvites: user.allowInvites,
    role: user.role,
  };
}
