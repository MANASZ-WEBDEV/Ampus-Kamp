# F-5: Invites, Connect & People Search — Git Commit Plan

> **Branch:** `main`  
> **Format:** Conventional Commits  
> **`tsc --noEmit` → 0 errors** on both server and client before pushing.

---

## Commit 1 — Data models (LookingFlag + Report)

```
feat(server/models): add LookingFlag and Report models for F-5

LookingFlag:
- Event-scoped signal that a student is actively seeking teammates.
- Unique index on { userId, eventId } enforces one flag per student per event.
- Index on { eventId: 1, createdAt: -1 } for paginated list queries.
- Cleared automatically by closeTeamPosts cron when event expires.

Report:
- Safety escalation stored for admin review (F-10).
- Status lifecycle: pending → reviewed | dismissed.
- Admin queue index: { status: 1, createdAt: -1 }.
- Reporter identity stored but never exposed to target.
- reviewedBy + reviewNotes fields reserved for admin UI (F-10).

Refs: FR-34, FR-35
```

**Git commands:**
```bash
git add Implementation/server/src/models/lookingFlag.model.ts
git add Implementation/server/src/models/report.model.ts
git commit -m "feat(server/models): add LookingFlag and Report models for F-5"
```

---

## Commit 2 — Zod schemas (looking + safety + people)

```
feat(server/schemas): add Zod schemas for looking, safety, and people endpoints

looking.schema.ts:
- upsertLookingSchema: optional note ≤ 120 chars.
- lookingQuerySchema: cursor-based pagination (limit 1–50).

safety.schema.ts:
- createBlockSchema: blockedUserId required.
- createReportSchema: superRefine cross-validates that at least one of
  targetUserId or linkId is present — prevents orphan reports.
  reason ≥ 10, ≤ 500 chars.

people.schema.ts:
- peopleQuerySchema: skills (CSV), branch (dept code), year (1–5),
  optional eventId (enables isLooking batch annotation on the server),
  cursor-based keyset pagination.
  Comment documents the SDE3 design decision on eventId.

Refs: FR-32, FR-34, FR-35
```

**Git commands:**
```bash
git add Implementation/server/src/modules/looking/looking.schema.ts
git add Implementation/server/src/modules/safety/safety.schema.ts
git add Implementation/server/src/modules/people/people.schema.ts
git commit -m "feat(server/schemas): add Zod schemas for looking, safety, and people endpoints"
```

---

## Commit 3 — Looking service

```
feat(server/looking): add looking.service with toggle and paginated list

toggleLooking:
- Guards: event must exist + be published/open. Prevents ghost flags
  for past events (a student cannot mark as "looking" for a closed event).
- Toggle semantics via upsert/delete: one endpoint, no separate POST/DELETE.
- Returns { isLooking, flag? } so the client can update state immediately
  without a refetch.

listLooking:
- Cursor-based pagination on { eventId, _id } compound index.
- Returns LookingCard[] with user name, note, since (ISO) fields.
- No contact fields ever included.

shapeFlag(): pure helper — shapes populated ILookingFlag into LookingCard.

Refs: FR-32
```

**Git commands:**
```bash
git add Implementation/server/src/modules/looking/looking.service.ts
git commit -m "feat(server/looking): add looking.service with toggle and paginated list"
```

---

## Commit 4 — Safety service (Block + cascade + Report)

```
feat(server/safety): add safety.service with block cascade and report

createBlock:
  1. Self-block prevention (cheapest guard first).
  2. Target user must be active (NotFoundError if suspended/missing).
  3. Block.create — unique index catches duplicates → 409.
  4. Cascade: TeamLink.deleteMany({ status:'pending', $or:[both directions] })
     Covers all pending links between the pair in ONE atomic operation.

removeBlock:
- findOneAndDelete by { userId, blockedUserId } → 404 if not found.
- Unblocking does NOT restore deleted links — irreversible cascade.

getMyBlocks:
- Populated list of blocked users with name + createdAt.

createReport:
- Anti-spam cap: max 5 pending reports per reporter at a time.
- Validates targetUserId and linkId existence before inserting.
- Reporter identity stored, never exposed to the reported user.

Refs: FR-34, FR-35
```

**Git commands:**
```bash
git add Implementation/server/src/modules/safety/safety.service.ts
git commit -m "feat(server/safety): add safety.service with block cascade and report"
```

---

## Commit 5 — People service (zero-PII search with batched isLooking)

