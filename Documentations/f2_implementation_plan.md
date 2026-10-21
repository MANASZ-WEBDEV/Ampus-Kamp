# F-2: Event Feed & Management — Implementation Plan
### Amazon SDE Design Document · October 2026

> **Status:** Ready to implement. All F-1 dependencies confirmed present.
> **No code touches until this plan is reviewed and approved.**

---

## 0. What F-2 Is (One-Paragraph Charter)

Faculty post events (hackathons, workshops, competitions…). Students see a paginated, filterable, deadline-sorted feed. Each event goes through a state machine: `draft → published → closed → archived`. A nightly cron auto-closes events whose deadline has passed. Counters on each event card (students registered, teams registered) are denormalized for fast rendering. Bookmarks are stored per-user. `rawMessage` (the pasted faculty text) is **never** returned to students.

F-3 (AI extraction) will mount its endpoint *inside* this module, so the event schema and routes must leave a clean hook for it.

---

## 1. SDE Suggestions (Changes vs. Spec)

| # | Suggestion | Rationale | Decision |
|---|-----------|-----------|---------|
| 1 | **Deadline-based cursor sort instead of `_id`** | Feed sorted by `deadline ASC` is what students care about. Pure `_id` cursor gives newest-created, not soonest-closing. Use compound cursor `(deadline, _id)` for stability. | ✅ Accept |
| 2 | **`deletedAt` soft-delete** | Spec says `archived` is the final state. But accidental publishes happen. Add a `deletedAt?: Date` field. A `DELETE /events/:id` sets `deletedAt = now` and only admin can see deleted events. State machine: `draft|published → deleted` (reversible by admin). No data loss. | ✅ Accept |
| 3 | **Bookmark as sub-document array on User** | Spec doesn't define bookmark storage. Options: (a) Set on `User.bookmarkedEvents[]`, (b) separate `Bookmark` collection. Choice: separate collection — keeps `User` lean, allows counting bookmarks per event in future. | ✅ Separate collection |
| 4 | **`node-cache` invalidation on publish** | Event feed is the hottest endpoint. Add a 60-second in-memory cache (already in `package.json`). Invalidate the cache key on `PATCH /publish` and `PATCH /close`. | ✅ Accept |
| 5 | **Ownership check as a shared service helper** | Both `PUT /events/:id` and `PATCH /events/:id/publish` need the same "owner or admin" check. Extract to `assertOwnerOrAdmin(event, actor)` in service — one place, one test. | ✅ Accept |
| 6 | **`registrationDeadline` defaults to `deadline`** | If faculty don't set a separate registration cutoff, default it to the event deadline on create. Less manual work. | ✅ Accept |

---

## 2. Data Model

### 2.1 `Event` collection (`src/models/event.model.ts`)

```ts
interface IEvent {
  _id: Types.ObjectId;
  title: string;
  type: 'hackathon' | 'competition' | 'sports' | 'workshop' | 'seminar' | 'other';
  organizer?: string;
  deadline?: Date;
  eventDate?: Date;
  eligibility: {
    branches: string[];   // [] = open to all
    years: number[];      // [] = open to all
    notes?: string;
  };
  teamSize: { min: number; max: number };
  fee?: string;
  link?: string;
  summary?: string;
  registrationMode: 'in_app' | 'external';
  registrationDeadline?: Date;          // defaults to deadline on create
  counters: { students: number; teams: number; tracking: number };
  rawMessage?: string;                  // original pasted text — NEVER to students
  extraction?: {
    model?: string;
    promptVersion?: string;             // incremented when prompt changes
    editedFields: string[];             // which fields faculty changed
    usedFallback: boolean;
  };
  postedBy: Types.ObjectId;             // ref → User
  status: 'draft' | 'published' | 'closed' | 'archived';
  deletedAt?: Date;                     // soft-delete (SDE suggestion #2)
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
```
{ status: 1, deadline: 1 }             // feed query
{ type: 1, deadline: 1 }              // type filter
{ postedBy: 1, createdAt: -1 }        // "my events" for faculty
{ deletedAt: 1 }  sparse              // admin deleted-events view
```

### 2.2 `Bookmark` collection (`src/models/bookmark.model.ts`)

```ts
interface IBookmark {
  userId: Types.ObjectId;    // ref → User
  eventId: Types.ObjectId;  // ref → Event
  createdAt: Date;
}
// Unique: { userId, eventId }
// Index:  { userId, createdAt: -1 }  → fast "my bookmarks" list
```

---

## 3. API Contract

All routes prefixed `/api/v1/`.

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| `GET` | `/events` | ✅ | student+ | Paginated feed (published only for students) |
| `GET` | `/events/:id` | ✅ | student+ | Event detail |
| `POST` | `/events` | ✅ | faculty+ | Create draft |
| `PUT` | `/events/:id` | ✅ | faculty+ | Edit (owner or admin only) |
| `PATCH` | `/events/:id/publish` | ✅ | faculty+ | Publish draft → published |
| `PATCH` | `/events/:id/close` | ✅ | faculty+ | Close published → closed |
| `DELETE` | `/events/:id` | ✅ | faculty+ | Soft-delete (sets `deletedAt`) |
| `POST` | `/events/:id/bookmark` | ✅ | student | Toggle bookmark (add or remove) |
| `GET` | `/events/my` | ✅ | faculty+ | Own events list |

**Not in F-2 (reserved for F-3):**
```
POST /events/extract   ← F-3 mounts here
```

### 3.1 Feed Query Params

```
GET /events?type=hackathon,competition
           &branch=CSE,IT
           &year=2,3
           &cursor=<compound_cursor>
           &limit=20
