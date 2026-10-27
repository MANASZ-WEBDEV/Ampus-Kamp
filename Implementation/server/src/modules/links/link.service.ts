import mongoose from 'mongoose';
import { TeamLink, type ITeamLink } from '@/models/teamLink.model';
import { TeamPost }  from '@/models/teamPost.model';
import { Block }     from '@/models/block.model';
import { User }      from '@/models/user.model';
import { Setting }   from '@/models/setting.model';
import type { AuthUser } from '@/shared/types';
import type { SendLinkBody, LinksQuery } from './link.schema';
import { sendNotification }            from '@/modules/notifications/notification.service';
import { invalidateHomeCache }         from '@/modules/home/home.service';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
} from '@/shared/errors';

// ── Constants ─────────────────────────────────────────────────────────────────

const LINK_TTL_MS      = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOLDOWN_DAYS    = 30;
const DEFAULT_DAY_LIMIT = 10;

// ── Response shapes ───────────────────────────────────────────────────────────

export interface ContactReveal {
  phone: string;
}

export interface ContactHint {
  hint: string;
}

export interface LinkCard {
  id:          string;
  direction:   ITeamLink['direction'];
  status:      ITeamLink['status'];
  from: { id: string; name: string };
  to:   { id: string; name: string };
  eventId?:    string;
  teamPostId?: string;
  message?:    string;
  expiresAt:   string;
  respondedAt?: string;
  createdAt:   string;
  // Present ONLY when status='accepted' — never for pending/declined/expired
  contact?: ContactReveal | ContactHint;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Shape a TeamLink document into a client-safe LinkCard.
 *  phone is ONLY included when status='accepted' AND the target's phoneVisible=true.
 *  All other states return no contact information.
 */
function shapeLink(
  link: ITeamLink & {
    fromUserId: { _id: mongoose.Types.ObjectId; name: string };
    toUserId:   { _id: mongoose.Types.ObjectId; name: string; phoneVisible?: boolean; phone?: string };
  },
): LinkCard {
  const base: LinkCard = {
    id:          link._id.toString(),
    direction:   link.direction,
    status:      link.status,
    from: { id: link.fromUserId._id.toString(), name: link.fromUserId.name },
    to:   { id: link.toUserId._id.toString(),   name: link.toUserId.name },
    eventId:     link.eventId?.toString(),
    teamPostId:  link.teamPostId?.toString(),
    message:     link.message,
    expiresAt:   link.expiresAt.toISOString(),
    respondedAt: link.respondedAt?.toISOString(),
    createdAt:   link.createdAt.toISOString(),
  };

  // ── Contact reveal rule (enforced here — not on the client) ──────────────
  // phone NEVER appears unless status='accepted' AND phoneVisible=true
  if (link.status === 'accepted') {
    if (link.toUserId.phoneVisible && link.toUserId.phone) {
      base.contact = { phone: link.toUserId.phone };
    } else {
      base.contact = { hint: 'Ask the leader to share a WhatsApp group link.' };
    }
  }

  return base;
}

/** Read linksPerDay limit from Setting; fallback to DEFAULT_DAY_LIMIT */
async function getDayLimit(): Promise<number> {
  try {
    const setting = await Setting.findOne({ key: 'linksPerDay' }).lean();
    return typeof setting?.value === 'number' ? setting.value : DEFAULT_DAY_LIMIT;
  } catch {
    return DEFAULT_DAY_LIMIT;
  }
}

// ── POST /api/v1/links ────────────────────────────────────────────────────────

export async function sendLink(actor: AuthUser, body: SendLinkBody): Promise<LinkCard> {

  // ── 1. Resolve toUserId and eventId ─────────────────────────────────────
  let toUserId: string;
  let eventId: string | undefined = body.eventId;

  if (body.direction === 'request') {
    // For requests, derive toUserId from the post owner
    const post = await TeamPost.findById(body.teamPostId).lean();
    if (!post || post.status !== 'open') {
      throw new NotFoundError('TeamPost (must be open)');
    }
    toUserId = post.ownerId.toString();
    eventId  = post.eventId.toString();

    // Cannot request to join your own post
    if (toUserId === actor.id) {
      throw new ForbiddenError('You cannot send a join request to your own team post.');
    }
  } else {
    // invite / connect
    toUserId = body.toUserId!;

    // ── allowInvites check (F-5) ─────────────────────────────────────────
    // Server-side enforcement — not just hidden in the UI.
    // Only the allowInvites field is fetched — no other user data needed.
    const target = await User.findById(toUserId).select('allowInvites').lean();
    if (!target) throw new NotFoundError('User');
    if (!target.allowInvites) {
      throw new ForbiddenError(
        'This student is not accepting invites or connection requests at this time.',
      );
    }
  }

  // ── 2. Block check ───────────────────────────────────────────────────────
  // Bidirectional: if either party blocked the other, deny the action.
  const blocked = await Block.findOne({
    $or: [
      { userId: actor.id, blockedUserId: toUserId },
      { userId: toUserId, blockedUserId: actor.id },
    ],
  }).lean();
  if (blocked) {
    throw new ForbiddenError('This action is not allowed.');
  }

  // ── 3. Cannot self-link ──────────────────────────────────────────────────
  if (actor.id === toUserId) {
    throw new ForbiddenError('You cannot send a link to yourself.');
  }

  // ── 4. Daily limit (invites + connects only; requests are exempt per spec)
  if (body.direction !== 'request') {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const todayCount = await TeamLink.countDocuments({
      fromUserId: actor.id,
      direction: { $in: ['invite', 'connect'] },
      createdAt: { $gte: today },
    });

    const limit = await getDayLimit();
    if (todayCount >= limit) {
      throw new RateLimitError(`Daily link limit of ${limit} reached. Try again tomorrow.`);
    }
  }

  // ── 5. Decline cool-down (30 days) ──────────────────────────────────────
  // Prevents spamming a user who already declined.
  const cooldownSince = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const recentDecline = await TeamLink.findOne({
    fromUserId: actor.id,
    toUserId,
    ...(eventId ? { eventId } : {}),
    status: 'declined',
    respondedAt: { $gte: cooldownSince },
  }).lean();

  if (recentDecline) {
    throw new RateLimitError(
      `You were declined by this person within the last ${COOLDOWN_DAYS} days. ` +
      `You can send another request after the cool-down period.`,
    );
  }

  // ── 6. Create the link ───────────────────────────────────────────────────
  // The partial unique index on { fromUserId, toUserId, eventId } where status='pending'
  // guarantees no duplicate pending pairs — Mongo returns code 11000 on violation.
  let link: ITeamLink;
  try {
    link = await TeamLink.create({
      direction:   body.direction,
      fromUserId:  actor.id,
      toUserId,
      eventId,
      teamPostId:  body.teamPostId,
      message:     body.message,
      status:      'pending',
      expiresAt:   new Date(Date.now() + LINK_TTL_MS),
    });
  } catch (err: unknown) {
    // MongoDB duplicate key error on the partial unique index → 409
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000) {
      throw new ConflictError(
        'You already have a pending request to this person for this event. ' +
        'Wait for a response or withdraw the existing request.',
      );
    }
    throw err;
  }

