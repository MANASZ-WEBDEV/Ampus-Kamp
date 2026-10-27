import mongoose from 'mongoose';
import fs from 'fs';
import { Participation }   from '@/models/participation.model';
import { AuditLog }        from '@/models/auditLog.model';
import { sha256 }          from '@/shared/utils/hash';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  AppError,
} from '@/shared/errors';
import type { AuthUser }                from '@/shared/types';
import type {
  CreateParticipationBody,
  VerifyParticipationBody,
} from './participation.schema';

// ── createParticipation ───────────────────────────────────────────────────────

/**
 * createParticipation — upload participation proof.
 *
 * - proofHash is SHA-256 computed server-side (never from body)
 * - studentId always from req.user
 * - Duplicate (studentId, eventId) → 409
 */
export async function createParticipation(
  user: AuthUser,
  body: CreateParticipationBody,
  file: Express.Multer.File,
) {
  const fileBuffer = fs.readFileSync(file.path);
  const proofHash  = sha256(fileBuffer);
  const proofUrl   = `/uploads/${file.filename}`;

  try {
    const doc = await Participation.create({
      studentId:      new mongoose.Types.ObjectId(user.id),
      eventId:        new mongoose.Types.ObjectId(body.eventId),
      registrationId: body.registrationId
        ? new mongoose.Types.ObjectId(body.registrationId)
        : undefined,
      teamName:       body.teamName,
      members:        body.members.map((m) => ({
        userId:     new mongoose.Types.ObjectId(m.userId),
        department: new mongoose.Types.ObjectId(m.department),
      })),
      result:     body.result,
      resultNote: body.resultNote,
      proofUrl,
      proofHash,
      verification: {
        status: 'pending',
        method: 'faculty',
      },
    });
    return doc.toObject();
  } catch (err: unknown) {
    const mongoErr = err as { code?: number; keyPattern?: Record<string, unknown> };
    if (mongoErr.code === 11000) {
      throw new ConflictError(
        'You have already submitted a participation proof for this event.',
      );
    }
    throw err;
  }
}

// ── verifyParticipation ───────────────────────────────────────────────────────

/**
 * verifyParticipation — faculty approves or rejects a participation record.
 *
 * Same rules as credential verify:
 *   - Self-verify blocked
 *   - AuditLog written on every action
 */
export async function verifyParticipation(
  user: AuthUser,
  participationId: string,
  body: VerifyParticipationBody,
) {
  const participation = await Participation.findById(participationId);
  if (!participation) throw new NotFoundError('Participation');

  // Self-verify guard
  if (participation.studentId.equals(user.id)) {
    throw new ForbiddenError('You cannot verify your own participation record.');
  }

  // Already actioned guard
  if (participation.verification.status !== 'pending') {
    throw new AppError(
      `Participation is already ${participation.verification.status}.`,
      409,
      'ALREADY_ACTIONED',
    );
  }

  participation.verification.status     = body.verdict;
  participation.verification.verifiedBy = new mongoose.Types.ObjectId(user.id);
  participation.verification.verifiedAt = new Date();
  if (body.reason) participation.verification.reason = body.reason;

  await participation.save();

  // Audit trail
  await AuditLog.create({
    userId: new mongoose.Types.ObjectId(user.id),
    action: 'participation_verify',
    meta:   {
      participationId: participation._id.toString(),
      verdict:         body.verdict,
      studentId:       participation.studentId.toString(),
      eventId:         participation.eventId.toString(),
    },
  });

  return participation.toObject();
}