```

- `type` → comma-separated enum values
- `branch` → matches `eligibility.branches` (if empty on event = open to all)
- `year` → matches `eligibility.years` (if empty on event = open to all)
- `cursor` → base64-encoded `{ deadline: ISO, _id: hex }` (compound sort)
- Students **always** get `status: published` — server-enforced, never a query param
- Faculty/admin can optionally pass `status=draft,published,closed` to see own drafts

### 3.2 Response Shapes

```ts
// Event card (feed)
{
  id, title, type, organizer, deadline, eventDate,
  eligibility, teamSize, fee, link, summary,
  registrationMode, registrationDeadline,
  counters, status,
  postedBy: { id, name },
  isBookmarked: boolean   // injected per-user
  // rawMessage: NEVER here
}

// Event detail (same + bookmark field)
// For faculty/admin who own the event: rawMessage included

// Create/edit body
{
  title: string          (required)
  type: EventType        (required)
  organizer?: string
  deadline?: string      (ISO8601)
  eventDate?: string
  eligibility?: { branches?, years?, notes? }
  teamSize?: { min?, max? }
  fee?: string
  link?: string          (validated: must be http/https URL if provided)
  summary?: string       (max 200 chars)
  registrationMode?: 'in_app' | 'external'
  registrationDeadline?: string
}
```

---

## 4. Business Rules (Server Enforced)

| Rule | Where enforced |
|------|---------------|
| Students see **only** `status: published` | `event.service.listEvents()` always appends status filter for student role |
| `postedBy` from `req.user.id` — never body | Service: `postedBy = actor.id` |
| `rawMessage` never in student response | Service projection excludes it for `role: student` |
| Edit/publish/close/delete: owner **or** admin only | `assertOwnerOrAdmin(event, actor)` helper |
| `registrationDeadline` defaults to `deadline` if not set | Service on create |
| Publish: event must be in `draft` state | Service validates state transition |
| Close: event must be in `published` state | Service validates state transition |
| Cron closes `published` events where `deadline < now` | `jobs/closeEvents.ts` daily at 00:05 |
| Soft-delete: any non-deleted event can be deleted by owner/admin | Sets `deletedAt`, status → unchanged (can recover) |
| All feed queries always filter `{ deletedAt: { $exists: false } }` | Base filter in service |

---

## 5. File Build Order

We build in strict layers — never skip ahead.

```
Step 1  src/models/event.model.ts          ← data shape
Step 2  src/models/bookmark.model.ts       ← data shape
Step 3  src/modules/events/event.schema.ts ← Zod I/O contracts
Step 4  src/modules/events/event.service.ts← all business logic
Step 5  src/modules/events/event.controller.ts ← thin HTTP adapter
Step 6  src/modules/events/event.routes.ts ← wiring + middleware
Step 7  src/jobs/closeEvents.ts            ← cron job
Step 8  src/server.ts (update)            ← register cron at startup
Step 9  src/routes.ts (update)            ← mount eventsRouter
Step 10 scripts/seed-events.ts            ← 10 seed events for testing
Step 11 src/modules/events/event.test.ts  ← integration tests
```

---

## 6. Detailed File Specs

### Step 1 — `event.model.ts`
- Full schema as in §2.1 above
- All 4 indexes
- Export `Event` model and `IEvent` interface
- Export `EventType`, `EventStatus` type unions

### Step 2 — `bookmark.model.ts`
- Schema as in §2.2
- Export `Bookmark` model and `IBookmark` interface

### Step 3 — `event.schema.ts` (Zod)
```ts
// createEventSchema   ← POST /events body
// updateEventSchema   ← PUT /events/:id body (all fields optional)
// listEventsSchema    ← GET /events query params
// eventIdSchema       ← path param :id (24-char hex)
```
- `deadline` / `eventDate` / `registrationDeadline` → `z.coerce.date().optional()`
- `link` → `z.string().url().optional()` or omitted if empty string
- `type` → `z.enum([...6 values...])`
- `eligibility.years` → `z.array(z.number().int().min(1).max(5)).optional()`

### Step 4 — `event.service.ts`
Functions:
```ts
listEvents(actor, query)         → CursorPageResult<EventCard>
getEventById(actor, id)          → EventDetail
createEvent(actor, body)         → EventDetail
updateEvent(actor, id, body)     → EventDetail
publishEvent(actor, id)          → EventDetail
closeEvent(actor, id)            → EventDetail
deleteEvent(actor, id)           → void
toggleBookmark(actor, eventId)   → { bookmarked: boolean }
getMyEvents(actor, query)        → CursorPageResult<EventCard>

