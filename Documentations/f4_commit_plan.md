# F-4: Team Finder — Posts & Requests — Git Commit Plan

> **Branch:** `feat/f4-team-finder`
> **Format:** Conventional Commits
> **`tsc --noEmit` → 0 errors** on both server and client before pushing.

---

## Commit 1 — Data models (TeamPost + TeamLink + Block)

```
feat(server/models): add TeamPost, TeamLink, and Block models for F-4

- TeamPost: tracks team recruitment posts under an event; denormalised
  expiresAt (= event.deadline) enables cron lookups without a join.
  Partial index on expiresAt filters only open/full posts.
- TeamLink: covers all three link directions (request / invite / connect).
  Partial unique index on { fromUserId, toUserId, eventId } where
  status='pending' enforces one pending link per pair per event at the
  DB level — duplicate inserts return Mongo error 11000 → 409.
- Block (minimal): schema + indexes only. Full Block API added in F-5.
  Created now so link.service can query it safely in F-4.

Refs: FR-11, FR-36, FR-38
```

**Git commands:**
```bash
git add Implementation/server/src/models/teamPost.model.ts
git add Implementation/server/src/models/teamLink.model.ts
git add Implementation/server/src/models/block.model.ts
git commit -m "feat(server/models): add TeamPost, TeamLink, and Block models for F-4"
```

---

## Commit 2 — Zod schemas (team + link)

```
feat(server/schemas): add Zod schemas for TeamPost and TeamLink endpoints

team.schema.ts:
- createTeamPostSchema: eventId, title (≤100), description (≤500),
  rolesNeeded (≤5 × ≤50 chars), spotsTotal (1–10).
- updateTeamPostSchema: partial; status can only be set to 'closed'
  manually — all other transitions (full, expired) are automatic.

link.schema.ts:
- sendLinkSchema: superRefine cross-validates required fields per
  direction (request needs teamPostId; invite needs toUserId + eventId).
  URL pattern rejects links in message text (mirrors server rule).
- respondLinkSchema: action enum (accept | decline | withdraw).
- linksQuerySchema: box=in|out + cursor-based pagination.

Refs: FR-11, FR-13
```

**Git commands:**
```bash
git add Implementation/server/src/modules/teams/team.schema.ts
git add Implementation/server/src/modules/links/link.schema.ts
git commit -m "feat(server/schemas): add Zod schemas for TeamPost and TeamLink endpoints"
```

---

## Commit 3 — Team service

```
feat(server/teams): add team.service with CRUD and duplicate post guard

- listTeamPosts: returns open+full posts for an event; populates owner name.
- createTeamPost: verifies event is published; guards against duplicate
  open post (one open post per student per event → 409); copies
  event.deadline → expiresAt; sets spotsLeft = spotsTotal.
- updateTeamPost: ownership check; rejects edits on closed/expired posts;
  status='closed' is the only manual transition allowed.
- getMyTeamPosts: owner's full post history (all statuses).
- toCard(): shapes ITeamPost → TeamPostCard including isOwner flag.

Refs: FR-11, FR-12
```

**Git commands:**
```bash
git add Implementation/server/src/modules/teams/team.service.ts
git commit -m "feat(server/teams): add team.service with CRUD and duplicate post guard"
```

---

## Commit 4 — Link service (all business rules)

```
feat(server/links): add link.service with full F-4 business rule enforcement

Rules enforced in order:
  1. Resolve toUserId from teamPost.ownerId for direction='request'.
  2. Block check (bidirectional) — ForbiddenError if either party blocked.
  3. Self-link prevention.
  4. Daily limit (invites + connects only; requests exempt per spec).
     Reads limit from Setting.linksPerDay; default 10.
  5. Decline cool-down (30 days) — RateLimitError if same pair declined
     within window.
  6. Insert TeamLink; Mongo 11000 (partial unique index) → 409 ConflictError.

Accept path (respondLink / action='accept'):
  - Atomic findOneAndUpdate with { spotsLeft: { $gt: 0 } } guard.
    Two concurrent accepts cannot both succeed — the second returns null → 409.
  - If spotsLeft hits 0, post status set to 'full'.
  - toUser fetched with select('+phone') ONLY on accept path.

Contact reveal rule (shapeLink):
  - phone ONLY in response when status='accepted' AND toUser.phoneVisible.
  - All other states: no contact field at all.

getLinks: cursor-based pagination; +phone always fetched but only
          exposed by shapeLink when appropriate.

Refs: FR-13, FR-14, FR-15, FR-36, FR-37, FR-38, FR-41
```

