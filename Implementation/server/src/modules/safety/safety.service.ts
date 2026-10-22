import mongoose from 'mongoose';
import { Block }    from '@/models/block.model';
import { Report }   from '@/models/report.model';
import { TeamLink } from '@/models/teamLink.model';
import { User }     from '@/models/user.model';
import type { AuthUser } from '@/shared/types';
import type { CreateBlockBody, CreateReportBody } from './safety.schema';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@/shared/errors';

// ── Block response shape ──────────────────────────────────────────────────────

export interface BlockCard {
  id:          string;
  blockedUser: { id: string; name: string };
  createdAt:   string;
}

// ── POST /api/v1/blocks ───────────────────────────────────────────────────────
//
// SDE3 notes:
//   1. Self-block guard first (cheapest check).
//   2. Verify target exists + is active before inserting.
//   3. Create block document — unique index catches duplicate 11000 → 409.
//   4. Cascade: delete ALL pending links between the pair in one atomic
//      deleteMany. Two parties, both directions, any direction value.
//      This is a single DB operation — not four separate queries.

export async function createBlock(
  actor: AuthUser,
  body:  CreateBlockBody,
): Promise<BlockCard> {
  const { blockedUserId } = body;

  // ── Guard: cannot block yourself ─────────────────────────────────────────
  if (actor.id === blockedUserId) {
    throw new ForbiddenError('You cannot block yourself.');
  }

  // ── Guard: target must be an active user ─────────────────────────────────
  if (!mongoose.isValidObjectId(blockedUserId)) throw new NotFoundError('User');
  const target = await User.findOne({ _id: blockedUserId, status: 'active' })
    .select('name')
    .lean();
  if (!target) throw new NotFoundError('User');

  // ── Create the block ──────────────────────────────────────────────────────
  let block;
  try {
    block = await Block.create({ userId: actor.id, blockedUserId });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000) {
      throw new ConflictError('You have already blocked this user.');
    }
    throw err;
  }

  // ── Cascade: delete all pending links between the pair ───────────────────
  // One deleteMany covers both directions — no need for separate queries.
  await TeamLink.deleteMany({
    status: 'pending',
    $or: [
      { fromUserId: actor.id,    toUserId: blockedUserId },
      { fromUserId: blockedUserId, toUserId: actor.id },
    ],
  });

  return {
    id:          block._id.toString(),
    blockedUser: { id: blockedUserId, name: target.name },
    createdAt:   block.createdAt.toISOString(),
  };
}

// ── DELETE /api/v1/blocks/:blockedUserId ──────────────────────────────────────
// Unblocking does NOT restore deleted links — those are gone permanently.

export async function removeBlock(actor: AuthUser, blockedUserId: string): Promise<void> {
  if (!mongoose.isValidObjectId(blockedUserId)) throw new NotFoundError('Block');

  const result = await Block.findOneAndDelete({
    userId: actor.id,
    blockedUserId,
  });

  if (!result) throw new NotFoundError('Block');
}

// ── GET /api/v1/blocks ────────────────────────────────────────────────────────

export async function getMyBlocks(actor: AuthUser): Promise<BlockCard[]> {
  const blocks = await Block.find({ userId: actor.id })
    .populate<{ blockedUserId: { _id: mongoose.Types.ObjectId; name: string } }>('blockedUserId', 'name')
    .sort({ createdAt: -1 })
    .lean();

  return blocks.map(b => ({
    id:          b._id.toString(),
    blockedUser: {
      id:   (b.blockedUserId as unknown as { _id: mongoose.Types.ObjectId; name: string })._id.toString(),
      name: (b.blockedUserId as unknown as { _id: mongoose.Types.ObjectId; name: string }).name,
    },
    createdAt: b.createdAt.toISOString(),
  }));
}

// ── POST /api/v1/reports ──────────────────────────────────────────────────────
//
// Reporter identity stored, never exposed to target.
// Rate-limit: max 5 pending reports per reporter (prevent spam to admin queue).
// Full admin UI is F-10.

const MAX_PENDING_REPORTS_PER_USER = 5;

export async function createReport(
  actor: AuthUser,
  body:  CreateReportBody,
): Promise<{ id: string }> {
  // Anti-spam: cap pending reports per reporter
  const pendingCount = await Report.countDocuments({
    reporterId: actor.id,
    status:     'pending',
  });

  if (pendingCount >= MAX_PENDING_REPORTS_PER_USER) {
    throw new ConflictError(
      'You have too many pending reports. Please wait for the admin team to review existing reports.',
    );
  }

  // Validate references exist (prevent orphan reports)
  if (body.targetUserId) {
    if (!mongoose.isValidObjectId(body.targetUserId)) throw new NotFoundError('User');
    const exists = await User.exists({ _id: body.targetUserId });
    if (!exists) throw new NotFoundError('User');
  }

  if (body.linkId) {
    if (!mongoose.isValidObjectId(body.linkId)) throw new NotFoundError('Link');
    const exists = await TeamLink.exists({ _id: body.linkId });
    if (!exists) throw new NotFoundError('Link');
  }

  const report = await Report.create({
    reporterId:    actor.id,
    targetUserId:  body.targetUserId,
    linkId:        body.linkId,
    reason:        body.reason,
    status:        'pending',
  });

  return { id: report._id.toString() };
}