```
feat(server/people): add people.service with zero-PII search and isLooking annotation

6-step pipeline:
  1. Branch code → ObjectId (one Dept.findOne — not N per result).
  2. Bidirectional block exclusion: two parallel Block queries, result
     union into a Set. Actor excludes users they blocked AND users who
     blocked them. Self always excluded.
  3. Main User.find with keyset pagination on _id.
  4. Whitelist projection: .select('name department year skills allowInvites')
     SECURITY: belt (select:false on schema) + suspenders (explicit whitelist).
     phone / email / enrollmentNo / passwordHash can never appear.
  5. isLooking batch annotation: ONE LookingFlag.find({ eventId, userId:{$in} })
     → Set<string> → O(1) lookup per result. Zero N+1 queries.
     Only executed when eventId is present in the query (always the case
     when navigated from EventDetailPage).
  6. Shape PersonCard — isLooking field ABSENT (not false) when no eventId,
     so clients can distinguish "not looking for this event" from
     "we don't know (no event context)".

Refs: FR-32, FR-33
```

**Git commands:**
```bash
git add Implementation/server/src/modules/people/people.service.ts
git commit -m "feat(server/people): add people.service with zero-PII search and isLooking annotation"
```

---

## Commit 6 — Controllers and routes (looking, safety, people)

```
feat(server/looking+safety+people): add controllers and Express routers

looking.controller.ts + (routes mounted on eventsRouter in next commit):
  PUT  /:id/looking  — toggleLooking (student)
  GET  /:id/looking  — listLooking   (all authenticated)

safety.controller.ts + safety.routes.ts:
  GET    /blocks                  — getMyBlocks   (student)
  POST   /blocks                  — createBlock   (student; Zod validated)
  DELETE /blocks/:blockedUserId   — removeBlock   (student)
  POST   /reports                 — createReport  (student; Zod validated)
  Note: safetyRouter is mounted at /api/v1 in routes.ts so the full
  path becomes /api/v1/blocks and /api/v1/reports.

people.controller.ts + people.routes.ts:
  GET /  — searchPeople (all authenticated; Zod query validated)

Refs: FR-32–35
```

**Git commands:**
```bash
git add Implementation/server/src/modules/looking/looking.controller.ts
git add Implementation/server/src/modules/safety/safety.controller.ts
git add Implementation/server/src/modules/safety/safety.routes.ts
git add Implementation/server/src/modules/people/people.controller.ts
git add Implementation/server/src/modules/people/people.routes.ts
git commit -m "feat(server/looking+safety+people): add controllers and Express routers"
```

---

## Commit 7 — Extend link.service + closeTeamPosts cron

```
feat(server/links+jobs): add allowInvites guard and LookingFlag cron cleanup

link.service.ts — allowInvites check (F-5):
- For direction='invite' or 'connect', fetch target.allowInvites (single
  field select — no other user data pulled).
- If false → 403 ForbiddenError.
- Server-side enforcement — not just hidden in the client UI.
- Check placed AFTER the request path (direction='request' is exempt)
  and BEFORE block/daily-limit checks for fail-fast ordering.

closeTeamPosts.ts — LookingFlag cleanup:
- Before expiring posts, collect distinct eventIds of affected events.
- After updateMany on TeamPost, run ONE LookingFlag.deleteMany({ eventId:
  { $in: expiredEventIds } }).
- Prevents ghost "looking" flags for events that are now closed.
- Early-exit if no posts to expire (avoids unnecessary DB query).

Refs: FR-33 (allowInvites), FR-32 (flag cleanup)
```

**Git commands:**
```bash
git add Implementation/server/src/modules/links/link.service.ts
git add Implementation/server/src/jobs/closeTeamPosts.ts
git commit -m "feat(server/links+jobs): add allowInvites guard and LookingFlag cron cleanup"
```

---

## Commit 8 — Server wiring (routes.ts + event.routes.ts)

```
feat(server): wire F-5 routers, looking routes, and bump version to 1.0.0-F5

routes.ts:
- Import and mount peopleRouter at /api/v1/people.
- Mount safetyRouter at /api/v1 (router defines /blocks and /reports paths).
- Add people/looking/blocks/reports to root info endpoint.
- Bump version to 1.0.0-F5.

event.routes.ts:
- Add PUT  /:id/looking (student; Zod body validated).
- Add GET  /:id/looking (all authenticated; Zod query validated).
- Both routes declared BEFORE /:id catch-all.
- looking routes share eventsRouter so URL is /api/v1/events/:id/looking.

Refs: FR-32–35
```