**Git commands:**
```bash
git add Implementation/server/src/modules/links/link.service.ts
git commit -m "feat(server/links): add link.service with full F-4 business rule enforcement"
```

---

## Commit 5 — Controllers + routes

```
feat(server/teams+links): add controllers and Express routers for F-4

team.controller.ts + team.routes.ts:
  GET  /teams/my         — own posts (student; /my before /:id)
  POST /teams            — create post (student)
  PATCH /teams/:id       — edit/close post (student, owner check in service)

link.controller.ts + link.routes.ts:
  GET  /links?box=in|out — inbox/sent (student)
  POST /links            — send request/invite/connect (student)
  PATCH /links/:id       — accept/decline/withdraw (student)

All endpoints: student role only — faculty post events, not join teams.

Refs: FR-11–15
```

**Git commands:**
```bash
git add Implementation/server/src/modules/teams/team.controller.ts
git add Implementation/server/src/modules/teams/team.routes.ts
git add Implementation/server/src/modules/links/link.controller.ts
git add Implementation/server/src/modules/links/link.routes.ts
git commit -m "feat(server/teams+links): add controllers and Express routers for F-4"
```

---

## Commit 6 — Cron jobs

```
feat(server/jobs): add expireLinks and closeTeamPosts background cron jobs

expireLinks.ts  (00:10 daily):
  - updateMany { status:'pending', expiresAt:{ $lt: now } } → 'expired'.
  - Uses the partial index on status='pending' — scans only pending links.

closeTeamPosts.ts  (00:05 daily):
  - updateMany { status:{$in:['open','full']}, expiresAt:{ $lt: now } }
    → 'expired'.
  - Uses the denormalised expiresAt copied from event.deadline at post
    creation — no join with Event collection needed on cron runs.
  - Runs 5 min before expireLinks so posts are expired first.

Both jobs log counts and never crash the server process (try/catch).

Refs: FR-14 (expiry), FR-15 (auto-close at deadline)
```

**Git commands:**
```bash
git add Implementation/server/src/jobs/expireLinks.ts
git add Implementation/server/src/jobs/closeTeamPosts.ts
git commit -m "feat(server/jobs): add expireLinks and closeTeamPosts background cron jobs"
```

---

## Commit 7 — Server wiring (routes + server + event.routes)

```
feat(server): wire F-4 routers, cron jobs, and /events/:id/teams endpoint

routes.ts:
  - Import and mount teamsRouter at /api/v1/teams.
  - Import and mount linksRouter at /api/v1/links.
  - Bump version to 1.0.0-F4.
  - Document new endpoints in root info response.

server.ts:
  - Register scheduleCloseTeamPosts() (00:05) and scheduleExpireLinks()
    (00:10) alongside the existing scheduleCloseEvents().

event.routes.ts:
  - Add GET /:id/teams → listTeamPosts controller.
    Mounted on eventsRouter so the URL is /api/v1/events/:id/teams.
    All roles allowed (students view; faculty can too).

Refs: FR-11 (feed), FR-14 (cron registration)
```

**Git commands:**
```bash
git add Implementation/server/src/routes.ts
git add Implementation/server/src/server.ts
git add Implementation/server/src/modules/events/event.routes.ts
git commit -m "feat(server): wire F-4 routers, cron jobs, and /events/:id/teams endpoint"
```

---

## Commit 8 — Client types, API client, and hooks

