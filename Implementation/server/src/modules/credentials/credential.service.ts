import mongoose from 'mongoose';
import fs from 'fs';
import { invalidateCachePrefix }    from '@/shared/cache';
import { Credential }               from '@/models/credential.model';
import { AuditLog }                 from '@/models/auditLog.model';
import { getSetting }               from '@/models/setting.model';
import { sha256 }                   from '@/shared/utils/hash';
import { runQrPipeline }            from './qr-verify.service';
import { sendNotification }         from '@/modules/notifications/notification.service';
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
} from '@/shared/errors';
import type { AuthUser }          from '@/shared/types';
import type {
  CreateCredentialBody,
  EditCredentialBody,
  VerifyCredentialBody,
} from './credential.schema';

// ── createCredential ──────────────────────────────────────────────────────────

/**
 * createCredential — upload + QR pipeline.
 *
 * Quota checks (from Setting):
 *   - Max 5 uploads per 24 hours per student
 *   - Max 15 pending credentials per student
 *
 * Duplicate detection:
 *   - proofHash UNIQUE (absolute — cross-student)
 *   - (issuer, certificateId) PARTIAL UNIQUE on pending+verified
 *
 * department and studentId are ALWAYS taken from req.user — never body.
 */
export async function createCredential(
  user: AuthUser,
  body: CreateCredentialBody,
  file: Express.Multer.File,
) {
  // 1. Compute SHA-256 of the uploaded file (server-computed, never from client)
  const fileBuffer = fs.readFileSync(file.path);
  const proofHash  = sha256(fileBuffer);
  const proofUrl   = `/uploads/${file.filename}`;

  // 2. Quota check: max uploads per 24h
  const uploadsPerDay  = await getSetting<number>('credentialUploadPerDay', 5);
  const cutoff24h      = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentCount    = await Credential.countDocuments({
    studentId:  new mongoose.Types.ObjectId(user.id),
    createdAt:  { $gte: cutoff24h },
  });
  if (recentCount >= uploadsPerDay) {
    throw new RateLimitError(
      `Upload limit reached: max ${uploadsPerDay} credentials per 24 hours.`,
    );
  }

  // 3. Quota check: max pending
  const maxPending   = await getSetting<number>('credentialMaxPending', 15);
  const pendingCount = await Credential.countDocuments({
    studentId:              new mongoose.Types.ObjectId(user.id),
    'verification.status':  'pending',
  });
  if (pendingCount >= maxPending) {
    throw new RateLimitError(
      `Too many pending credentials (max ${maxPending}). Wait for existing ones to be reviewed.`,
    );
  }

  // 4. Determine verification method
  // "Other" course → admin queue
  const isOther = !body.courseId && !!body.otherCourseName;
  let verifMethod: 'issuer_qr' | 'faculty' | 'admin' = isOther ? 'admin' : 'faculty';

  // 5. QR pipeline for NPTEL (and any issuer with verificationMethod='issuer_qr')
  let qrField: { url: string; host: string } | undefined;
  let evidence: string | undefined;
  let verifStatus: 'pending' | 'verified' | 'rejected' = 'pending';
  let rejectionReason: string | undefined;

  const qrEnabled = await getSetting<boolean>('qrPipelineEnabled', true);

  if (qrEnabled && !isOther && body.issuer === 'NPTEL') {
    const filePath = file.path;
    const result   = await runQrPipeline(filePath, {
      studentName: user.name,
      courseName:  body.issuer,   // will be replaced by course name in a real impl
      session:     body.session,
    });

    if (result.verdict === 'verified') {
      verifMethod  = 'issuer_qr';
      verifStatus  = 'verified';
      evidence     = result.evidence;
      qrField      = { url: result.qrUrl, host: result.qrHost };
    } else if (result.verdict === 'rejected') {
      verifStatus     = 'rejected';
      rejectionReason = result.reason;
    }
    // 'pending' → fall through to faculty queue
  }

  // 6. Build department ObjectId from req.user (NEVER from body)
  if (!user.department) {
    throw new AppError('User has no department assigned.', 400, 'NO_DEPARTMENT');
  }
  const departmentId = new mongoose.Types.ObjectId(user.department);

  // 7. Insert Credential
  try {
    const doc = await Credential.create({
      studentId:       new mongoose.Types.ObjectId(user.id),
      department:      departmentId,
      courseId:        body.courseId ? new mongoose.Types.ObjectId(body.courseId) : undefined,
      otherCourseName: body.otherCourseName,
      issuer:          body.issuer,
      session:         body.session,
      year:            body.year,
      tier:            body.tier,
      certificateId:   body.certificateId,
      proofUrl,
      proofHash,
      qr:              qrField,
      verification: {
        status:     verifStatus,
        method:     verifMethod,
        evidence,
        reason:     rejectionReason,
      },
    });
    return doc.toObject();
  } catch (err: unknown) {
    const mongoErr = err as { code?: number; keyPattern?: Record<string, unknown> };
    if (mongoErr.code === 11000) {
      if (mongoErr.keyPattern?.['proofHash']) {
        // Find the existing record to include its ID in the error
        const existing = await Credential.findOne({ proofHash }).lean();
        throw new ConflictError(
          `This file has already been submitted (credential id: ${existing?._id?.toString() ?? 'unknown'}).`,
        );
      }
      if (mongoErr.keyPattern?.['issuer'] || mongoErr.keyPattern?.['certificateId']) {
        const existing = await Credential
          .findOne({ issuer: body.issuer, certificateId: body.certificateId })
          .lean();
        throw new ConflictError(
          `Certificate ID '${body.certificateId}' already exists (credential id: ${existing?._id?.toString() ?? 'unknown'}).`,
        );
      }
      throw new ConflictError('Duplicate credential detected.');
    }
    throw err;
  }
}