// private helpers
assertOwnerOrAdmin(event, actor): void   // throws ForbiddenError
injectBookmarks(userId, events)          // batches bookmark lookup
buildFeedFilter(actor, query)            // constructs MongoDB filter
```

**Compound cursor approach** (deadline-based sort):
```ts
// Cursor encodes { deadline: ISO, _id: hex }
// Sort: { deadline: 1, _id: 1 } for ascending (soonest first)
// Filter: { deadline: { $gte: cursor.deadline }, 
//            $or: [{ deadline: { $gt: cursor.deadline } },
//                  { _id: { $gt: cursor._id } }] }
```

### Step 5 — `event.controller.ts`
- One exported function per route
- Thin: parse `req.params`, call service, send `res.status(N).json({ data })`
- `asyncHandler<AuthRequest>` wrapper on every handler

### Step 6 — `event.routes.ts`
```ts
import { requireAuth } from '@/shared/middleware';
import { requireRole } from '@/shared/middleware';

eventsRouter.get('/',            requireAuth, ctrl.listEvents);
eventsRouter.get('/my',          requireAuth, requireRole(['faculty','dept_head','admin']), ctrl.getMyEvents);
eventsRouter.get('/:id',         requireAuth, ctrl.getEventById);
eventsRouter.post('/',           requireAuth, requireRole(['faculty','dept_head','admin']), validate(createEventSchema), ctrl.createEvent);
eventsRouter.put('/:id',         requireAuth, requireRole(['faculty','dept_head','admin']), validate(updateEventSchema), ctrl.updateEvent);
eventsRouter.patch('/:id/publish', requireAuth, requireRole(['faculty','dept_head','admin']), ctrl.publishEvent);
eventsRouter.patch('/:id/close',   requireAuth, requireRole(['faculty','dept_head','admin']), ctrl.closeEvent);
eventsRouter.delete('/:id',      requireAuth, requireRole(['faculty','dept_head','admin']), ctrl.deleteEvent);
eventsRouter.post('/:id/bookmark', requireAuth, requireRole(['student']), ctrl.toggleBookmark);
```

> **F-3 hook**: leave a comment `// POST /events/extract → mounted by F-3`

### Step 7 — `jobs/closeEvents.ts`
```ts
// Runs daily at 00:05
// Updates { status: 'published', deadline: { $lt: now }, deletedAt: { $exists: false } }
// → { $set: { status: 'closed' } }
// Logs count of events closed
// Invalidates feed cache
```

### Step 8 — `server.ts` update
Register cron job at startup after DB connection.

### Step 9 — `routes.ts` update
```ts
import { eventsRouter } from '@/modules/events/event.routes';
app.use('/api/v1/events', eventsRouter);
```

### Step 10 — `scripts/seed-events.ts`
Create 10 events:
- 2 hackathons (one closing in 3 days, one in 30 days)
- 2 competitions (one published, one draft)
- 1 sports event (closed — deadline in the past)
- 2 workshops (one CSE-only, one open-to-all)
- 1 seminar (external registration)
- 1 draft event (unpublished — to test student cannot see drafts)
- 1 archived event
Mix of `postedBy` = CSE faculty and CSIT faculty.

### Step 11 — `event.test.ts` (Supertest + mongodb-memory-server)

