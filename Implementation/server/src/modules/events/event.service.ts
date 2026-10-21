import mongoose from 'mongoose';
import NodeCache from 'node-cache';
import { Event, type IEvent } from '@/models/event.model';
import { Bookmark } from '@/models/bookmark.model';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '@/shared/errors';
import type { AuthUser } from '@/shared/types';
import type {
  CreateEventBody,
  UpdateEventBody,
  ListEventsQuery,
} from './event.schema';

// ── In-memory cache ──────────────────────────────────────────────────────────
// 60-second TTL on feed queries; invalidated on publish/close/delete.
// node-cache is already a dependency — zero infra cost.

const feedCache = new NodeCache({ stdTTL: 60, checkperiod: 30 });

function invalidateFeedCache(): void {
  feedCache.flushAll();
}

/** Exported for use in tests to prevent cache contamination between test cases. */
export function flushFeedCache(): void {
  feedCache.flushAll();
}

// ── Public shape types ────────────────────────────────────────────────────────

export interface EventCard {
  id: string;
  title: string;
  type: IEvent['type'];
  organizer?: string;
  deadline?: Date;
  eventDate?: Date;
  eligibility: IEvent['eligibility'];
  teamSize: IEvent['teamSize'];
  fee?: string;
  link?: string;
  summary?: string;
  registrationMode: IEvent['registrationMode'];
  registrationDeadline?: Date;
  counters: IEvent['counters'];
  status: IEvent['status'];
  postedBy: { id: string; name: string };
  isBookmarked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventDetail extends EventCard {
  rawMessage?: string; // Only populated for faculty who own the event
}

export interface ToggleBookmarkResult {
  bookmarked: boolean;
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * assertOwnerOrAdmin — throws ForbiddenError unless the actor is the event owner
 * or has role admin/dept_head.
 *
 * Single place for this check — both edit and state-transition routes call this.
 */
function assertOwnerOrAdmin(event: IEvent, actor: AuthUser): void {
  const isOwner = event.postedBy.toString() === actor.id;
  const isPrivileged = actor.role === 'admin' || actor.role === 'dept_head';
  if (!isOwner && !isPrivileged) {
    throw new ForbiddenError(
      'You can only modify events that you posted. Contact an admin for help.',
    );
  }
}

/**
 * toEventCard — strips rawMessage and shapes a lean IEvent into a public card.
 */
function toEventCard(
  doc: IEvent & { postedBy: { _id: mongoose.Types.ObjectId; name: string } | mongoose.Types.ObjectId },
  isBookmarked: boolean,
): EventCard {
  // postedBy may be populated (object) or unpopulated (ObjectId)
  const poster =
    typeof doc.postedBy === 'object' && 'name' in doc.postedBy
      ? { id: (doc.postedBy as { _id: mongoose.Types.ObjectId; name: string })._id.toString(), name: (doc.postedBy as { _id: mongoose.Types.ObjectId; name: string }).name }
      : { id: doc.postedBy.toString(), name: '' };

  return {
    id: doc._id.toString(),
    title: doc.title,
    type: doc.type,
    organizer: doc.organizer,
    deadline: doc.deadline,
    eventDate: doc.eventDate,
    eligibility: doc.eligibility,
    teamSize: doc.teamSize,
    fee: doc.fee,
    link: doc.link,
    summary: doc.summary,
    registrationMode: doc.registrationMode,
    registrationDeadline: doc.registrationDeadline,
    counters: doc.counters,
    status: doc.status,
    postedBy: poster,
    isBookmarked,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * injectBookmarks — given a list of events and a userId, returns a Set of
 * event IDs the user has bookmarked. One DB call regardless of page size.
 */
async function getBookmarkedIds(userId: string, eventIds: string[]): Promise<Set<string>> {
  if (eventIds.length === 0) return new Set();
  const bookmarks = await Bookmark.find({
    userId,
    eventId: { $in: eventIds },
  })
    .select('eventId')
    .lean();
  return new Set(bookmarks.map((b) => b.eventId.toString()));
}

/**
 * buildFeedFilter — constructs the MongoDB query filter for the event feed.
 *
 * Students always see only published events.
 * Faculty/admin can filter by status.
 * All roles filter out soft-deleted events.
 */
function buildFeedFilter(
  actor: AuthUser,
  query: ListEventsQuery,
): mongoose.FilterQuery<IEvent> {
  const filter: mongoose.FilterQuery<IEvent> = {
    // Never show soft-deleted events to anyone
    deletedAt: { $exists: false },
  };

  // Role-based status enforcement
  if (actor.role === 'student') {
    filter['status'] = 'published';
  } else if (query.status && query.status.length > 0) {
    filter['status'] = { $in: query.status };
  }

  // Type filter
  if (query.type && query.type.length > 0) {
    filter['type'] = { $in: query.type };
  }

  // Branch filter — match events where eligibility.branches is empty (open to all)
  // OR contains one of the requested branches.
  if (query.branch && query.branch.length > 0) {
    filter['$or'] = [
      { 'eligibility.branches': { $size: 0 } },
      { 'eligibility.branches': { $in: query.branch } },
    ];
  }

  // Year filter — same logic as branch
  if (query.year && query.year.length > 0) {
    const yearFilter = [
      { 'eligibility.years': { $size: 0 } },
      { 'eligibility.years': { $in: query.year } },
    ];
    if (filter['$or']) {
      // Combine with existing $or using $and
      filter['$and'] = [{ $or: filter['$or'] as mongoose.FilterQuery<IEvent>[] }, { $or: yearFilter }];
      delete filter['$or'];
    } else {
      filter['$or'] = yearFilter;
    }
  }

  return filter;
}

/**
 * decodeCursor / encodeCursor — compound cursor encoding.
 * Cursor encodes { deadline: ISO | null, _id: hex } as base64 JSON.
 */
interface Cursor { deadline: string | null; _id: string }

function encodeCursor(event: IEvent): string {
  const payload: Cursor = {
    deadline: event.deadline ? event.deadline.toISOString() : null,
    _id: event._id.toString(),
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeCursor(cursor: string): Cursor | null {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Cursor;
  } catch {
    return null;
  }
}

// ── Service Functions ─────────────────────────────────────────────────────────

// ── GET /api/v1/events ────────────────────────────────────────────────────────

export async function listEvents(actor: AuthUser, query: ListEventsQuery) {
  const cacheKey = `feed:${actor.role}:${JSON.stringify(query)}`;
  const cached = feedCache.get<EventCard[]>(cacheKey);
  if (cached) {
    return { items: cached, hasMore: false, nextCursor: undefined };
  }

  const filter = buildFeedFilter(actor, query);
  const limit = query.limit ?? 20;

  // Apply compound cursor (deadline ASC, _id ASC)
  if (query.cursor) {
    const c = decodeCursor(query.cursor);
    if (c) {
      const cursorDeadline = c.deadline ? new Date(c.deadline) : null;
      if (cursorDeadline) {
        filter['$and'] = [
          ...(filter['$and'] ?? []),
          {
            $or: [
              { deadline: { $gt: cursorDeadline } },
              {
                deadline: cursorDeadline,
                _id: { $gt: new mongoose.Types.ObjectId(c._id) },
              },
            ],
          },
        ];
      } else {
        // Events with no deadline come after those with deadlines
        filter['$and'] = [
          ...(filter['$and'] ?? []),
          {
            $or: [
              { deadline: { $exists: false } },
              { deadline: null },
            ],
            _id: { $gt: new mongoose.Types.ObjectId(c._id) },
          },
        ];
      }
    }
  }

  const docs = await Event.find(filter)
    .populate<{ postedBy: { _id: mongoose.Types.ObjectId; name: string } }>('postedBy', 'name')
    .sort({ deadline: 1, _id: 1 })
    .limit(limit + 1)
    .lean();

  const hasMore = docs.length > limit;
  if (hasMore) docs.pop();

  const eventIds = docs.map((d) => d._id.toString());
  const bookmarkedIds = await getBookmarkedIds(actor.id, eventIds);

  const items = docs.map((d) =>
    toEventCard(d as unknown as IEvent & { postedBy: { _id: mongoose.Types.ObjectId; name: string } }, bookmarkedIds.has(d._id.toString())),
  );

  const nextCursor =
    hasMore && docs.length > 0
      ? encodeCursor(docs[docs.length - 1] as unknown as IEvent)
      : undefined;

  // Cache feed pages (not personalized cursors — only first page)
  if (!query.cursor) {
    feedCache.set(cacheKey, items);
  }

  return { items, hasMore, nextCursor };
}

// ── GET /api/v1/events/:id ────────────────────────────────────────────────────

export async function getEventById(actor: AuthUser, id: string): Promise<EventDetail> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new NotFoundError('Event not found.');
  }

  const doc = await Event.findOne({
    _id: id,
    deletedAt: { $exists: false },
  })
    .populate<{ postedBy: { _id: mongoose.Types.ObjectId; name: string } }>('postedBy', 'name')
    .lean();

  if (!doc) throw new NotFoundError('Event not found.');

  // Students cannot see draft events
  if (actor.role === 'student' && doc.status !== 'published') {
    throw new NotFoundError('Event not found.');
  }

  const isBookmarked = !!(await Bookmark.exists({ userId: actor.id, eventId: id }));
  const card = toEventCard(
    doc as unknown as IEvent & { postedBy: { _id: mongoose.Types.ObjectId; name: string } },
    isBookmarked,
  );

  // rawMessage: only show to faculty/admin who own the event
  const isOwner = doc.postedBy._id.toString() === actor.id;
  const isPrivileged = actor.role === 'admin' || actor.role === 'dept_head';
  const includeRaw = (isOwner || isPrivileged) && actor.role !== 'student';

  return {
    ...card,
    rawMessage: includeRaw ? doc.rawMessage : undefined,
  };
}

// ── GET /api/v1/events/my ─────────────────────────────────────────────────────

export async function getMyEvents(actor: AuthUser, query: ListEventsQuery) {
  const filter: mongoose.FilterQuery<IEvent> = {
    postedBy: actor.id,
    deletedAt: { $exists: false },
  };

  const limit = query.limit ?? 20;

  // Allow status filter for own events
  if (query.status && query.status.length > 0) {
    filter['status'] = { $in: query.status };
  }

  if (query.cursor) {
    const c = decodeCursor(query.cursor);
    if (c) {
      filter['_id'] = { $lt: new mongoose.Types.ObjectId(c._id) };
    }
  }

  const docs = await Event.find(filter)
    .populate<{ postedBy: { _id: mongoose.Types.ObjectId; name: string } }>('postedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = docs.length > limit;
  if (hasMore) docs.pop();

  const eventIds = docs.map((d) => d._id.toString());
  const bookmarkedIds = await getBookmarkedIds(actor.id, eventIds);

  const items = docs.map((d) =>
    toEventCard(d as unknown as IEvent & { postedBy: { _id: mongoose.Types.ObjectId; name: string } }, bookmarkedIds.has(d._id.toString())),
  );

  const nextCursor =
    hasMore && docs.length > 0
      ? encodeCursor(docs[docs.length - 1] as unknown as IEvent)
      : undefined;

  return { items, hasMore, nextCursor };
}

// ── POST /api/v1/events ───────────────────────────────────────────────────────

export async function createEvent(actor: AuthUser, body: CreateEventBody): Promise<EventDetail> {
  // registrationDeadline defaults to deadline if not provided (SDE suggestion #6)
  const registrationDeadline =
    body.registrationDeadline ?? body.deadline ?? undefined;

  // link: treat empty string as "no link"
  const link = body.link === '' ? undefined : body.link;

  const event = await Event.create({
    title: body.title,
    type: body.type,
    organizer: body.organizer,
    deadline: body.deadline,
    eventDate: body.eventDate,
    eligibility: body.eligibility ?? { branches: [], years: [] },
    teamSize: body.teamSize ?? { min: 1, max: 1 },
    fee: body.fee,
    link,
    summary: body.summary,
    registrationMode: body.registrationMode ?? 'external',
    registrationDeadline,
    postedBy: actor.id,
    status: 'draft',
  });

  const populated = await Event.findById(event._id)
    .populate<{ postedBy: { _id: mongoose.Types.ObjectId; name: string } }>('postedBy', 'name')
    .lean();

  return {
    ...toEventCard(
      populated as unknown as IEvent & { postedBy: { _id: mongoose.Types.ObjectId; name: string } },
      false,
    ),
    rawMessage: undefined,
  };
}

// ── PUT /api/v1/events/:id ────────────────────────────────────────────────────

export async function updateEvent(
  actor: AuthUser,
  id: string,
  body: UpdateEventBody,
): Promise<EventDetail> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new NotFoundError('Event not found.');
  }

  const event = await Event.findOne({ _id: id, deletedAt: { $exists: false } });
  if (!event) throw new NotFoundError('Event not found.');

  assertOwnerOrAdmin(event, actor);

  // Only draft and published events can be edited
  if (event.status === 'closed' || event.status === 'archived') {
    throw new ConflictError(
      `Cannot edit a ${event.status} event. Archive or restore it first.`,
    );
  }

  // Merge update
  const link = body.link === '' ? undefined : body.link;
  const updates: Partial<IEvent> = {
    ...(body.title !== undefined && { title: body.title }),
    ...(body.type !== undefined && { type: body.type }),
    ...(body.organizer !== undefined && { organizer: body.organizer }),
    ...(body.deadline !== undefined && { deadline: body.deadline }),
    ...(body.eventDate !== undefined && { eventDate: body.eventDate }),
    ...(body.eligibility !== undefined && { eligibility: body.eligibility }),
    ...(body.teamSize !== undefined && { teamSize: body.teamSize }),
    ...(body.fee !== undefined && { fee: body.fee }),
    ...(link !== undefined && { link }),
    ...(body.summary !== undefined && { summary: body.summary }),
    ...(body.registrationMode !== undefined && { registrationMode: body.registrationMode }),
    ...(body.registrationDeadline !== undefined && { registrationDeadline: body.registrationDeadline }),
  };

  const updated = await Event.findByIdAndUpdate(id, { $set: updates }, { new: true })
    .populate<{ postedBy: { _id: mongoose.Types.ObjectId; name: string } }>('postedBy', 'name')
    .lean();

  if (!updated) throw new NotFoundError('Event not found.');

  invalidateFeedCache();

  const isOwner = updated.postedBy._id.toString() === actor.id;
  return {
    ...toEventCard(
      updated as unknown as IEvent & { postedBy: { _id: mongoose.Types.ObjectId; name: string } },
      false,
    ),
    rawMessage: isOwner || actor.role === 'admin' ? updated.rawMessage : undefined,
  };
}

// ── PATCH /api/v1/events/:id/publish ─────────────────────────────────────────

export async function publishEvent(actor: AuthUser, id: string): Promise<EventDetail> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new NotFoundError('Event not found.');
  }

