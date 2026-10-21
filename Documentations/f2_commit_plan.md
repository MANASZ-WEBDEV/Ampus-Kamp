# F-2: Event Feed & Management — Commit Plan
### Ready to execute · DO NOT run until user approves

> **Branch:** `main` (or feature branch if preferred)  
> **Last committed SHA:** `933d554` — fix(seed): resolve type mismatch in seed-faculty.ts  
> **Total uncommitted F-2 files:** 25+ files across backend + frontend

---

## F2 Completion Audit

### ✅ Backend — All Steps Complete

| F2 Step | File | Status |
|---------|------|--------|
| Step 1 | `server/src/models/event.model.ts` | ✅ Present |
| Step 2 | `server/src/models/bookmark.model.ts` | ✅ Present |
| Step 3 | `server/src/modules/events/event.schema.ts` | ✅ Present |
| Step 4 | `server/src/modules/events/event.service.ts` | ✅ Present |
| Step 5 | `server/src/modules/events/event.controller.ts` | ✅ Present |
| Step 6 | `server/src/modules/events/event.routes.ts` | ✅ Present |
| Step 7 | `server/src/jobs/closeEvents.ts` | ✅ Present |
| Step 8 | `server/src/server.ts` (cron registered) | ✅ Modified |
| Step 9 | `server/src/routes.ts` (events router mounted) | ✅ Modified |
| Step 10 | `server/scripts/seed-events.ts` | ✅ Present |
| Step 11 | `server/src/modules/events/event.test.ts` | ✅ Present |

### ✅ Frontend — All Steps Complete

| F2 Step | File(s) | Status |
|---------|---------|--------|
| Types | `client/src/features/events/types.ts` | ✅ Present |
| Barrel | `client/src/features/events/index.ts` | ✅ Present |
| API layer | `client/src/features/events/api/events.api.ts` | ✅ Present |
| Hooks (×9) | `useEvents, useEvent, useCreateEvent, useUpdateEvent,`<br>`usePublishEvent, useCloseEvent, useRegister, useBookmark, useMyEvents` | ✅ All present |
| Components (×4) | `EventCard, EventStatusBadge, EventFilterBar, BookmarkButton` | ✅ All present |
| EventFeedPage | `client/src/features/events/pages/EventFeedPage.tsx` | ✅ Present |
| EventDetailPage | `client/src/features/events/pages/EventDetailPage.tsx` | ✅ Present |
| FacultyPostEventPage | `client/src/features/events/pages/FacultyPostEventPage.tsx` | ✅ Present |
| FacultyEditEventPage | `client/src/features/events/pages/FacultyEditEventPage.tsx` | ✅ Present |
| MyEventsPage | `client/src/features/events/pages/MyEventsPage.tsx` | ✅ Present |
| Router | `client/src/app/router.tsx` | ✅ Modified |

### ✅ UI Polish (this session) — Included in plan

| File | Change |
|------|--------|
| `client/src/components/layout/AppBar.tsx` | Desktop nav, biotech icon, ⌘K search, initials fix |
| `client/src/components/layout/BottomNav.tsx` | Active dot, FAB rotate-to-X, backdrop |
| `client/src/pages/StudentHomePage.tsx` | 12-col desktop grid, KPI metrics, deadlines sidebar |
| `client/src/pages/ProfilePage.tsx` | Role-gating, faculty sections, initials fix |
| `client/src/pages/LoginPage.tsx` | Patched (faculty portal disabled badge) |
| `client/src/features/auth/components/ProtectedRoute.tsx` | Patched |
| `client/src/styles/index.css` | slideUpFade animation |

---

## Commit Series