```
feat(client/teams): add F-4 types, API client, and TanStack Query hooks

types.ts:
  - TeamPost, TeamLink, all request/response shapes.
  - isContactReveal() type guard (ContactReveal | ContactHint).

teams.api.ts:
  - listTeamPosts, getMyTeamPosts, createTeamPost, updateTeamPost.
  - getLinks, sendLink, respondLink.

hooks/useTeams.ts (all hooks in one file):
  - useTeamPosts(eventId), useMyTeamPosts().
  - useCreateTeamPost: invalidates event feed + myPosts on success.
  - useUpdateTeamPost: invalidates event feed + myPosts.
  - useLinks(box), useSendLink, useRespondLink.
  - Cache invalidation is scoped (event-level, not full-cache wipe).

index.ts: barrel exports for all types, API, hooks, components.

Refs: FR-11, FR-13
```

**Git commands:**
```bash
git add Implementation/client/src/features/teams/types.ts
git add Implementation/client/src/features/teams/api/teams.api.ts
git add Implementation/client/src/features/teams/hooks/useTeams.ts
git add Implementation/client/src/features/teams/index.ts
git commit -m "feat(client/teams): add F-4 types, API client, and TanStack Query hooks"
```

---

## Commit 9 — UI components

```
feat(client/teams): add TeamPostCard, CreateTeamPostForm, RequestToJoinModal, LinkCard

TeamPostCard:
  - 4 status states (open/full/closed/expired) with distinct chip colours.
  - Spots progress bar (red at 0, primary otherwise).
  - Role pills, isOwner badge, Request to Join / Close Post actions.

CreateTeamPostForm:
  - Role tag input: Enter to add, click pill to remove, max 5 roles.
  - ±1 spots stepper (1–10).
  - Inline error banner with server error passthrough.

RequestToJoinModal:
  - URL detection mirrors server-side Zod rule (rejects https?:// / www.).
  - Char counter with over-limit highlight.
  - Privacy note: "contact only shared after acceptance".
  - Success state with check icon; no re-submit risk.
  - Backdrop click closes modal.

LinkCard:
  - Accept / Decline / Withdraw actions gated on box (in/out) + status.
  - Contact block: phone or hint — only rendered when status='accepted'.
  - ≤2-day expiry warning.

Refs: FR-11, FR-13, FR-15
```

**Git commands:**
```bash
git add Implementation/client/src/features/teams/components/TeamPostCard.tsx
git add Implementation/client/src/features/teams/components/CreateTeamPostForm.tsx
git add Implementation/client/src/features/teams/components/RequestToJoinModal.tsx
git add Implementation/client/src/features/teams/components/LinkCard.tsx
git commit -m "feat(client/teams): add TeamPostCard, CreateTeamPostForm, RequestToJoinModal, LinkCard"
```

---

## Commit 10 — Pages (TeamPostsPage + LinkInboxPage)

```
feat(client/teams): add TeamPostsPage and LinkInboxPage

TeamPostsPage (/events/:eventId/teams):
  - 4 states: loading skeletons / error+retry / empty "Be the first" CTA
    / list of TeamPostCards.
  - Inline CreateTeamPostForm slide-in (toggles with "Post Team" button).
  - RequestToJoinModal rendered as portal on card action.
  - Inbox shortcut button (→ /teams/inbox) in header.

LinkInboxPage (/teams/inbox):
  - Two tabs: Incoming / Sent with pending count badges.
  - Both tab datasets prefetched simultaneously (useLinks('in') +
    useLinks('out')) — switching tabs is instant, no second fetch.
  - Loading skeletons, empty state per tab with context-aware copy.

Refs: FR-11, FR-13, FR-15
```

**Git commands:**
```bash
git add Implementation/client/src/features/teams/pages/TeamPostsPage.tsx
git add Implementation/client/src/features/teams/pages/LinkInboxPage.tsx
git commit -m "feat(client/teams): add TeamPostsPage and LinkInboxPage"
```

---

## Commit 11 — Router wiring + EventDetailPage entry points

```
feat(client): wire F-4 routes and update EventDetailPage team entry points

router.tsx:
  - Lazy import TeamPostsPage and LinkInboxPage.
  - /events/:eventId/teams → TeamPostsPage (student only).
    Declared BEFORE /events/:id to prevent param capture.
  - /teams/inbox → LinkInboxPage (student only).

EventDetailPage.tsx:
  - "Find Squad" / "Post Open Role" buttons in Squad Matchmaking section
    now navigate to /events/:id/teams (was /teams — non-existent route).
  - "Find or Post a Team" sidebar CTA navigates to /events/:id/teams.
  - "View Posts" in sidebar squad listing navigates to /events/:id/teams.

Refs: FR-11 (discoverability)
```