  const event = await Event.findOne({ _id: id, deletedAt: { $exists: false } });
  if (!event) throw new NotFoundError('Event not found.');

  assertOwnerOrAdmin(event, actor);

  if (event.status !== 'draft') {
    throw new ConflictError(
      `Only draft events can be published. Current status: '${event.status}'.`,
    );
  }

  if (!event.title || !event.deadline) {
    throw new ValidationError(
      'An event must have a title and a deadline before it can be published.',
    );
  }

  const updated = await Event.findByIdAndUpdate(
    id,
    { $set: { status: 'published' } },
    { new: true },
  )
    .populate<{ postedBy: { _id: mongoose.Types.ObjectId; name: string } }>('postedBy', 'name')
    .lean();

  if (!updated) throw new NotFoundError('Event not found.');

  invalidateFeedCache();

  return {
    ...toEventCard(
      updated as unknown as IEvent & { postedBy: { _id: mongoose.Types.ObjectId; name: string } },
      false,
    ),
    rawMessage: undefined,
  };
}

// ── PATCH /api/v1/events/:id/close ───────────────────────────────────────────

export async function closeEvent(actor: AuthUser, id: string): Promise<EventDetail> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new NotFoundError('Event not found.');
  }

  const event = await Event.findOne({ _id: id, deletedAt: { $exists: false } });
  if (!event) throw new NotFoundError('Event not found.');

  assertOwnerOrAdmin(event, actor);

  if (event.status !== 'published') {
    throw new ConflictError(
      `Only published events can be closed. Current status: '${event.status}'.`,
    );
  }

  const updated = await Event.findByIdAndUpdate(
    id,
    { $set: { status: 'closed' } },
    { new: true },
  )
    .populate<{ postedBy: { _id: mongoose.Types.ObjectId; name: string } }>('postedBy', 'name')
    .lean();

  if (!updated) throw new NotFoundError('Event not found.');

  invalidateFeedCache();

  return {
    ...toEventCard(
      updated as unknown as IEvent & { postedBy: { _id: mongoose.Types.ObjectId; name: string } },
      false,
    ),
    rawMessage: undefined,
  };
}

