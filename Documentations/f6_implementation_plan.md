# F-6: Event Registration — Implementation Plan

## What F-6 adds

| Capability | Details |
|---|---|
| Individual in-app registration | Single student registers; `Event.counters.students` increments atomically |
| Team in-app registration | Leader creates team, invites members; members confirm/decline; counter tracks confirmed |
| External tracking | Student marks "I registered externally" via link — stored for faculty visibility |
| Faculty roster | Paginated list of all registrations + CSV export |
| Auto-lock cron | Registrations locked at `registrationDeadline` |

---

## Data Model

```ts
interface IMember {
  userId: ObjectId;   // ref → User
  status: 'invited' | 'confirmed' | 'declined';
  respondedAt?: Date;
}

interface IRegistration {
  _id:        ObjectId;
  eventId:    ObjectId;               // ref → Event
  type:       'individual' | 'team' | 'tracking';
  teamName?:  string;                 // ≤ 60 chars; required for type='team'
  leaderId:   ObjectId;               // ref → User (always the creator)
  members:    IMember[];              // includes leader as first 'confirmed' member
  externalRegId?: string;             // for type='tracking'
  status: 'draft' | 'submitted' | 'withdrawn' | 'locked';
  submittedAt?: Date;
  createdAt:  Date;
  updatedAt:  Date;
}
```

### Indexes
```
// ONE active registration per student per event:
// Partial unique on members.userId × eventId where status IN [draft, submitted, locked]
{ 'members.userId': 1, eventId: 1 }
  partialFilterExpression: { status: { $in: ['draft','submitted','locked'] } }

// Faculty roster query (eventId + status sort)
{ eventId: 1, status: 1, createdAt: -1 }

// Leader's own registration
{ leaderId: 1, eventId: 1 }
```

---

## API Contract

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/events/:id/registrations` | student | Create individual / team draft |
| `PATCH` | `/api/v1/registrations/:id` | student | Edit teamName/members; submit; withdraw |
| `PATCH` | `/api/v1/registrations/:id/members/:uid` | student | Confirm or decline (member only) |
| `GET` | `/api/v1/registrations/mine` | student | Own registration for context |
| `GET` | `/api/v1/events/:id/registrations` | faculty+ | Full roster |
| `GET` | `/api/v1/events/:id/registrations/export` | faculty+ | CSV download |
| `POST` | `/api/v1/events/:id/tracking` | student | Mark external registration |

---

## Critical Business Logic

### 1. One active registration per student (partial unique index)
The partial index on `{ members.userId, eventId }` where `status IN [draft,submitted,locked]`
prevents any student from being an active member of two registrations for the same event
**at the database level** — Mongo returns code 11000 → 409.
`withdrawn` registrations do not participate, so a student can re-register after withdrawing.

### 2. Atomic Event.counters update (MongoDB session)
```ts
// registration.service.ts — submitRegistration
const session = await mongoose.startSession();
try {
  await session.withTransaction(async () => {
    // 1. Mark registration submitted
    await Registration.findByIdAndUpdate(id, { status: 'submitted', submittedAt: new Date() }, { session });
    // 2. Count confirmed members
    const confirmed = reg.members.filter(m => m.status === 'confirmed').length;
    // 3. Atomic increment
    await Event.findByIdAndUpdate(reg.eventId, { $inc: { 'counters.students': confirmed } }, { session });
  });
} finally {
  session.endSession();
}
```
Counter is only incremented on submit — not on member confirmation (avoids double-count).

### 3. Member consent flow
```
Leader creates team → members added as status:'invited'
→ Each invited member receives notification (stub for F-9)
→ Member calls PATCH /registrations/:id/members/:uid { action: 'confirm' | 'decline' }
→ Only that specific member (uid === req.user.id) can respond
→ Decline → member removed from members[]; spot freed; leader notified
→ Leader can add replacement member (up to teamSize.max)
→ Submit validates that confirmed count is within [teamSize.min, teamSize.max]
```

### 4. Submit validation
```ts
// registration.service.ts — submitRegistration
const event = await Event.findById(reg.eventId).select('teamSize registrationDeadline status').lean();
if (event.status === 'closed') throw new ForbiddenError('Event is closed.');
if (event.registrationDeadline && new Date() > event.registrationDeadline)
  throw new ForbiddenError('Registration deadline has passed.');

if (reg.type === 'team') {
  const confirmed = reg.members.filter(m => m.status === 'confirmed').length;
  const { min, max } = event.teamSize ?? { min: 1, max: 10 };
  if (confirmed < min) throw new ValidationError(`Need at least ${min} confirmed members.`);
  if (confirmed > max) throw new ValidationError(`Max team size is ${max}.`);
}
```

### 5. CSV export (faculty only)
```
Fields: regId, teamName, leaderName, leaderEmail, members (pipe-separated),
        status, submittedAt, eventTitle
Streaming: res.setHeader('Content-Disposition', 'attachment; filename=roster.csv')
           Cursor-based iteration with .cursor() to avoid loading all docs in memory
