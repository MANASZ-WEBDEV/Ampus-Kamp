import mongoose, { type FilterQuery } from 'mongoose';
import { User, type IUser }     from '@/models/user.model';
import { LookingFlag }          from '@/models/lookingFlag.model';
import { Block }                from '@/models/block.model';
import { Dept }                 from '@/models/dept.model';
import type { AuthUser }        from '@/shared/types';
import type { PeopleQuery }     from './people.schema';

// ── Response shape ────────────────────────────────────────────────────────────
//
// SECURITY CONTRACT — never included in PersonCard:
//   phone, email, enrollmentNo, passwordHash, collegeId
//
// All three are `select:false` on the schema (belt) AND
// the whitelist projection below (suspenders).

export interface PersonCard {
  id:           string;
  name:         string;
  department:   { id: string; code: string; name: string };
  year?:        number;
  skills:       string[];
  allowInvites: boolean;
  // isLooking is ONLY present when eventId was supplied in the query.
  // Absent otherwise — not defaulted to false — so clients can distinguish
  // "not looking for this event" from "we don't know (no event context)".
  isLooking?:   boolean;
}

// ── GET /api/v1/people ───────────────────────────────────────────────────────
//
// SDE3 design decisions:
//
// 1. Keyset pagination on _id (ObjectId) — consistent ordering under
//    concurrent inserts; no SKIP performance cliff.
//
// 2. Block exclusion via a pre-fetched Set (not a $lookup) — the actor's
//    block list is small (≤ few hundred entries), so fetching them upfront
//    and excluding them from the filter is faster than a $lookup pipeline
//    and avoids polluting the aggregation with the safety concern.
//
// 3. isLooking via ONE batched query — after we have the result page,
//    we extract all user IDs, run a SINGLE LookingFlag.find({ eventId,
//    userId: { $in: ids } }), and build a Set for O(1) lookup per user.
//    Zero N+1 queries.
//
// 4. Branch filter via Dept code lookup — the UI passes readable codes
//    ("CSE", "ECE") but the DB stores ObjectId refs. One Dept.findOne()
//    converts code → _id before the main query.

export async function searchPeople(
  actor: AuthUser,
  query: PeopleQuery,
): Promise<{ items: PersonCard[]; nextCursor?: string; hasMore: boolean }> {
  const { skills, branch, year, eventId, limit, cursor } = query;

  // ── Step 1: Resolve branch code → department ObjectId ─────────────────────
  let departmentId: mongoose.Types.ObjectId | undefined;
  if (branch) {
    const dept = await Dept.findOne({ code: branch.toUpperCase() })
      .select('_id')
      .lean();
    if (!dept) {
      // Unknown branch code → return empty (not an error)
      return { items: [], hasMore: false };
    }
    departmentId = dept._id as mongoose.Types.ObjectId;
  }

  // ── Step 2: Pre-fetch actor's block list (both directions) ────────────────
  // We exclude users the actor has blocked AND users who blocked the actor.
  // One query per direction, then union into a Set.
  const [myBlocks, blockedBy] = await Promise.all([
    Block.find({ userId: actor.id }).select('blockedUserId').lean(),
    Block.find({ blockedUserId: actor.id }).select('userId').lean(),
  ]);

  const excludedIds = new Set<string>([
    actor.id,  // always exclude self
    ...myBlocks.map(b => b.blockedUserId.toString()),
    ...blockedBy.map(b => b.userId.toString()),
  ]);

  // ── Step 3: Build main filter ─────────────────────────────────────────────
  const filter: FilterQuery<IUser> = {
    role:   'student',
    status: 'active',
    _id:    {
      $nin: [...excludedIds].map(id => new mongoose.Types.ObjectId(id)),
      // Cursor for keyset pagination (only added when cursor present)
      ...(cursor ? { $lt: new mongoose.Types.ObjectId(cursor) } : {}),
    },
  };

  if (departmentId) filter.department = departmentId;
  if (year)          filter.year = year;
  if (skills) {
    // Match any of the provided skills (broad search, not strict all-of)
    const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
    if (skillList.length) filter.skills = { $in: skillList };
  }

  // ── Step 4: Main query — explicit whitelist projection (belt + suspenders) ─
  // The schema already marks phone/email/enrollmentNo as select:false.
  // The explicit .select() below is a second safety layer — both must be
  // breached for PII to leak. Defense-in-depth.
  const raw = await User.find(filter)
    .select('name department year skills allowInvites')  // WHITELIST — no PII
    .populate<{
      department: { _id: mongoose.Types.ObjectId; code: string; name: string };
    }>('department', 'code name')
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = raw.length > limit;
  const page    = hasMore ? raw.slice(0, limit) : raw;
  const nextCursor = hasMore ? page[page.length - 1]?._id.toString() : undefined;

  // ── Step 5: Batch annotate isLooking (ONE extra query, O(n) total) ─────────
  // Only executed when the client passes eventId (always the case from UI).
  let lookingSet: Set<string> | null = null;

  if (eventId && mongoose.isValidObjectId(eventId)) {
    const userIds = page.map(u => u._id);
    const flags = await LookingFlag.find({
      eventId,
      userId: { $in: userIds },
    })
      .select('userId')
      .lean();
    lookingSet = new Set(flags.map(f => f.userId.toString()));
  }

  // ── Step 6: Shape results ─────────────────────────────────────────────────
  const items: PersonCard[] = page.map(u => {
    const dept = u.department as unknown as {
      _id: mongoose.Types.ObjectId;
      code: string;
      name: string;
    };

    const card: PersonCard = {
      id:           u._id.toString(),
      name:         u.name,
      department:   { id: dept._id.toString(), code: dept.code, name: dept.name },
      year:         u.year ?? undefined,
      skills:       u.skills,
      allowInvites: u.allowInvites,
    };

    // isLooking is only set when we have event context
    if (lookingSet !== null) {
      card.isLooking = lookingSet.has(u._id.toString());
    }

    return card;
  });

  return { items, nextCursor, hasMore };
}