// ── DELETE /api/v1/events/:id ─────────────────────────────────────────────────

export async function deleteEvent(actor: AuthUser, id: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new NotFoundError('Event not found.');
  }

  const event = await Event.findOne({ _id: id, deletedAt: { $exists: false } });
  if (!event) throw new NotFoundError('Event not found.');

  assertOwnerOrAdmin(event, actor);

  // Soft-delete: set deletedAt timestamp — admin can recover via DB query
  await Event.findByIdAndUpdate(id, { $set: { deletedAt: new Date() } });

  invalidateFeedCache();
}

// ── POST /api/v1/events/:id/bookmark ─────────────────────────────────────────

export async function toggleBookmark(
  actor: AuthUser,
  eventId: string,
): Promise<ToggleBookmarkResult> {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    throw new NotFoundError('Event not found.');
  }

  // Verify event exists and is published
  const event = await Event.findOne({
    _id: eventId,
    status: 'published',
    deletedAt: { $exists: false },
  });
  if (!event) throw new NotFoundError('Event not found or not available for bookmarking.');

  // Toggle: if bookmark exists → remove; else → create
  const existing = await Bookmark.findOne({ userId: actor.id, eventId });
  if (existing) {
    await Bookmark.deleteOne({ _id: existing._id });
    return { bookmarked: false };
  }

  await Bookmark.create({ userId: actor.id, eventId });
  return { bookmarked: true };
}

// ── Used by cron job (jobs/closeEvents.ts) ────────────────────────────────────

/**
 * closeExpiredEvents — closes all published events whose deadline has passed.
 * Called by the nightly cron at 00:05. Returns the count of events closed.
 */
export async function closeExpiredEvents(): Promise<number> {
  const result = await Event.updateMany(
    {
      status: 'published',
      deadline: { $lt: new Date() },
      deletedAt: { $exists: false },
    },
    { $set: { status: 'closed' } },
  );

  if (result.modifiedCount > 0) {
    invalidateFeedCache();
  }

  return result.modifiedCount;
}

// ── Used by user service (future) ─────────────────────────────────────────────
// These are exported for F-3 to call when setting rawMessage + extraction metadata

export async function setRawMessage(
  eventId: string,
  rawMessage: string,
  extraction: IEvent['extraction'],
): Promise<void> {
  await Event.findByIdAndUpdate(eventId, {
    $set: { rawMessage, extraction },
  });
  invalidateFeedCache();
}
