import mongoose from 'mongoose';
import { TeamPost, type ITeamPost } from '@/models/teamPost.model';
import { Event }     from '@/models/event.model';
import { User }      from '@/models/user.model';
import type { AuthUser }           from '@/shared/types';
import type { CreateTeamPostBody, UpdateTeamPostBody } from './team.schema';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@/shared/errors';

// ── Response shapes ───────────────────────────────────────────────────────────

export interface TeamPostCard {
  id:          string;
  eventId:     string;
  owner: {
    id:   string;
    name: string;
  };
  title:       string;
  description: string;
  rolesNeeded: string[];
  spotsTotal:  number;
  spotsLeft:   number;
  status:      ITeamPost['status'];
  expiresAt:   string;
  createdAt:   string;
  isOwner:     boolean;  // true if the requesting user owns this post
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toCard(
  post: ITeamPost & { ownerId: { _id: mongoose.Types.ObjectId; name: string } },
  actorId: string,
): TeamPostCard {
  return {
    id:          post._id.toString(),
    eventId:     post.eventId.toString(),
    owner: {
      id:   post.ownerId._id.toString(),
      name: post.ownerId.name,
    },
    title:       post.title,
    description: post.description ?? '',
    rolesNeeded: post.rolesNeeded,
    spotsTotal:  post.spotsTotal,
    spotsLeft:   post.spotsLeft,
    status:      post.status,
    expiresAt:   post.expiresAt.toISOString(),
    createdAt:   post.createdAt.toISOString(),
    isOwner:     post.ownerId._id.toString() === actorId,
  };
}

// ── GET /events/:id/teams ─────────────────────────────────────────────────────

export async function listTeamPosts(
  eventId: string,
  actorId: string,
  statusFilter?: string,
): Promise<TeamPostCard[]> {
  if (!mongoose.isValidObjectId(eventId)) throw new NotFoundError('Event');

  const query: Record<string, unknown> = { eventId };
  // Default: only show open + full posts; owner can see all including closed/expired
  if (statusFilter === 'all') {
    // no filter — used for owner's "my posts" view
  } else {
    query.status = { $in: ['open', 'full'] };
  }

  const posts = await TeamPost.find(query)
    .populate<{ ownerId: { _id: mongoose.Types.ObjectId; name: string } }>('ownerId', 'name')
    .sort({ createdAt: -1 })
    .lean();

  return posts.map(p => toCard(
    p as unknown as ITeamPost & { ownerId: { _id: mongoose.Types.ObjectId; name: string } },
    actorId,
  ));
}

// ── POST /teams ───────────────────────────────────────────────────────────────

export async function createTeamPost(
  actor: AuthUser,
  body: CreateTeamPostBody,
): Promise<TeamPostCard> {
  // 1. Verify event exists and is published
  const event = await Event.findById(body.eventId).lean();
  if (!event || event.status !== 'published') {
    throw new NotFoundError('Event');
  }

  // 2. Prevent duplicate open posts: one open post per student per event
  const existing = await TeamPost.findOne({
    eventId: body.eventId,
    ownerId: actor.id,
    status: { $in: ['open', 'full'] },
  });
  if (existing) {
    throw new ConflictError(
      'You already have an open team post for this event. Close it before creating another.',
    );
  }

  // 3. Create the post
  const post = await TeamPost.create({
    eventId:     body.eventId,
    ownerId:     actor.id,
    title:       body.title,
    description: body.description ?? '',
    rolesNeeded: body.rolesNeeded,
    spotsTotal:  body.spotsTotal,
    spotsLeft:   body.spotsTotal,     // starts full
    status:      'open',
    expiresAt:   event.deadline ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  // 4. Return populated card
  const populated = await TeamPost.findById(post._id)
    .populate<{ ownerId: { _id: mongoose.Types.ObjectId; name: string } }>('ownerId', 'name')
    .lean();

  return toCard(
    populated as unknown as ITeamPost & { ownerId: { _id: mongoose.Types.ObjectId; name: string } },
    actor.id,
  );
}

// ── PATCH /teams/:id ──────────────────────────────────────────────────────────

export async function updateTeamPost(
  actor: AuthUser,
  postId: string,
  body: UpdateTeamPostBody,
): Promise<TeamPostCard> {
  if (!mongoose.isValidObjectId(postId)) throw new NotFoundError('TeamPost');

  const post = await TeamPost.findById(postId)
    .populate<{ ownerId: { _id: mongoose.Types.ObjectId; name: string } }>('ownerId', 'name')
    .exec();

  if (!post) throw new NotFoundError('TeamPost');

  // Ownership check
  if (post.ownerId._id.toString() !== actor.id) {
    throw new ForbiddenError('You can only edit your own team posts.');
  }

  // Immutability: cannot edit an already-closed/expired post
  if (post.status === 'closed' || post.status === 'expired') {
    throw new ConflictError(`Cannot update a ${post.status} team post.`);
  }

  // Apply updates
  if (body.title       !== undefined) post.title       = body.title;
  if (body.description !== undefined) post.description = body.description;
  if (body.rolesNeeded !== undefined) post.rolesNeeded = body.rolesNeeded;
  if (body.status      === 'closed')  post.status      = 'closed';

  await post.save();

  return toCard(
    post.toObject() as unknown as ITeamPost & { ownerId: { _id: mongoose.Types.ObjectId; name: string } },
    actor.id,
  );
}

// ── GET /teams/my (helper used by the owner dashboard) ───────────────────────

export async function getMyTeamPosts(actor: AuthUser): Promise<TeamPostCard[]> {
  const posts = await TeamPost.find({ ownerId: actor.id })
    .populate<{ ownerId: { _id: mongoose.Types.ObjectId; name: string } }>('ownerId', 'name')
    .sort({ createdAt: -1 })
    .lean();

  return posts.map(p => toCard(
    p as unknown as ITeamPost & { ownerId: { _id: mongoose.Types.ObjectId; name: string } },
    actor.id,
  ));
}

// Export User for use in link.service (avoid circular by importing directly there)
export { User };
