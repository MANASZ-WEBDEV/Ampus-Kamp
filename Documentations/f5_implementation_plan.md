# F-5: Invites, Connect & People Search — Implementation Plan

## What F-5 adds on top of F-4

| F-4 (done) | F-5 (this feature) |
|---|---|
| Path A — join a team post | **Path B** — leader invites from people search |
| | **Path C** — direct connect to any student |
| | People search (skills / branch / year) |
| | "I'm looking for a team" flag |
| | Block (full API + cascade) |
| | Report (safety queue for admin) |

`TeamLink` is **reused** — no new collection. F-5 just enables
`direction:'invite'` and `direction:'connect'`, which were already
wired through `link.service.ts` (daily limit, block check, cool-down
all apply via the same code path built in F-4).

---

## New Files

### Server

| File | Purpose |
|------|---------|
| `src/models/lookingFlag.model.ts` | LookingFlag mongoose model |
| `src/models/report.model.ts` | Report mongoose model |
| `src/modules/looking/looking.schema.ts` | Zod schemas: upsert looking flag |
| `src/modules/looking/looking.service.ts` | Toggle flag, list per event |
| `src/modules/looking/looking.controller.ts` | Route handlers |
| `src/modules/looking/looking.routes.ts` | Mounted on eventsRouter |
| `src/modules/safety/safety.schema.ts` | Zod schemas: block, report |
| `src/modules/safety/safety.service.ts` | Block (+ cascade), report |
| `src/modules/safety/safety.controller.ts` | Route handlers |
| `src/modules/safety/safety.routes.ts` | `/blocks`, `/reports` |
| `src/modules/people/people.schema.ts` | Zod query schema for people search |
| `src/modules/people/people.service.ts` | Filtered user search (zero PII) |
| `src/modules/people/people.controller.ts` | Route handler |
| `src/modules/people/people.routes.ts` | `/people` |

### Client

| File | Purpose |
|------|---------|
| `src/features/teams/types.ts` | Extend: LookingFlag, Person, BlockInput, ReportInput |
| `src/features/teams/api/people.api.ts` | API: search people, toggle looking, block, report |
| `src/features/teams/hooks/usePeople.ts` | Hooks: usePeopleSearch, useLooking, useBlock, useReport |
| `src/features/teams/components/StudentCard.tsx` | Person card: skills, Invite / Connect buttons |
| `src/features/teams/components/LookingToggle.tsx` | Toggle on EventDetailPage |
| `src/features/teams/components/BlockReportMenu.tsx` | Bottom-sheet on LinkCard |
| `src/features/teams/pages/PeopleSearchPage.tsx` | `/teams/people` |
| `src/features/teams/pages/LookingListPage.tsx` | `/events/:id/looking` |

### Modified Files

| File | Change |
|------|--------|
| `src/routes.ts` | Mount people, safety routes; bump to `1.0.0-F5` |
| `src/modules/events/event.routes.ts` | Add looking routes (`/:id/looking`) |
| `src/jobs/closeTeamPosts.ts` | Also clear LookingFlags for expired events |
| `src/modules/links/link.service.ts` | Add `allowInvites` check for invite/connect |
| `client/src/features/events/pages/EventDetailPage.tsx` | Add `LookingToggle` + "Looking" list link |
| `client/src/features/teams/components/LinkCard.tsx` | Add `BlockReportMenu` |
| `client/src/app/router.tsx` | Add `/teams/people`, `/events/:id/looking` |

---

## Data Models

### LookingFlag
```ts
interface ILookingFlag {
  _id:     ObjectId;
  userId:  ObjectId;   // ref → User
  eventId: ObjectId;   // ref → Event
  note?:   string;     // ≤ 120 chars, plain text — visible to other students
  createdAt: Date;
  updatedAt: Date;
}
// Unique: { userId, eventId }   — one flag per student per event
// Index:  { eventId: 1 }        — list all students looking for an event
```

### Report
```ts
interface IReport {
  _id:           ObjectId;
  reporterId:    ObjectId;         // ref → User
  targetUserId?: ObjectId;         // who is being reported
  linkId?:       ObjectId;         // the offending link (if any)
  reason:        string;           // ≤ 500 chars
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
}
// Index: { status: 1, createdAt: -1 } — admin queue
```

### Block (already created in F-4)
Full API now added: `POST /blocks`, `DELETE /blocks/:blockedUserId`, `GET /blocks`.

---

## API Contract

### People Search
```
GET  /api/v1/people?skills=react,ml&branch=CSE&year=2&limit=20&cursor=...
Auth: student+
Response: [{ id, name, branch, year, skills, allowInvites, isLooking }]
NEVER: phone, email, enrollmentNo, passwordHash
```

### Looking Flag
```
PUT  /api/v1/events/:id/looking    student  — toggle (upsert / delete)
GET  /api/v1/events/:id/looking    student+ — list students looking
```

