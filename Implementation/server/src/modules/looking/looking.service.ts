import mongoose from 'mongoose';
import { LookingFlag, type ILookingFlag } from '@/models/lookingFlag.model';
import { Event }       from '@/models/event.model';
import type { AuthUser } from '@/shared/types';
import type { UpsertLookingBody, LookingQuery } from './looking.schema';
import { NotFoundError, ForbiddenError } from '@/shared/errors';

// ── Response shape ────────────────────────────────────────────────────────────

export interface LookingCard {
  id:       string;
  user:     { id: string; name: string };
  note?:    string;
  since:    string;  // ISO — "looking since"
}

export interface ToggleResult {
  isLooking: boolean;
  flag?:     LookingCard;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function shapeFlag(
  flag: ILookingFlag & {
    userId: { _id: mongoose.Types.ObjectId; name: string };
  },
): LookingCard {
  return {
    id:    flag._id.toString(),
    user:  { id: flag.userId._id.toString(), name: flag.userId.name },
    note:  flag.note,
    since: flag.createdAt.toISOString(),
  };
}

// ── PUT /api/v1/events/:eventId/looking ───────────────────────────────────────
//
// Toggle semantics: if flag exists → remove (isLooking=false)
//                   if absent    → create (isLooking=true)
//
// Guard: event must be published and not closed/expired.
// This prevents ghost flags for past events.

export async function toggleLooking(
  actor: AuthUser,
  eventId: string,
  body: UpsertLookingBody,
): Promise<ToggleResult> {
  if (!mongoose.isValidObjectId(eventId)) throw new NotFoundError('Event');

  // Event must exist and be published + open
  const event = await Event.findById(eventId).select('status').lean();
  if (!event) throw new NotFoundError('Event');
  if (!['published', 'open'].includes(event.status as string)) {
    throw new ForbiddenError('You can only mark yourself as looking for an active event.');
  }

  const existing = await LookingFlag.findOne({ userId: actor.id, eventId });

  if (existing) {
    await existing.deleteOne();
    return { isLooking: false };
  }

  const created = await LookingFlag.create({
    userId:  actor.id,
    eventId,
    note: body.note,
  });

  const populated = await LookingFlag.findById(created._id)
    .populate<{ userId: { _id: mongoose.Types.ObjectId; name: string } }>('userId', 'name')
    .lean();

  return {
    isLooking: true,
    flag: shapeFlag(populated as unknown as ILookingFlag & { userId: { _id: mongoose.Types.ObjectId; name: string } }),
  };
}

// ── GET /api/v1/events/:eventId/looking ──────────────────────────────────────
//
// Cursor-based pagination on { eventId: 1, createdAt: -1 }.
// Returns students who have set the looking flag for this event.

export async function listLooking(
  eventId: string,
  query: LookingQuery,
): Promise<{ items: LookingCard[]; nextCursor?: string; hasMore: boolean }> {
  if (!mongoose.isValidObjectId(eventId)) return { items: [], hasMore: false };

  const { limit, cursor } = query;

  const filter: Record<string, unknown> = { eventId };
  if (cursor) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const raw = await LookingFlag.find(filter)
    .populate<{ userId: { _id: mongoose.Types.ObjectId; name: string } }>('userId', 'name')
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore   = raw.length > limit;
  const items     = hasMore ? raw.slice(0, limit) : raw;
  const nextCursor = hasMore ? items[items.length - 1]?._id.toString() : undefined;

  return {
    items: items.map(f =>
      shapeFlag(f as unknown as ILookingFlag & { userId: { _id: mongoose.Types.ObjectId; name: string } }),
    ),
    nextCursor,
    hasMore,
  };
}