// ── getMyCredentials ──────────────────────────────────────────────────────────

export async function getMyCredentials(user: AuthUser) {
  return Credential
    .find({ studentId: new mongoose.Types.ObjectId(user.id) })
    .sort({ createdAt: -1 })
    .lean();
}

// ── getPendingQueue ───────────────────────────────────────────────────────────

/**
 * getPendingQueue — faculty sees only their own department's queue,
 * oldest-first (to encourage FIFO review).
 */
export async function getPendingQueue(user: AuthUser) {
  if (!user.department) {
    throw new ForbiddenError('You are not assigned to a department.');
  }

  return Credential
    .find({
      department:             new mongoose.Types.ObjectId(user.department),
      'verification.status':  'pending',
    })
    .sort({ createdAt: 1 })   // oldest first
    .populate('studentId', 'name enrollmentNo')
    .populate('courseId', 'name issuer')
    .lean();
}

// ── editCredential ────────────────────────────────────────────────────────────

/**
 * editCredential — students can edit a PENDING credential.
 * If the credential is 'verified', editing resets it to 'pending'.
 */
export async function editCredential(
  user: AuthUser,
  credentialId: string,
  body: EditCredentialBody,
) {
  const cred = await Credential.findById(credentialId);
  if (!cred) throw new NotFoundError('Credential');

  // Only owner can edit
  if (!cred.studentId.equals(user.id)) {
    throw new ForbiddenError('You can only edit your own credentials.');
  }

  // Cannot edit a rejected credential (re-upload instead)
  if (cred.verification.status === 'rejected') {
    throw new AppError(
      'Rejected credentials cannot be edited. Please upload a new one.',
      409,
      'CREDENTIAL_REJECTED',
    );
  }

  // If editing a verified credential → reset to pending
  if (cred.verification.status === 'verified') {
    cred.verification = {
      status:  'pending',
      method:  'faculty',
    };
  }

  // Apply edits
  if (body.session)       cred.session       = body.session;
  if (body.year)          cred.year          = body.year;
  if (body.tier)          cred.tier          = body.tier;
  if (body.certificateId) cred.certificateId = body.certificateId;

  await cred.save();
  return cred.toObject();
}

// ── verifyCredential ──────────────────────────────────────────────────────────

/**
 * verifyCredential — faculty approves or rejects a credential.
 *
 * Enforcements:
 *   - Faculty can only action their own department's credentials
 *   - Self-verify is blocked (403)
 *   - Every action writes an AuditLog entry
 */
export async function verifyCredential(
  user: AuthUser,
  credentialId: string,
  body: VerifyCredentialBody,
) {
  const cred = await Credential.findById(credentialId);
  if (!cred) throw new NotFoundError('Credential');

  // Self-verify guard
  if (cred.studentId.equals(user.id)) {
    throw new ForbiddenError('You cannot verify your own credential.');
  }

  // Department guard: faculty can only see their own dept
  if (!user.department) {
    throw new ForbiddenError('You are not assigned to a department.');
  }
  if (!cred.department.equals(user.department)) {
    throw new ForbiddenError('This credential belongs to a different department.');
  }

  // Only pending credentials can be verified
  if (cred.verification.status !== 'pending') {
    throw new AppError(
      `Credential is already ${cred.verification.status}.`,
      409,
      'ALREADY_ACTIONED',
    );
  }

  // Apply verdict
  cred.verification.status     = body.verdict;
  cred.verification.verifiedBy = new mongoose.Types.ObjectId(user.id);
  cred.verification.verifiedAt = new Date();
  if (body.reason) cred.verification.reason = body.reason;

  await cred.save();

  // Invalidate analytics cache — ranking changes whenever a credential is verified/rejected.
  // Synchronous (node-cache in-process) — no await, no latency impact on the response.
  invalidateCachePrefix('analytics:');

  // Audit trail — required by spec for every verify/reject action
  await AuditLog.create({
    userId: new mongoose.Types.ObjectId(user.id),
    action: 'credential_verify',
    meta:   {
      credentialId: cred._id.toString(),
      verdict:      body.verdict,
      studentId:    cred.studentId.toString(),
      department:   cred.department.toString(),
    },
  });

  // Notify student — fire-and-forget (never blocks the faculty response)
  void sendNotification(cred.studentId.toString(), {
    type:   'credential_update',
    credId: cred._id.toString(),
    status: body.verdict,
  });

  return cred.toObject();
}