> **Convention:** [Conventional Commits](https://www.conventionalcommits.org/) · `type(scope): description`  
> Execute in **strict order** — each commit is atomic and buildable.

---

### 🗄️ BACKEND SERIES (B-1 → B-7)

---

#### `B-1` — Data Models

```
feat(events): add Event and Bookmark Mongoose models with indexes
```

**Files to stage:**
```
server/src/models/event.model.ts
server/src/models/bookmark.model.ts
```

**What it contains:**
- `IEvent` interface: full schema (type, status state-machine, eligibility, teamSize, counters, rawMessage, soft-delete via `deletedAt`, extraction hook for F-3)
- All 4 compound indexes: `{status,deadline}`, `{type,deadline}`, `{postedBy,createdAt}`, `{deletedAt}` sparse
- `IBookmark` with unique `{userId, eventId}` constraint
- Exported `EventType` and `EventStatus` type unions

---

#### `B-2` — Zod Schemas

```
feat(events): add Zod I/O schemas (create, update, list, eventId)
```

**Files to stage:**
```
server/src/modules/events/event.schema.ts
```

**What it contains:**
- `createEventSchema` — POST body with coerced dates, enum type, URL validation on `link`
- `updateEventSchema` — same as create but all fields optional (PUT)
- `listEventsSchema` — GET query params (type, branch, year, cursor, limit)
- `eventIdSchema` — 24-char hex path param

---

#### `B-3` — Service Layer

```
feat(events): implement event service with CRUD, compound-cursor pagination, and bookmarks
```

**Files to stage:**
```
server/src/modules/events/event.service.ts
```

**What it contains:**
- `listEvents(actor, query)` — compound cursor `(deadline, _id)` sort; students always get `status: published`; `rawMessage` never exposed to students
- `getEventById(actor, id)` — injects `isBookmarked` per user
- `createEvent(actor, body)` — `postedBy` from token; `registrationDeadline` defaults to `deadline`
- `updateEvent(actor, id, body)` — owner-or-admin guard via `assertOwnerOrAdmin()`
- `publishEvent / closeEvent` — validated state transitions (409 on invalid)
- `deleteEvent(actor, id)` — soft-delete sets `deletedAt`
- `toggleBookmark(actor, eventId)` — upsert/delete with optimistic count
- `getMyEvents(actor, query)` — faculty's own events including drafts
- Private: `assertOwnerOrAdmin()`, `injectBookmarks()`, `buildFeedFilter()`
- 60-second `node-cache` with invalidation on publish/close

---

#### `B-4` — Controller

```
feat(events): add thin HTTP controller (one handler per route)
```

**Files to stage:**
```
server/src/modules/events/event.controller.ts
```

**What it contains:**
- One exported async function per route
- All wrapped in `asyncHandler<AuthRequest>`
- Thin: parse params → call service → `res.status(N).json({ data })`
- No business logic

---

#### `B-5` — Routes

```
feat(events): wire event router with requireAuth and requireRole guards
```

**Files to stage:**
```
server/src/modules/events/event.routes.ts
```

**What it contains:**
- All 9 routes from F2 API contract
- `GET /my` before `GET /:id` to avoid param collision
- `POST /:id/bookmark` scoped to `requireRole(['student'])`
- Comment: `// POST /events/extract → mounted by F-3`

---

#### `B-6` — Cron Job + Server/Routes Integration

```
feat(events): add closeEvents cron job; register at startup; mount events router
```

**Files to stage:**
```
server/src/jobs/closeEvents.ts
server/src/server.ts
server/src/routes.ts
```

**What it contains:**
- `closeEvents.ts` — daily 00:05 cron: closes `{status:published, deadline:{$lt:now}, deletedAt:{$exists:false}}` → `{status:closed}`; logs count; invalidates feed cache
- `server.ts` — registers cron after DB connection established
- `routes.ts` — mounts `eventsRouter` at `/api/v1/events`

---

#### `B-7` — Integration Tests

```
test(events): add 16-case Supertest integration suite (feed, CRUD, bookmark, cron, soft-delete)
```

**Files to stage:**
```
server/src/modules/events/event.test.ts
```

**Coverage:**
- `GET /events` → student sees only published, sorted by deadline asc
- `GET /events?type=hackathon` → correctly filtered
- `GET /events?branch=CSE` → CSE-eligible + open-to-all returned
- `GET /events/:id` → student cannot see `rawMessage`
- `POST /events` (faculty) → 201 draft
- `POST /events` (student) → 403
- `PUT /events/:id` (owner) → edits draft
- `PUT /events/:id` (non-owner faculty) → 403
- `PATCH /events/:id/publish` → draft → published
- `PATCH /events/:id/publish` (already published) → 409
- `PATCH /events/:id/close` → published → closed
- `DELETE /events/:id` (owner) → soft-delete 204
- `GET /events` (after delete) → deleted event absent from feed
- `POST /events/:id/bookmark` → toggles on/off
- `GET /events` (admin) → sees drafts with `?status=draft`
- Cron function manually invoked → closes expired published events

---

#### `B-8` — Seed Script

```
chore(events): add seed-events.ts with 10 diverse test fixtures
```

**Files to stage:**
```
server/scripts/seed-events.ts
```

**What it contains:**
- 2 hackathons (1 closing in 3 days, 1 in 30 days)
- 2 competitions (1 published, 1 draft)
- 1 sports event (closed — past deadline)
- 2 workshops (1 CSE-only, 1 open)
- 1 seminar (external registration)
- 1 draft (unpublished — students must not see)
- 1 archived event
- Mixed `postedBy` = CSE faculty and CSIT faculty

---

### 🖥️ FRONTEND SERIES (F-1 → F-9)

---

#### `F-1` — TypeScript Types + Barrel

```
feat(events): define EventCard, EventDetail, EventType TS interfaces and barrel export
```

**Files to stage:**
```
client/src/features/events/types.ts
client/src/features/events/index.ts
```

---

#### `F-2` — API Layer

```
feat(events): add TanStack Query API functions (listEvents, getEvent, createEvent, bookmark)
```

**Files to stage:**
```
client/src/features/events/api/events.api.ts
```

**What it contains:**
- `listEvents(params)` → paginated with cursor
- `getEventById(id)` → single event with `isBookmarked`
- `createEvent(body)` / `updateEvent(id, body)` / `publishEvent(id)` / `closeEvent(id)` / `deleteEvent(id)`
- `toggleBookmark(id)`
- `getMyEvents(params)`

---

#### `F-3` — React Query Hooks

```
feat(events): add 9 TanStack Query hooks (feed, detail, CRUD, bookmark, my-events)
```

**Files to stage:**
```
client/src/features/events/hooks/useEvents.ts
client/src/features/events/hooks/useEvent.ts
client/src/features/events/hooks/useCreateEvent.ts
client/src/features/events/hooks/useUpdateEvent.ts
client/src/features/events/hooks/usePublishEvent.ts
client/src/features/events/hooks/useCloseEvent.ts
client/src/features/events/hooks/useRegister.ts
client/src/features/events/hooks/useBookmark.ts
client/src/features/events/hooks/useMyEvents.ts
```

---

#### `F-4` — UI Components

```
feat(events): add EventCard, EventStatusBadge, EventFilterBar, BookmarkButton components
```

**Files to stage:**
```
client/src/features/events/components/EventCard.tsx
client/src/features/events/components/EventStatusBadge.tsx
client/src/features/events/components/EventFilterBar.tsx
client/src/features/events/components/BookmarkButton.tsx
```

**EventCard highlights:**
- Top accent stripe gradient
- Type badge + deadline urgency chip
- Bounty/prize display
- Optimistic bookmark toggle
- Skeleton variant (`EventCardSkeleton`)

---

#### `F-5` — Events Feed Page

```
feat(events): add EventFeedPage with ⌘K filter console and desktop 12-col grid layout
```

**Files to stage:**
```
client/src/features/events/pages/EventFeedPage.tsx
```

**Highlights (Screen 3 reference):**
- Breadcrumb: `Campus Ledger → Events → All Campus Opportunities`
- `font-headline-xl` H1 with live event count
- Subscribed Feeds + Post Event + grid/list toggle action bar
- Filter console card: full-width search with `⌘K`/`Ctrl+K` keyboard shortcut
- Category pill segments: All / Hackathons / Competitions / Workshops / Seminars / Sports
- 8-col cards (grid or list view) + 4-col sticky sidebar (stats, closing-soon list, trust ledger)
- Launchpad CTA banner at bottom (dark bg, dot-grid overlay)

---

#### `F-6` — Event Detail Page

```
feat(events): add EventDetailPage with desktop 8+4-col layout, bento stats, and squad hub
```

**Files to stage:**
```
client/src/features/events/pages/EventDetailPage.tsx
```

**Highlights (Screen 4 reference):**
- Breadcrumb + Share/Bookmark/Edit action bar
- `h-52 lg:h-80` full-bleed gradient hero with floating badges + live status pill
- 2×3 bento stats grid (Sprint Dates / Squad / Bounty / Eligibility / Venue wide-span)
- Sprint Mission section with interactive track pills
- Squad Matchmaking hub with avatar stack + open recruitment posts
- Expandable accordions (coordinator / raw notes / code of conduct / gavel notice)
- Trust Ledger footer stamp (ECDSA-256 + fingerprint icon)
- Sticky 4-col sidebar: urgency countdown (amber ≤7 days) + Registration Gate + CTA + OD note
- Mobile sticky bottom bar preserved above BottomNav

---

#### `F-7` — Faculty Post + Edit Pages

```
feat(events): add FacultyPostEventPage and FacultyEditEventPage with full form validation
```

**Files to stage:**
```
client/src/features/events/pages/FacultyPostEventPage.tsx
client/src/features/events/pages/FacultyEditEventPage.tsx
```

---

#### `F-8` — My Events Page

```
feat(events): add MyEventsPage faculty dashboard with draft/published/closed tabs
```

**Files to stage:**
```
client/src/features/events/pages/MyEventsPage.tsx
```

---

#### `F-9` — Router Wiring

```
feat(client): wire all F-2 event routes with ProtectedRoute and role guards
```

**Files to stage:**
```
client/src/app/router.tsx
```

**Routes added:**
```
/events           → EventFeedPage      (all authenticated roles)
/events/new       → FacultyPostEventPage (faculty+)
/events/my        → MyEventsPage        (faculty+)
/events/:id       → EventDetailPage    (all authenticated roles)
/events/:id/edit  → FacultyEditEventPage (faculty+)
/home             → StudentHomePage    (all authenticated roles)
/                 → redirect → /home
```

---

### 🎨 UI POLISH SERIES (U-1 → U-5)

> These commits cover the INVENTUM desktop design reference upgrades applied during F-2.

---

#### `U-1` — AppBar Upgrade

```
feat(client): upgrade AppBar to INVENTUM desktop reference (biotech icon, horizontal nav, ⌘K search)
```

**Files to stage:**
```
client/src/components/layout/AppBar.tsx
```

**Changes:**
- `biotech` icon in primary-colored rounded-lg
- `INVENTUM` / `CIP` brand + `Student Incubator` / `Faculty Portal` subtitle
- Desktop horizontal nav links (lg+) with active `bg-primary-container` pill
- Search input with `⌘K` shortcut hint
- Notification bell with unread dot
- Avatar: correct initials stripping non-alpha chars (fixes `F(` bug for `Faculty (CSE)`)

---

#### `U-2` — BottomNav Upgrade

```
feat(client): upgrade BottomNav with active dot indicator, FAB rotate-to-X, and backdrop
```

**Files to stage:**
```
client/src/components/layout/BottomNav.tsx
```

**Changes:**
- Active indicator dot above icon + filled icon + bold label
- FAB: `+` → rotates 45° to `×` (red `error` bg) when open
- Blur backdrop behind dropup
- Faculty quick-actions: Post Event, My Events
- Student quick-actions: Saved Events, Browse All

---

#### `U-3` — Student Home Page

```
feat(client): rebuild StudentHomePage with 12-col grid, KPI metrics, and deadlines sidebar
```

**Files to stage:**
```
client/src/pages/StudentHomePage.tsx
```

**Changes (Screen 2 reference):**
- Breadcrumb rail + ledger node sync status
- Welcome hero panel with glow orbs (`blur-3xl`) + role-aware greeting
- 4-card KPI metric grid (role-specific icons and values)
- 12-col grid: 8-col closing-soon cards (top accent stripe) + launchpad/faculty CTA
- Sticky 4-col sidebar: Active Squad widget, Campus Deadlines timeline rail, Trust Ledger stamp

---

#### `U-4` — Profile Page

```
feat(client): rebuild ProfilePage with role-gating, faculty sections, and fixed initials algorithm
```

**Files to stage:**
```
client/src/pages/ProfilePage.tsx
```

**Changes:**
- Initials fix: `.replace(/[^a-zA-Z\s]/g, ' ')` → `FC` not `F(` for `Faculty (CSE)`
- Faculty: square avatar (`rounded-2xl`, `bg-primary`), Faculty badge chip, Event Management shortcuts
- Student: circle avatar, Phone Visibility toggle, Skills section, Active Squads stat
- Role-specific stats grid (faculty: Posted Events/Active Students/Dept; student: Milestones/Credits/Squads)
- Edit modal hides Skills editor for faculty; shows Allow Messages toggle

---

#### `U-5` — Auth + Style Fixes

```
fix(client): patch login page, ProtectedRoute, and CSS animation for F-2 compatibility
```

**Files to stage:**
```
client/src/pages/LoginPage.tsx
client/src/features/auth/components/ProtectedRoute.tsx
client/src/styles/index.css
server/.env.example
../.gitignore
```

**Changes:**
- `LoginPage.tsx` — Faculty login disabled badge near "Student Portal"
- `ProtectedRoute.tsx` — role guard compatibility
- `index.css` — `@keyframes slideUpFade` for BottomNav dropup
- `.env.example` — updated for F-2 env vars
- `.gitignore` — add `New folder/` and stitch refs

---

## Execution Order (Copy-Paste Ready)

When you say **go**, run these in sequence:

```
B-1  →  B-2  →  B-3  →  B-4  →  B-5  →  B-6  →  B-7  →  B-8
↓
F-1  →  F-2  →  F-3  →  F-4  →  F-5  →  F-6  →  F-7  →  F-8  →  F-9
↓
U-1  →  U-2  →  U-3  →  U-4  →  U-5
```

**Total: 22 commits** · Backend (8) + Frontend (9) + UI Polish (5)

---

## F-2 Acceptance Checklist Status

### Backend
- [x] `GET /events` returns only `published` events for students, sorted by deadline asc
- [x] `?type=hackathon` filter works; multiple values comma-separated
- [x] `?branch=CSE` returns CSE-eligible + open-to-all
- [x] `rawMessage` absent from any student response (assertion in test)
- [x] `POST /events` (faculty) → 201 draft
- [x] `POST /events` (student) → 403
- [x] `PUT /events/:id` (non-owner faculty) → 403
- [x] `PATCH /events/:id/publish` on already-published → 409
- [x] `DELETE /events/:id` soft-deletes; event disappears from feed
- [x] Cron function closes expired `published` events
- [x] `POST /events/:id/bookmark` toggles; second call removes bookmark
- [x] `tsc --noEmit` passes on events module ✅

### Frontend
- [x] Feed renders with skeleton while loading
- [x] Empty state shows when no events match filters
- [x] Category pills update type filter and refetch
- [x] Event card shows type badge, deadline countdown, counter pills
- [x] Bookmark button is optimistic (no flicker)
- [x] Faculty "Post Event" form validates before submit
- [x] Faculty sees draft in `/events/my`; student cannot see in `/events`
- [x] Event detail page shows full info; faculty sees `rawMessage` in own events

> **F-2: COMPLETE ✅ — Ready to commit on your signal.**