Test cases (following the F-1 pattern):
```
✅ GET /events → student sees only published, sorted by deadline
✅ GET /events?type=hackathon → correctly filtered
✅ GET /events?branch=CSE → CSE-eligible + open-to-all returned
✅ GET /events/:id → student cannot see rawMessage in response
✅ POST /events (faculty) → creates draft, returns 201
✅ POST /events (student) → 403
✅ PUT /events/:id (owner) → edits draft
✅ PUT /events/:id (non-owner faculty) → 403
✅ PATCH /events/:id/publish → draft → published
✅ PATCH /events/:id/publish (already published) → 409 Conflict
✅ PATCH /events/:id/close → published → closed
✅ DELETE /events/:id (owner) → soft-delete, 204
✅ GET /events (after soft-delete) → deleted event not in feed
✅ POST /events/:id/bookmark → toggles on/off
✅ GET /events (admin) → can see drafts with ?status=draft
✅ Cron function called manually → closes expired published events
```

---

## 7. Client-Side Structure

```
client/src/features/events/
  api/
    events.api.ts          ← TanStack Query functions (listEvents, getEvent, createEvent…)
  components/
    EventCard.tsx          ← card with title, type badge, deadline, counters, bookmark icon
    EventFilterBar.tsx     ← type chips + branch + year pills
    EventStatusBadge.tsx   ← 'Closing Soon' (red), 'Closed', 'Draft'
    BookmarkButton.tsx     ← filled/outline star, optimistic update
  hooks/
    useEvents.ts           ← useInfiniteQuery for feed pagination
    useEvent.ts            ← single event detail
    useCreateEvent.ts      ← mutation + cache invalidation
    useBookmark.ts         ← toggle mutation (optimistic)
  pages/
    EventFeedPage.tsx      ← /events
    EventDetailPage.tsx    ← /events/:id
    FacultyPostEventPage.tsx ← /events/new
    FacultyEditEventPage.tsx ← /events/:id/edit
    MyEventsPage.tsx       ← /events/my (faculty only)
  types.ts                 ← EventCard, EventDetail, EventType TS types
  index.ts                 ← barrel exports
```

**Pages to wire in router:**
```tsx
/events           → EventFeedPage      (ProtectedRoute, all roles)
/events/new       → FacultyPostEventPage (ProtectedRoute, requireRole faculty+)
/events/my        → MyEventsPage        (ProtectedRoute, requireRole faculty+)
/events/:id       → EventDetailPage    (ProtectedRoute, all roles)
/events/:id/edit  → FacultyEditEventPage (ProtectedRoute, requireRole faculty+)
```

**4 States for every page (per Master Reference §14.3):**
- **Loading:** skeleton cards (no layout shift)
- **Empty:** descriptive message + next action button
- **Error:** "Couldn't load events. Tap to retry."
- **Content:** the actual list

---

## 8. Acceptance Checklist (Sign-off before F-3)

### Backend
- [ ] `GET /events` returns only `published` events for students, sorted by deadline asc
- [ ] `?type=hackathon` filter works; multiple values comma-separated
- [ ] `?branch=CSE` returns CSE-eligible + open-to-all (empty `eligibility.branches`)
- [ ] `rawMessage` absent from any student response (assertion in test)
- [ ] `POST /events` (faculty) → 201 draft
- [ ] `POST /events` (student) → 403
- [ ] `PUT /events/:id` (non-owner faculty) → 403
- [ ] `PATCH /events/:id/publish` on already-published → 409
- [ ] `DELETE /events/:id` soft-deletes; event disappears from feed
- [ ] Cron function closes expired `published` events (manual test via seed)
- [ ] `POST /events/:id/bookmark` toggles; second call removes bookmark
- [ ] `tsc --noEmit` passes on events module

### Frontend
- [ ] Feed renders with skeleton while loading
- [ ] Empty state shows when no events match filters
- [ ] Filter chips update URL query and refetch
- [ ] Event card shows type badge, deadline countdown, counter pills
- [ ] Bookmark button is optimistic (no flicker)
- [ ] Faculty "Post Event" form validates before submit
- [ ] Faculty sees draft in `/events/my` but student cannot see it in `/events`
- [ ] Event detail page shows full info; faculty sees rawMessage in own events

---

## 9. Out of Scope for F-2

- AI extraction (`POST /events/extract`) → F-3
- Counters update on registration → F-6 (registrations module will do `$inc`)
- Deadline reminders / notifications → F-9
- Admin event management UI → F-10
- Calendar view → F-9 or F-10 (FR-S1)