**Git commands:**
```bash
git add Implementation/client/src/app/router.tsx
git add Implementation/client/src/features/events/pages/EventDetailPage.tsx
git commit -m "feat(client): wire F-4 routes and update EventDetailPage team entry points"
```

---

## After all commits — push

```bash
git push
```

---

## PR Description

```markdown
## F-4: Team Finder — Posts & Requests (Path A)

### Summary
Students can create team recruitment posts under a hackathon/competition
event, others can send join requests, owners accept/decline, spots
decrement atomically, and contact is revealed only after acceptance.

### Changes
- **15 new files** (3 models, 2 schemas, 2 services, 4 controllers/routes,
  2 crons, 8 client files)
- **5 modified files** (routes.ts, server.ts, event.routes.ts, router.tsx,
  EventDetailPage.tsx)

### Flow
```
EventDetailPage → "Find or Post a Team"
  ↓
/events/:id/teams (TeamPostsPage)
  ↓ "Post Team"
CreateTeamPostForm → POST /teams
  ↓ "Request to Join"
RequestToJoinModal → POST /links (direction='request')
  ↓
/teams/inbox (owner) → accept → PATCH /links/:id
  ↓
Atomic $inc on spotsLeft (concurrency-safe)
  ↓
Contact revealed (phone if phoneVisible, else WhatsApp hint)
```

### Business Rules Enforced
| Rule | Where |
|------|-------|
| One open post per student per event | team.service createTeamPost |
| Block check (bidirectional) | link.service sendLink |
| Daily limit (invites+connects) — default 10 | link.service + Setting |
| Decline cool-down (30 days) | link.service sendLink |
| Duplicate pending → 409 | Mongo partial unique index |
| Atomic spot decrement (concurrency-safe) | findOneAndUpdate + $gt:0 |
| phone only on accepted + phoneVisible | link.service shapeLink |
| 7-day link expiry | expireLinks cron (00:10) |
| Team post close at event deadline | closeTeamPosts cron (00:05) |

### Testing Checklist
- [ ] `tsc --noEmit` passes (both server and client) ✅
- [ ] Create post → request → accept → spotsLeft decrements → contact shown
- [ ] Two concurrent accepts — only one wins (Promise.all test)
- [ ] 11th link (invite) in a day → 429
- [ ] Duplicate pending request → 409
- [ ] Decline + immediate retry → 429 (30-day cool-down)
- [ ] phone absent from pending/declined responses
- [ ] Set expiresAt to past → run cron → status='expired'

### Refs
FR-11, FR-12, FR-13, FR-14, FR-15, FR-36, FR-37, FR-38, FR-41
```

---

## Commit order summary

| # | Subject | Type | Key files |
|---|---------|------|-----------|
| 1 | Add TeamPost, TeamLink, Block models | `feat` | 3 model files |
| 2 | Add Zod schemas for TeamPost and TeamLink | `feat` | `team.schema.ts`, `link.schema.ts` |
| 3 | Add team.service with CRUD | `feat` | `team.service.ts` |
| 4 | Add link.service with all business rules | `feat` | `link.service.ts` |
| 5 | Add controllers and routers | `feat` | 4 controller/route files |
| 6 | Add expireLinks and closeTeamPosts crons | `feat` | 2 job files |
| 7 | Wire F-4 into routes + server + event.routes | `feat` | 3 modified files |
| 8 | Client types + API + hooks | `feat` | `types.ts`, `teams.api.ts`, `useTeams.ts`, `index.ts` |
| 9 | UI components | `feat` | 4 component files |
| 10 | Pages (TeamPostsPage + LinkInboxPage) | `feat` | 2 page files |
| 11 | Router wiring + EventDetailPage entry points | `feat` | `router.tsx`, `EventDetailPage.tsx` |