**Git commands:**
```bash
git add Implementation/server/src/routes.ts
git add Implementation/server/src/modules/events/event.routes.ts
git commit -m "feat(server): wire F-5 routers, looking routes, and bump version to 1.0.0-F5"
```

---

## Commit 9 — Client types, API client, and hooks

```
feat(client/people): add F-5 types, API client, and TanStack Query hooks

types.f5.ts:
- Person (zero PII — name, dept, year, skills, allowInvites, isLooking?).
  isLooking is optional (not false) when absent — distinguishes "not looking"
  from "no event context".
- PeoplePage, LookingCard, ToggleResult, LookingPage, BlockCard, inputs.

people.api.ts:
- searchPeople: query params mapped cleanly; no undefined keys sent.
- toggleLooking: PUT with optional note.
- listLooking: GET with optional cursor.
- getMyBlocks, createBlock, removeBlock, createReport.

usePeople.ts:
- usePeopleSearch: placeholderData keeps previous results visible while
  filter changes load — no flash of empty state.
- useToggleLooking: precise invalidation — only invalidates people search
  caches where queryKey[2].eventId matches. Not a full cache wipe.
- useCreateBlock: invalidates both blocks list AND links (cascade removes
  pending links, so inbox must refresh).
- useCreateReport: no cache invalidation (reports go to admin queue only).

Refs: FR-32–35
```

**Git commands:**
```bash
git add Implementation/client/src/features/teams/types.f5.ts
git add Implementation/client/src/features/teams/api/people.api.ts
git add Implementation/client/src/features/teams/hooks/usePeople.ts
git commit -m "feat(client/people): add F-5 types, API client, and TanStack Query hooks"
```

---

## Commit 10 — UI components

```
feat(client/teams): add StudentCard, LookingToggle, and BlockReportMenu

StudentCard:
- Name, dept+year, skills (max 6 visible + overflow count).
- isLooking badge (only rendered when field is present).
- allowInvites:false → replaced with "Not accepting invites" label.
  Invite/Connect buttons hidden entirely (not just disabled).
- Separate Invite (event context) vs Connect (no event) buttons.
- Report (flag icon) + Block (block icon) accessible on every card.

LookingToggle:
- Toggle pill (12px → 20px animation on state change).
- Two-step flow: tap to expand note input → tap again to confirm.
  Un-toggling fires immediately (no note step).
- Note input: 120-char limit, placeholder example.
- Cancel button collapses without sending.

BlockReportMenu (bottom-sheet):
- Three views: menu → report form | block confirm → done.
- Report: confidentiality note, 500-char textarea with counter,
  URL detection disables submit (mirrors server Zod rule).
- Block confirm: lists exactly what will happen (cascade explanation).
- Done state: confirm message differs by action taken.
- Backdrop click closes.

Refs: FR-32, FR-34, FR-35
```

**Git commands:**
```bash
git add Implementation/client/src/features/teams/components/StudentCard.tsx
git add Implementation/client/src/features/teams/components/LookingToggle.tsx
git add Implementation/client/src/features/teams/components/BlockReportMenu.tsx
git commit -m "feat(client/teams): add StudentCard, LookingToggle, and BlockReportMenu"
```

---

## Commit 11 — Pages (PeopleSearchPage + LookingListPage)

```
feat(client/teams): add PeopleSearchPage and LookingListPage

PeopleSearchPage (/teams/people?eventId=xxx):
- Branch filter chips (8 dept codes), year tabs (1–4), skill tag
  input (Enter to add; max 5 tags; click pill to remove).
- isFetching spinner next to result count (not a full reload).
- placeholderData: filter changes keep previous results visible.
- QuickReportModal inline: lightweight report modal for profile-level
  reports (no linkId, just targetUserId + reason).
- All 4 states: loading skeletons / error / empty (with clear-filter CTA)
  / results grid.
- eventId always read from ?eventId= URL param — passed to API so
  isLooking is annotated on every result card.

LookingListPage (/events/:id/looking):
- Lists LookingCards with avatar, name, note, since date, looking badge.
- Count line shows total + "(scroll for more)" if hasMore.
- Empty state encourages first toggle.
- All 4 states handled.

Refs: FR-32
```

**Git commands:**
```bash
git add Implementation/client/src/features/teams/pages/PeopleSearchPage.tsx
git add Implementation/client/src/features/teams/pages/LookingListPage.tsx
git commit -m "feat(client/teams): add PeopleSearchPage and LookingListPage"
```

---

## Commit 12 — Router + EventDetailPage + LinkCard wiring

