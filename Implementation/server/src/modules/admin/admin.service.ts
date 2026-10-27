import mongoose from 'mongoose';
import { User }       from '@/models/user.model';
import { Credential } from '@/models/credential.model';
import { Course }     from '@/models/course.model';
import { Report }     from '@/models/report.model';
import { AuditLog }   from '@/models/auditLog.model';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '@/shared/errors';
import type { ListUsersQuery, MapCourseBody, ReviewReportBody, AuditQuery } from './admin.schema';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Projection applied to all user list responses — never expose secrets. */
const USER_PROJECTION = '-passwordHash -phone' as const;

// ── listUsers ─────────────────────────────────────────────────────────────────

export async function listUsers(query: ListUsersQuery) {
  const { status, role, q, cursor, limit } = query;

  const filter: mongoose.FilterQuery<typeof User> = {};

  if (status) filter['status'] = status;
  if (role)   filter['role']   = role;
  if (q) {
    const regex = new RegExp(q, 'i');
    filter['$or'] = [
      { name:         regex },
      { email:        regex },
      { enrollmentNo: regex },
    ];
  }
  // Cursor: ObjectId-based keyset pagination (stable, no skip)
  if (cursor && mongoose.isValidObjectId(cursor)) {
    filter['_id'] = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const users = await User.find(filter)
    .select(USER_PROJECTION)
    .populate('department', 'name code')
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore    = users.length > limit;
  const page       = users.slice(0, limit);
  const nextCursor = hasMore ? String(page[page.length - 1]!._id) : undefined;

  return { users: page, nextCursor };
}

// ── approveUser ───────────────────────────────────────────────────────────────

export async function approveUser(adminId: string, targetId: string) {
  if (targetId === adminId) {
    throw new ForbiddenError('You cannot approve yourself.');
  }

  const user = await User.findById(targetId).select(USER_PROJECTION).lean();
  if (!user) throw new NotFoundError('User');
  if (user.status !== 'pending') {
    throw new ConflictError(`User is already ${user.status} — cannot approve.`);
  }

  await User.findByIdAndUpdate(targetId, { $set: { status: 'active' } });

  await AuditLog.create({
    userId: new mongoose.Types.ObjectId(adminId),
    action: 'user_approve',
    meta:   { targetId, targetName: user.name },
  });
}

// ── suspendUser ───────────────────────────────────────────────────────────────

export async function suspendUser(adminId: string, targetId: string) {
  if (targetId === adminId) {
    throw new ForbiddenError('You cannot suspend yourself.');
  }

  const user = await User.findById(targetId).select(USER_PROJECTION + ' role').lean();
  if (!user) throw new NotFoundError('User');

  // Protect admins from each other — prevents privilege escalation via social engineering
  if (user.role === 'admin') {
    throw new ForbiddenError('Admin accounts cannot be suspended via this endpoint.');
  }
  if (user.status === 'suspended') {
    throw new ConflictError('User is already suspended.');
  }

  await User.findByIdAndUpdate(targetId, { $set: { status: 'suspended' } });

  await AuditLog.create({
    userId: new mongoose.Types.ObjectId(adminId),
    action: 'user_suspend',
    meta:   { targetId, targetName: user.name, targetRole: user.role },
  });
}

// ── getCourseAliasQueue ───────────────────────────────────────────────────────

export async function getCourseAliasQueue(
  cursor?: string,
  limit = 20,
) {
  const filter: mongoose.FilterQuery<typeof Credential> = {
    otherCourseName: { $exists: true, $ne: '' },
    courseId:        { $exists: false },
  };

  if (cursor && mongoose.isValidObjectId(cursor)) {
    filter['_id'] = { $gt: new mongoose.Types.ObjectId(cursor) }; // FIFO — oldest first
  }

  const items = await Credential.find(filter)
    .sort({ createdAt: 1 })  // oldest unresolved first (FIFO admin queue)
    .limit(limit + 1)
    .populate('studentId', 'name enrollmentNo')
    .lean();

  const hasMore    = items.length > limit;
  const page       = items.slice(0, limit);
  const nextCursor = hasMore ? String(page[page.length - 1]!._id) : undefined;

  return { items: page, nextCursor };
}

// ── mapCourseAlias ─────────────────────────────────────────────────────────────

export async function mapCourseAlias(
  adminId: string,
  credId:  string,
  body:    MapCourseBody,
) {
  const cred = await Credential.findById(credId);
  if (!cred) throw new NotFoundError('Credential');

  // Guard: must still be an unmapped "Other" credential
  if (!cred.otherCourseName) {
    throw new ValidationError('Credential does not have an otherCourseName to map.');
  }
  if (cred.courseId) {
    throw new ConflictError('Credential has already been mapped to a course.');
  }

  let courseId: mongoose.Types.ObjectId;

  if (body.existingCourseId) {
    const course = await Course.findById(body.existingCourseId).lean();
    if (!course) throw new NotFoundError('Course');
    courseId = course._id;
  } else {
    // Create a new course from the alias — avoids requiring a separate UI step
    const newCourse = await Course.create({
      name:               body.newCourseName!,
      code:               body.newCourseCode,
      category:           body.newCourseCategory!,
      issuer:             body.issuer ?? cred.issuer,
      verificationMethod: 'faculty',
      active:             true,
    });
    courseId = newCourse._id;
  }

  // Map the credential: set courseId, clear otherCourseName
  cred.courseId        = courseId;
  cred.otherCourseName = undefined;
  await cred.save();

  await AuditLog.create({
    userId: new mongoose.Types.ObjectId(adminId),
    action: 'course_alias_mapped',
    meta:   {
      credId,
      courseId:   courseId.toString(),
      originalName: cred.otherCourseName ?? body.newCourseName,
    },
  });

  return { credId, courseId: courseId.toString() };
}

// ── listReports ───────────────────────────────────────────────────────────────

export async function listReports(
  status?: string,
  cursor?: string,
  limit = 20,
) {
  const filter: mongoose.FilterQuery<typeof Report> = {};

  if (status) filter['status'] = status;
  if (cursor && mongoose.isValidObjectId(cursor)) {
    filter['_id'] = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const items = await Report.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .populate('reporterId',   'name enrollmentNo')
    .populate('targetUserId', 'name enrollmentNo')
    .lean();

  const hasMore    = items.length > limit;
  const page       = items.slice(0, limit);
  const nextCursor = hasMore ? String(page[page.length - 1]!._id) : undefined;

  return { items: page, nextCursor };
}

// ── reviewReport ──────────────────────────────────────────────────────────────

export async function reviewReport(
  adminId:  string,
  reportId: string,
  body:     ReviewReportBody,
) {
  const report = await Report.findById(reportId);
  if (!report) throw new NotFoundError('Report');

  if (report.status !== 'pending') {
    throw new ConflictError(
      `Report is already ${report.status} — cannot re-review.`,
    );
  }

  report.status      = body.action as 'reviewed' | 'dismissed';
  report.reviewedBy  = new mongoose.Types.ObjectId(adminId);
  report.reviewNotes = body.notes;
  await report.save();

  // If admin opts to also suspend the target user, do it in the same call.
  // suspendUser writes its own AuditLog entry — two audit entries, two facts.
  if (body.userAction === 'suspend') {
    if (!report.targetUserId) {
      throw new ValidationError(
        'Cannot suspend: this report has no targetUserId.',
      );
    }
    await suspendUser(adminId, report.targetUserId.toString());
  }

  await AuditLog.create({
    userId: new mongoose.Types.ObjectId(adminId),
    action: 'report_review',
    meta:   {
      reportId,
      action:     body.action,
      userAction: body.userAction ?? null,
    },
  });

  return { reportId, status: report.status };
}

// ── listAuditLog ──────────────────────────────────────────────────────────────

export async function listAuditLog(query: AuditQuery) {
  const { action, userId, cursor, limit } = query;

  const filter: mongoose.FilterQuery<typeof AuditLog> = {};

  if (action) filter['action'] = action;

  if (userId && mongoose.isValidObjectId(userId)) {
    filter['userId'] = new mongoose.Types.ObjectId(userId);
  }

  if (cursor && mongoose.isValidObjectId(cursor)) {
    filter['_id'] = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const entries = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .populate('userId', 'name role')
    .lean();

  const hasMore    = entries.length > limit;
  const page       = entries.slice(0, limit);
  const nextCursor = hasMore ? String(page[page.length - 1]!._id) : undefined;

  return { entries: page, nextCursor };
}