  // ── 7. Return shaped card ────────────────────────────────────────────────
  const populated = await TeamLink.findById(link._id)
    .populate<{ fromUserId: { _id: mongoose.Types.ObjectId; name: string } }>('fromUserId', 'name')
    .populate<{ toUserId:   { _id: mongoose.Types.ObjectId; name: string; phoneVisible: boolean } }>('toUserId', 'name phoneVisible')
    .lean();

  const shaped = shapeLink(populated as unknown as Parameters<typeof shapeLink>[0]);

  // Notify recipient — fire-and-forget
  const recipientId = shaped.to.id;
  void sendNotification(recipientId, {
    type:     'link_received',
    linkId:   shaped.id,
    fromName: shaped.from.name,
  });
  // Invalidate recipient's home cache (pendingRequestCount changes)
  invalidateHomeCache(recipientId);

  return shaped;
}

// ── PATCH /api/v1/links/:id ───────────────────────────────────────────────────

export async function respondLink(
  actor: AuthUser,
  linkId: string,
  action: 'accept' | 'decline' | 'withdraw',
): Promise<LinkCard> {
  if (!mongoose.isValidObjectId(linkId)) throw new NotFoundError('Link');

  const link = await TeamLink.findById(linkId).lean();
  if (!link) throw new NotFoundError('Link');

  if (link.status !== 'pending') {
    throw new ConflictError(`Cannot ${action} a link that is already ${link.status}.`);
  }

  // ── Permission check ─────────────────────────────────────────────────────
  if (action === 'withdraw') {
    // Only the sender can withdraw
    if (link.fromUserId.toString() !== actor.id) {
      throw new ForbiddenError('Only the sender can withdraw a request.');
    }
  } else {
    // accept / decline: only the recipient can respond
    if (link.toUserId.toString() !== actor.id) {
      throw new ForbiddenError('Only the recipient can accept or decline a request.');
    }
  }

  // ── Accept: atomic spot decrement ────────────────────────────────────────
  if (action === 'accept' && link.teamPostId) {
    // SDE3 note: findOneAndUpdate with { spotsLeft: { $gt: 0 } } is a single
    // atomic MongoDB operation. Two concurrent accepts cannot both succeed —
    // the second one will find spotsLeft already 0 and return null.
    const updated = await TeamPost.findOneAndUpdate(
      { _id: link.teamPostId, spotsLeft: { $gt: 0 } },
      { $inc: { spotsLeft: -1 } },
      { new: true },
    );

    if (!updated) {
      throw new ConflictError(
        'No spots left — the team is now full. This request cannot be accepted.',
      );
    }

    // If spotsLeft just hit 0, mark the post as full
    if (updated.spotsLeft === 0) {
      await TeamPost.findByIdAndUpdate(updated._id, { $set: { status: 'full' } });
    }
  }

  // ── Update link status ───────────────────────────────────────────────────
  const statusMap: Record<typeof action, ITeamLink['status']> = {
    accept:   'accepted',
    decline:  'declined',
    withdraw: 'withdrawn',
  };

  const updatedLink = await TeamLink.findByIdAndUpdate(
    linkId,
    {
      $set: {
        status:      statusMap[action],
        respondedAt: action !== 'withdraw' ? new Date() : undefined,
      },
    },
    { new: true },
  )
    .populate<{ fromUserId: { _id: mongoose.Types.ObjectId; name: string } }>('fromUserId', 'name')
    .populate<{ toUserId: { _id: mongoose.Types.ObjectId; name: string; phoneVisible: boolean; phone?: string } }>(
      'toUserId',
      // Fetch +phone ONLY on accept path — never expose otherwise
      action === 'accept' ? 'name phoneVisible +phone' : 'name phoneVisible',
    )
    .lean();

  if (!updatedLink) throw new NotFoundError('Link');

  const shaped = shapeLink(updatedLink as unknown as Parameters<typeof shapeLink>[0]);

  // Notify original sender on accept/decline — fire-and-forget
  // Withdraw is excluded: no need to notify yourself.
  if (action === 'accept' || action === 'decline') {
    void sendNotification(shaped.from.id, {
      type:   'link_update',
      linkId: shaped.id,
      status: action === 'accept' ? 'accepted' : 'declined',
    });
    // Sender's home pendingRequestCount may change
    invalidateHomeCache(shaped.from.id);
  }
  // Recipient's home pendingRequestCount also changes on any action
  invalidateHomeCache(shaped.to.id);

  return shaped;
}

