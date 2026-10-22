# F-4: Team Finder — Posts & Requests — Implementation Plan

## Overview

Path A of team formation:
1. Student creates a **TeamPost** under an event ("Looking for 2 frontend devs")
2. Another student sends a **join request** (TeamLink `direction:'request'`)
3. Post owner **accepts** → `spotsLeft` atomically decrements → phone revealed if `phoneVisible`
4. Owner **declines** → 30-day cool-down enforced before requester can try again

---

## New Files

### Server

| File | Purpose |
|------|---------|
| `src/models/teamPost.model.ts` | TeamPost mongoose model + indexes |
| `src/models/teamLink.model.ts` | TeamLink mongoose model + partial unique index |
| `src/modules/teams/team.schema.ts` | Zod schemas: create/update TeamPost |
| `src/modules/teams/team.service.ts` | Business logic: CRUD + spot decrement |
| `src/modules/teams/team.controller.ts` | Route handlers |
| `src/modules/teams/team.routes.ts` | Express router |
| `src/modules/links/link.schema.ts` | Zod schemas: create/respond TeamLink |
| `src/modules/links/link.service.ts` | Business logic: send, accept, decline, withdraw |
| `src/modules/links/link.controller.ts` | Route handlers |
| `src/modules/links/link.routes.ts` | Express router |
| `src/jobs/expireLinks.ts` | Cron: expire pending links > 7 days |
| `src/jobs/closeTeamPosts.ts` | Cron: close team posts at event deadline |

### Client

| File | Purpose |
|------|---------|
| `src/features/teams/types.ts` | TeamPost, TeamLink, request/response shapes |
| `src/features/teams/api/teams.api.ts` | API client functions |
| `src/features/teams/api/links.api.ts` | API client functions for links |
| `src/features/teams/hooks/useTeamPosts.ts` | TanStack Query: fetch team posts |
| `src/features/teams/hooks/useCreateTeamPost.ts` | Mutation: create post |
| `src/features/teams/hooks/useSendLink.ts` | Mutation: send join request |
| `src/features/teams/hooks/useRespondLink.ts` | Mutation: accept/decline/withdraw |
| `src/features/teams/hooks/useLinks.ts` | Query: inbox / sent |
| `src/features/teams/components/TeamPostCard.tsx` | Card: open · full · closed · expired |
| `src/features/teams/components/CreateTeamPostForm.tsx` | Form: roles, spots, description |
| `src/features/teams/components/RequestToJoinModal.tsx` | Modal: optional message + send |
| `src/features/teams/components/LinkCard.tsx` | Card: pending · accepted (contact) · declined · expired |
| `src/features/teams/pages/TeamPostsPage.tsx` | `/events/:id/teams` |
| `src/features/teams/pages/LinkInboxPage.tsx` | `/teams/inbox` (tabs: In / Sent) |
| `src/features/teams/index.ts` | Barrel exports |

### Modified Files

| File | Change |
|------|--------|
| `src/routes.ts` | Uncomment teams + links routers; bump version to `1.0.0-F4` |
| `src/server.ts` | Register `scheduleExpireLinks` + `scheduleCloseTeamPosts` |
| `client/src/app/router.tsx` | Add `/events/:id/teams` and `/teams/inbox` routes |

---

## Data Model Detail

### TeamPost
```ts
interface ITeamPost {
  _id: ObjectId;
  eventId: ObjectId;        // ref → Event (published, not deleted)
  ownerId: ObjectId;        // ref → User (student)
  title: string;            // ≤ 100 chars
  description?: string;     // ≤ 500 chars
  rolesNeeded: string[];    // e.g. ['Frontend', 'ML'] — ≤ 5 items, each ≤ 50 chars
  spotsTotal: number;       // 1–10
  spotsLeft: number;        // starts = spotsTotal; never goes below 0
  status: 'open' | 'full' | 'closed' | 'expired';
  expiresAt: Date;          // set to event.deadline at creation time
  createdAt: Date;
  updatedAt: Date;
}

// Indexes:
// { eventId: 1, status: 1 }          — feed per event
// { ownerId: 1, createdAt: -1 }      — my posts
// { expiresAt: 1 }                   — cron lookup
```