```
feat(client): wire F-5 routes and update EventDetailPage and LinkCard

router.tsx:
- Lazy import PeopleSearchPage, LookingListPage.
- /events/:id/looking → LookingListPage (student; BEFORE /events/:id).
- /teams/people      → PeopleSearchPage (student).

EventDetailPage.tsx:
- Add "Find People" button → /teams/people?eventId=:id (3rd button
  in the Squad Matchmaking grid — col-span-2).
- Add LookingToggle component below the grid (student role only).
- Import LookingToggle from @/features/teams/components/LookingToggle.

LinkCard.tsx (rewritten for clarity):
- Wrap return in React Fragment to allow sibling BlockReportMenu.
- Add showSafety state + ⋮ button (visible on incoming links only).
- BlockReportMenu renders as bottom-sheet portal on showSafety=true.
- Extract daysLeft from inline IIFE to a const (cleaner read).
- Message now uses &ldquo; / &rdquo; HTML entities.

Refs: FR-32, FR-34, FR-35
```

**Git commands:**
```bash
git add Implementation/client/src/app/router.tsx
git add Implementation/client/src/features/events/pages/EventDetailPage.tsx
git add Implementation/client/src/features/teams/components/LinkCard.tsx
git commit -m "feat(client): wire F-5 routes and update EventDetailPage and LinkCard"
```

---

## After all commits — push

```bash
git push
```

---

## PR Description

```markdown
## F-5: Invites, Connect & People Search

### Summary
Paths B and C of team formation. Students can search for potential
teammates (zero PII), invite/connect via existing F-4 TeamLink,
mark themselves as "looking for a team" on an event, and use safety
tools (block with cascade, report to admin queue).

### Changes
- **10 new files** (2 models, 3 schemas, 3 services, 5 controllers/routes,
  2 client pages, 3 components, 3 API/hook/type files)
- **6 modified files** (link.service, closeTeamPosts, event.routes,
  routes.ts, router.tsx, EventDetailPage, LinkCard)

### Key Design Decisions (SDE3)
| Decision | Rationale |
|----------|-----------|
| `isLooking` batch annotation | ONE `LookingFlag.find({ eventId, userId:{$in} })` after the result page — zero N+1 |
| `isLooking` absent (not false) when no eventId | Client can distinguish "not looking" from "unknown context" |
| `eventId` always in URL from EventDetailPage | Realistic flow; people search is always event-scoped in UI |
| Block exclusion via pre-fetched Set | Actor's block list is small; avoids `$lookup` pipeline |
| `createReport` anti-spam cap (5 pending) | Prevents admin queue flooding by a single reporter |
| `allowInvites` checked server-side, not just hidden | Defense-in-depth per FR-33 |

### Security Checklist
- [ ] `phone`, `email`, `enrollmentNo` never in `/people` response ✅
- [ ] `allowInvites:false` returns 403 server-side ✅
- [ ] Block cascade deletes pending links in ONE `deleteMany` ✅
- [ ] Report: reporter identity stored, never sent to target ✅
- [ ] People search excludes suspended users ✅

### Testing Checklist
- [ ] `tsc --noEmit` passes (both server and client) ✅
- [ ] `/people?branch=CSE&year=3&eventId=xxx` → isLooking annotated
- [ ] User with `allowInvites:false` → POST /links (invite) → 403
- [ ] Block → both pending links deleted → inbox shows empty
- [ ] Looking toggle: PUT twice → flag created then deleted
- [ ] `/events/:id/looking` shows only active-event students
- [ ] closeTeamPosts cron → LookingFlags for expired events deleted
- [ ] Report with reason < 10 chars → 422

### Refs
FR-32, FR-33, FR-34, FR-35
```

---

## Commit order summary

| # | Subject | Files |
|---|---------|-------|
| 1 | Add LookingFlag and Report models | 2 model files |
| 2 | Add Zod schemas (looking, safety, people) | 3 schema files |
| 3 | Add looking.service | `looking.service.ts` |
| 4 | Add safety.service (block cascade + report) | `safety.service.ts` |
| 5 | Add people.service (zero-PII + batched isLooking) | `people.service.ts` |
| 6 | Add controllers and routers | 5 files |
| 7 | Extend link.service + closeTeamPosts | 2 modified files |
| 8 | Wire F-5 into routes.ts + event.routes.ts | 2 modified files |
| 9 | Client types + API + hooks | 3 files |
| 10 | UI components (StudentCard, LookingToggle, BlockReportMenu) | 3 files |
| 11 | Pages (PeopleSearchPage, LookingListPage) | 2 files |
| 12 | Router + EventDetailPage + LinkCard wiring | 3 modified files |