### Block
```
POST   /api/v1/blocks                        { blockedUserId }
DELETE /api/v1/blocks/:blockedUserId
GET    /api/v1/blocks                        my block list
```

### Report
```
POST /api/v1/reports   { targetUserId?, linkId?, reason }
```

### Links (Path B & C — already working from F-4)
```
POST /api/v1/links  { direction: 'invite', toUserId, eventId, message? }
POST /api/v1/links  { direction: 'connect', toUserId, message? }
```
No new endpoints — link.service already handles invite and connect
with all guards (block, allowInvites, daily limit, cool-down).

---

## Critical Business Logic

### 1. People search — zero PII projection
```ts
// people.service.ts
const users = await User.find(filter)
  .select('name department year skills phoneVisible allowInvites')
  // NEVER: phone, email, enrollmentNo, passwordHash
  .populate('department', 'code name')
  .lean();
```
`phone`, `email`, `enrollmentNo` are always `select:false` on the schema —
they cannot accidentally leak through `.lean()`.
An explicit `.select()` whitelist is the belt-and-suspenders layer.

### 2. allowInvites enforcement (add to link.service.sendLink)
```ts
if (body.direction === 'invite' || body.direction === 'connect') {
  const target = await User.findById(toUserId).select('allowInvites').lean();
  if (!target?.allowInvites) throw new ForbiddenError('This user is not accepting invites.');
}
```

### 3. Block cascade — delete pending links
```ts
// safety.service.ts — createBlock()
await Block.create({ userId: actor.id, blockedUserId });

// Delete ALL pending links between the pair (both directions)
await TeamLink.deleteMany({
  status: 'pending',
  $or: [
    { fromUserId: actor.id,      toUserId: blockedUserId },
    { fromUserId: blockedUserId, toUserId: actor.id },
  ],
});
```

### 4. Looking flag toggle (upsert / delete)
```ts
// looking.service.ts
const existing = await LookingFlag.findOne({ userId, eventId });
if (existing) {
  await existing.deleteOne();
  return { isLooking: false };
} else {
  await LookingFlag.create({ userId, eventId, note: body.note });
  return { isLooking: true };
}
```

### 5. Clear looking flags when event closes (extend closeTeamPosts.ts)
```ts
// Collect eventIds that are being expired, then clear their flags
await LookingFlag.deleteMany({ eventId: { $in: expiredEventIds } });
```

---

## People Search Filter Logic
```ts
// Filter composition in people.service.ts
const filter: FilterQuery<IUser> = {
  role:   'student',
  status: 'active',
  _id:    { $ne: actor.id },  // exclude self
};
if (skills) filter.skills = { $in: skills.split(',').map(s => s.trim()) };
if (branch) filter.department = <deptId from Dept.findOne({ code: branch })>;
if (year)   filter.year = Number(year);
if (cursor) filter._id = { $lt: new Types.ObjectId(cursor) };
```
`isLooking` annotated by cross-referencing LookingFlag (one extra query per page).

---

## Security Checklist

- [ ] `phone`, `email`, `enrollmentNo` never in `/people` response
- [ ] `allowInvites:false` enforced in `link.service.sendLink` server-side
- [ ] Block cascade: all pending links deleted in `safety.service`
- [ ] Reporter identity stored but never exposed to the reported user
- [ ] Self-block prevented (`userId !== blockedUserId`)
- [ ] People search excludes suspended users (`status:'active'`)

---

## Build Order

1. `lookingFlag.model.ts` + `report.model.ts`
2. `looking.schema.ts` + `safety.schema.ts` + `people.schema.ts`
3. `looking.service.ts`
4. `safety.service.ts` (block + cascade + report)
5. `people.service.ts`
6. Controllers + routes (looking, safety, people)
7. Extend `link.service.ts` — add `allowInvites` check
8. Extend `closeTeamPosts.ts` — clear LookingFlags on expiry
9. Wire into `routes.ts` + `event.routes.ts`; bump to `1.0.0-F5`
10. Client: extend types + new API client + hooks
11. `StudentCard` + `LookingToggle` + `BlockReportMenu`
12. `PeopleSearchPage` + `LookingListPage`
13. Router + EventDetailPage + LinkCard updates

---

## Acceptance Criteria

| Criterion | How verified |
|-----------|-------------|
| People search returns zero contact fields | Response shape check |
| `allowInvites:false` → 403 on invite | Set flag, POST /links → 403 |
| Block cascade: pending links deleted | Block with 2 pending links → both gone |
| Looking flag toggles | PUT twice → set then clear |
| Looking list shows flagged students | GET /events/:id/looking |
| Invite accepted → contact reveal (same as Path A) | End-to-end flow |
| Report stored in admin queue | POST /reports → status='pending' in DB |