### TeamLink
```ts
interface ITeamLink {
  _id: ObjectId;
  direction: 'request' | 'invite' | 'connect';
  fromUserId: ObjectId;     // sender
  toUserId: ObjectId;       // recipient (for request: the post owner)
  eventId?: ObjectId;       // always set for request/invite
  teamPostId?: ObjectId;    // set for request; null for connect
  message?: string;         // ≤ 200 chars, plain text, no URLs (Zod refine)
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired';
  expiresAt: Date;          // createdAt + 7 days
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Indexes:
// { toUserId: 1, status: 1, createdAt: -1 }         — inbox (compound)
// { fromUserId: 1, status: 1, createdAt: -1 }       — sent
// { fromUserId: 1, toUserId: 1, eventId: 1 }        — unique partial: status='pending'
// { expiresAt: 1 }                                  — cron expire
```

> **Unique partial index** (one pending per pair per event):
> ```js
> { unique: true, partialFilterExpression: { status: 'pending' } }
> ```
> Mongo enforces this at the DB level — duplicate pending → 11000 error → 409 response.

---

## API Contract

### Teams

```
GET  /api/v1/events/:id/teams        student+    List open team posts for event
POST /api/v1/teams                   student     Create team post
PATCH /api/v1/teams/:id              student     Edit title/desc/roles (owner only) OR close
```

### Links

```
POST  /api/v1/links                  student     Send request (direction='request')
PATCH /api/v1/links/:id              student     Accept / decline (owner) | withdraw (sender)
GET   /api/v1/links?box=in|out       student     Inbox or sent list
```

---

## Critical Business Logic

### 1. Atomic spot decrement (concurrency-safe)
```ts
// In link.service.ts — accept handler
const result = await TeamPost.findOneAndUpdate(
  { _id: link.teamPostId, spotsLeft: { $gt: 0 } },  // guard: spots available
  { $inc: { spotsLeft: -1 } },
  { new: true }
);
if (!result) throw new ConflictError('No spots left — team is full.');
if (result.spotsLeft === 0) {
  await TeamPost.findByIdAndUpdate(result._id, { $set: { status: 'full' } });
}
```
This is a single atomic MongoDB `findOneAndUpdate` — concurrent accepts cannot both succeed.

### 2. Contact reveal rule
```ts
// In link.service.ts — shape link response
function shapeLink(link: ITeamLink, toUser: IUser) {
  const base = { id, direction, status, message, createdAt, ... };
  if (link.status === 'accepted' && toUser.phoneVisible) {
    return { ...base, contact: { phone: toUser.phone } };  // toUser fetched with select('+phone')
  }
  if (link.status === 'accepted') {
    return { ...base, contact: { hint: 'Ask the leader to share a WhatsApp group link.' } };
  }
  return base;  // phone absent for pending / declined / expired / withdrawn
}
```

### 3. Daily link limit
```ts
const today = new Date(); today.setUTCHours(0, 0, 0, 0);
const count = await TeamLink.countDocuments({
  fromUserId: actor.id,
  direction: { $in: ['invite', 'connect'] },
  createdAt: { $gte: today },
});
const limit = await getSetting<number>('linksPerDay', 10);
if (count >= limit) throw new RateLimitError(`Daily link limit of ${limit} reached.`);
```
> Note: join **requests** (direction='request') do NOT count against the daily limit per the spec. Only invites and connects do.

### 4. Decline cool-down (30 days)
```ts
const cooldown = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const blocked = await TeamLink.findOne({
  fromUserId: actor.id,
  toUserId: post.ownerId,
  eventId: link.eventId,
  status: 'declined',
  respondedAt: { $gte: cooldown },
});
if (blocked) throw new RateLimitError('You were declined by this owner within the last 30 days.');
```