```

### 6. lockRegistrations cron (00:15 daily)
```ts
// Mark all submitted registrations as 'locked' when registrationDeadline has passed
await Registration.updateMany(
  { status: 'submitted', eventId: { $in: expiredEventIds } },
  { $set: { status: 'locked' } },
);
// expiredEventIds = events where registrationDeadline < now
// Fetched via Event.find({ registrationDeadline: { $lt: now } }).select('_id')
```

---

## New Files

### Server

| File | Purpose |
|------|---------|
| `src/models/registration.model.ts` | Registration + Member subdoc; all indexes |
| `src/modules/registrations/registration.schema.ts` | Zod: create, update, member-respond, tracking |
| `src/modules/registrations/registration.service.ts` | All business logic + session-based atomic counter |
| `src/modules/registrations/registration.controller.ts` | Route handlers |
| `src/modules/registrations/registration.routes.ts` | `/registrations/*` router |
| `src/jobs/lockRegistrations.ts` | Cron 00:15 — lock submitted registrations |

### Modified (Server)

| File | Change |
|------|--------|
| `src/modules/events/event.routes.ts` | Add `POST /:id/registrations`, `GET /:id/registrations`, `GET /:id/registrations/export`, `POST /:id/tracking` |
| `src/routes.ts` | Mount registrationsRouter; bump to `1.0.0-F6` |
| `src/server.ts` | Register `scheduleLockRegistrations()` cron |

### Client

| File | Purpose |
|------|---------|
| `src/features/registrations/types.ts` | Registration, Member, RegistrationStatus types |
| `src/features/registrations/api/registrations.api.ts` | All API calls |
| `src/features/registrations/hooks/useRegistration.ts` | TanStack Query hooks |
| `src/features/registrations/components/RegisterButton.tsx` | Context-aware CTA (solo/team/external) |
| `src/features/registrations/components/TeamRegistrationForm.tsx` | Multi-step: name → members → review → submit |
| `src/features/registrations/components/MemberConfirmBanner.tsx` | Banner + actions for pending member invites |
| `src/features/registrations/components/RegistrationStatusCard.tsx` | Status + members + team name display |
| `src/features/registrations/pages/FacultyRosterPage.tsx` | `/events/:id/roster` — table + CSV button |
| `src/features/registrations/index.ts` | Barrel exports |

### Modified (Client)

| File | Change |
|------|--------|
| `EventDetailPage.tsx` | Replace CTA placeholder with `<RegisterButton>` + `<RegistrationStatusCard>` |
| `router.tsx` | Add `/events/:id/roster` route |

---

## SDE3 Design Decisions

### Decision 1: Partial unique index (not application-level dedup)
The `members.userId × eventId` partial index with `status IN [draft,submitted,locked]` catches
duplicate registration attempts at the MongoDB layer — not in service code. This handles
concurrent POST requests from the same student without any locking at the app layer.

### Decision 2: MongoDB session for counter atomicity (not eventual consistency)
`Event.counters.students` is incremented inside a `withTransaction` session alongside
the registration status update. This guarantees the counter is always consistent with
the actual number of submitted confirmed members — no background reconciliation job needed.

### Decision 3: Members start as 'invited' — not 'confirmed'
A leader cannot add members without their consent. Members are always `invited` first.
The system stores them in `members[]` but does not count them toward `counters.students`
until they confirm AND the registration is submitted.

### Decision 4: registrationDeadline vs eventDate
`registrationDeadline` (when registrations lock) is separate from `eventDate` (when the
event happens). The Event model already has both. The cron uses `registrationDeadline`.

---

## Build Order

1. `registration.model.ts`
2. `registration.schema.ts`
3. `registration.service.ts`
4. `registration.controller.ts` + `registration.routes.ts`
5. `lockRegistrations.ts` cron
6. Extend `event.routes.ts` (registration sub-routes)
7. Wire `routes.ts` + `server.ts`; bump to `1.0.0-F6`
8. Client: `types.ts` + `registrations.api.ts` + `useRegistration.ts`
9. `RegisterButton` + `RegistrationStatusCard` + `MemberConfirmBanner`
10. `TeamRegistrationForm`
11. `FacultyRosterPage`
12. Wire `EventDetailPage` + `router.tsx`

---

## Acceptance Criteria

| Criterion | Verification |
|-----------|-------------|
| Individual registration → `counters.students` increments | POST + GET event |
| Team: members confirm → submit → counter = confirmed count | End-to-end flow |
| Declined member removed; can register on another team | Decline + new POST |
| Duplicate active registration → 409 | POST twice |
| Team size violation on submit → 422 | Submit with wrong member count |
| `locked` status rejects all edits → 409 | Lock then PATCH |
| Faculty roster shows all teams | GET /events/:id/registrations |
| CSV export is valid (all fields, correct MIME) | Download + parse |
| Cron locks submitted regs at deadline | Set deadline in past, run cron |