// ── GET /api/v1/links?box=in|out ─────────────────────────────────────────────

export async function getLinks(
  actor: AuthUser,
  query: LinksQuery,
): Promise<{ items: LinkCard[]; nextCursor?: string; hasMore: boolean }> {
  const { box, limit, cursor } = query;

  const filter: Record<string, unknown> =
    box === 'in'
      ? { toUserId: actor.id }
      : { fromUserId: actor.id };

  if (cursor) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  // Fetch limit + 1 to determine hasMore
  const raw = await TeamLink.find(filter)
    .populate<{ fromUserId: { _id: mongoose.Types.ObjectId; name: string } }>('fromUserId', 'name')
    .populate<{ toUserId: { _id: mongoose.Types.ObjectId; name: string; phoneVisible: boolean; phone?: string } }>(
      'toUserId',
      // Fetch +phone for all — shapeLink will only expose it for accepted links
      'name phoneVisible +phone',
    )
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = raw.length > limit;
  const items   = hasMore ? raw.slice(0, limit) : raw;
  const nextCursor = hasMore ? items[items.length - 1]?._id.toString() : undefined;

  return {
    items: items.map(l => shapeLink(l as unknown as Parameters<typeof shapeLink>[0])),
    nextCursor,
    hasMore,
  };
}