### 5. Block check (before any link)
```ts
const isBlocked = await Block.findOne({
  $or: [
    { userId: actor.id,    blockedUserId: toUserId },
    { userId: toUserId,    blockedUserId: actor.id },
  ],
});
if (isBlocked) throw new ForbiddenError('Action not allowed.');
```
> `Block` model will be created in F-5. For F-4 we create the check stub using a `try/require` pattern — if Block collection doesn't exist yet the query returns null (no error).

---

## Cron Jobs

### `expireLinks.ts` — daily at 00:10
```ts
// Set status='expired' on all pending links past expiresAt
await TeamLink.updateMany(
  { status: 'pending', expiresAt: { $lt: new Date() } },
  { $set: { status: 'expired' } }
);
```

### `closeTeamPosts.ts` — daily at 00:15
```ts
// Close open/full team posts whose event deadline has passed
const expiredEvents = await Event.find({
  deadline: { $lt: new Date() },
  deletedAt: { $exists: false }
}).select('_id');

await TeamPost.updateMany(
  { eventId: { $in: expiredEvents.map(e => e._id) }, status: { $in: ['open', 'full'] } },
  { $set: { status: 'expired' } }
);
```

---

## Client Architecture

### Feature folder: `src/features/teams/`
Mirrors the `events` feature structure.

### Key UI states

**TeamPostCard:**
- `open` — green badge, "Request to Join" button
- `full` — amber badge "Full", button disabled
- `closed` / `expired` — grey badge, no action

**LinkCard:**
- `pending` — "Waiting…" with withdraw button (for sent) / accept+decline buttons (for inbox)
- `accepted` — green "Accepted" + contact block (phone or hint)
- `declined` — red "Declined"
- `expired` / `withdrawn` — grey

**LinkInboxPage:**
- Two tabs: **Incoming** (requests I received) / **Sent** (requests I sent)
- Each tab uses `useLinks({ box: 'in' | 'out' })`

---

## Build Order (server → client)

1. `teamPost.model.ts` — model + indexes
2. `teamLink.model.ts` — model + partial unique index
3. `team.schema.ts` — Zod create/update schemas
4. `link.schema.ts` — Zod send/respond schemas
5. `team.service.ts` — CRUD service
6. `link.service.ts` — send, accept, decline, withdraw (with all business rules)
7. `team.controller.ts` + `team.routes.ts`
8. `link.controller.ts` + `link.routes.ts`
9. `expireLinks.ts` + `closeTeamPosts.ts` cron jobs
10. Wire into `routes.ts` + `server.ts`
11. Client types + API clients + hooks
12. `TeamPostCard` + `CreateTeamPostForm` + `RequestToJoinModal`
13. `LinkCard`
14. `TeamPostsPage` + `LinkInboxPage`
15. Router update

---

## Acceptance Criteria

| Criterion | How verified |
|-----------|-------------|
| Create post → request → accept → spot decrements → contact revealed | End-to-end flow test |
| Concurrent accepts: only one wins | Two simultaneous PATCH requests |
| 11th link (invite/connect) → 429 | Daily limit test |
| Duplicate pending pair/event → 409 | Duplicate POST /links |
| Decline cool-down (resend within 30d) → 429 | Same pair, declined + immediate retry |
| `phone` absent from non-accepted responses | Field projection check |
| Expired links auto-set by cron | Manually set `expiresAt` to past, run cron |
| Team posts closed at event deadline | Manually expire event, run cron |

---

## Security Checklist

- [ ] `phone` only returned when `status === 'accepted' && toUser.phoneVisible`
- [ ] `spotsLeft` decrement uses `{ $gt: 0 }` guard — no race condition
- [ ] Block collection queried before every link creation
- [ ] Owner check on TeamPost edit/close (cannot edit other's posts)
- [ ] Daily limit read from `Setting.linksPerDay` — not hard-coded
- [ ] `toUserId` user fetched with `select('+phone')` only in accept path
