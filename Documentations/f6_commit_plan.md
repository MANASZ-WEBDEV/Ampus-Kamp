# F-6: Event Registration — Git Commit Plan

> **Branch:** `main`  
> **Format:** Conventional Commits  
> **`tsc --noEmit` → 0 errors** on both server and client confirmed before push.

---

## Commit 1 — Registration model

```
feat(server/models): add Registration model with partial unique index

- Registration + Member embedded sub-document (_id: false).
- MemberStatus: invited | confirmed | declined.
- RegistrationType: individual | team | tracking.
- RegistrationStatus: draft | submitted | withdrawn | locked.

Partial unique index on { members.userId, eventId }
  partialFilterExpression: { status: { $in: ['draft','submitted','locked'] } }
  Guarantees ONE active registration per student per event at the DB layer.
  Withdrawn registrations excluded — student can re-register after withdrawing.
  Concurrent duplicate POSTs return Mongo error 11000 → 409. No app-level lock needed.

Additional indexes:
  { eventId, status, createdAt:-1 }  — faculty roster query
  { leaderId, eventId }              — leader's own registration lookup
  { status, eventId }                — lockRegistrations cron

Refs: FR-42–51
```

**Git commands:**
```bash
git add Implementation/server/src/models/registration.model.ts
git commit -m "feat(server/models): add Registration model with partial unique index"
```

---

## Commit 2 — Zod schemas

```
feat(server/schemas): add Zod schemas for registration endpoints

createRegistrationSchema:
  - type: 'individual' | 'team' | 'tracking'
  - superRefine cross-validates:
    · type='team'     → teamName required (≤ 60 chars)
    · type!='team'    → memberUserIds must be absent
    · type!='tracking' → externalRegId must be absent
  Note: teamSize min/max NOT validated at creation — only on submit.
  This allows leaders to create a draft and add members incrementally.

updateRegistrationSchema:
  - action: 'submit' | 'withdraw' | 'edit'
  - superRefine: teamName/memberUserIds only valid with action='edit'

memberRespondSchema: action: 'confirm' | 'decline'
createTrackingSchema: optional externalRegId
rosterQuerySchema: status filter + keyset cursor pagination (limit 1–100)

Refs: FR-42–51
```

**Git commands:**
```bash
git add Implementation/server/src/modules/registrations/registration.schema.ts
git commit -m "feat(server/schemas): add Zod schemas for registration endpoints"
```

---

## Commit 3 — Registration service

```
feat(server/registrations): add registration.service with atomic counter updates

createRegistration:
  1. Event guard: published + registrationMode='in_app' + not past registrationDeadline.
  2. Self-invite prevention + max invite size check against teamSize.max.
  3. User existence validation (student + active only).
  4. Leader added as members[0] confirmed. Invited members follow.
  5. Partial unique index catches duplicate → 11000 → 409.

createTracking:
  - Immediately submitted (no draft state).
  - Increments counters.tracking inside a MongoDB session (not counters.students).

updateRegistration — SUBMIT action:
  - Validates registrationDeadline not passed.
  - Counts confirmed members only (pending invites do NOT count toward teamSize).
  - Validates confirmed count within [teamSize.min, teamSize.max].
  - Session: Registration.status → 'submitted' + Event.$inc { counters.students, counters.teams }.
  - Both counters updated atomically — no eventual consistency lag.

updateRegistration — WITHDRAW action:
  - If was 'submitted': session decrements counters.students + counters.teams.
  - If was 'draft': no counter change.

updateRegistration — EDIT action:
  - Draft only. Keeps confirmed members; replaces invited list.
  - Replacement strategy: new invited set replaces old invited set.
    Confirmed members are never removed via edit.

respondMember:
  - Permission: actor.id MUST equal targetUid.
  - Confirm: members[i].status → 'confirmed'.
  - Decline: $pull member from array entirely (frees slot for replacement invite).

getRoster: keyset pagination on { eventId, status }.
streamRosterCsv: uses .cursor() — never loads all docs into memory.
  RFC 4180-compliant quoting + UTF-8 BOM for Excel compatibility.

Refs: FR-42–51
```

**Git commands:**
```bash
git add Implementation/server/src/modules/registrations/registration.service.ts
git commit -m "feat(server/registrations): add registration.service with atomic counter updates"
```

---

## Commit 4 — Controller and router

```
feat(server/registrations): add registration controller and router

registration.controller.ts:
  createRegistration   → POST /events/:id/registrations (student)
  createTracking       → POST /events/:id/tracking (student)
  updateRegistration   → PATCH /registrations/:id (student, leader only)
  respondMember        → PATCH /registrations/:id/members/:uid (invited member only)
  getMyRegistration    → GET /registrations/mine?eventId= (student)
  getRoster            → GET /events/:id/registrations (faculty+)
  exportRosterCsv      → GET /events/:id/registrations/export (faculty+)
    Streaming: res.write per row via service .cursor() — never OOMs.
    BOM prefix + RFC 4180 quoting for Excel-safe CSV.

registration.routes.ts (student-facing only — /registrations/*):
  GET  /mine      — BEFORE /:id to avoid route collision
  PATCH /:id
  PATCH /:id/members/:uid

Event-scoped routes (create/roster/export/tracking) mounted on eventsRouter.

Refs: FR-42–51
```

**Git commands:**
```bash
git add Implementation/server/src/modules/registrations/registration.controller.ts
git add Implementation/server/src/modules/registrations/registration.routes.ts
git commit -m "feat(server/registrations): add registration controller and router"
```

---

## Commit 5 — lockRegistrations cron

```
feat(server/jobs): add lockRegistrations cron at 00:15 daily

Runs 10 minutes after closeTeamPosts (00:05) — ensures team post data
is stable before registrations are locked.

Two-phase approach:
  Phase 1: Event.find({ registrationDeadline: { $lt: now } }) → expiredEventIds.
  Phase 2: Registration.updateMany({ eventId: { $in: expiredEventIds },
            status: 'submitted' }, { $set: { status: 'locked' } }).

Design decisions:
  - Only 'submitted' → 'locked'. Draft registrations NOT locked (avoids
    surprise locked drafts; leaders must withdraw manually).
  - Counters NOT modified — locking does not change registered student counts.
  - Idempotent: running twice is safe (locked → locked is a no-op via updateMany).
  - Never crashes server process: all errors caught and logged.
  - Early-exit if no events have expired deadlines.

Refs: FR-42 (locking), FR-51 (cron)
```

**Git commands:**
```bash
git add Implementation/server/src/jobs/lockRegistrations.ts
git commit -m "feat(server/jobs): add lockRegistrations cron at 00:15 daily"
```

---

## Commit 6 — Server wiring (event.routes + routes.ts + server.ts)

```
feat(server): wire F-6 registration routes and cron, bump version to 1.0.0-F6

event.routes.ts — 4 new event-scoped routes:
  IMPORTANT ordering (both must be BEFORE /:id catch-all):
  GET  /:id/registrations/export  — BEFORE /:id/registrations
  GET  /:id/registrations
  POST /:id/registrations
  POST /:id/tracking

routes.ts:
  - Import registrationsRouter.
  - app.use('/api/v1/registrations', registrationsRouter).
  - Add registrations/eventRoster/tracking entries to info endpoint.
  - Rename duplicate 'roster' key → 'rosterImport' / 'eventRoster'.
  - Bump version to '1.0.0-F6'.

server.ts:
  - Import scheduleLockRegistrations.
  - Register after scheduleExpireLinks() — maintains cron time ordering:
    00:05 closeEvents → 00:05 closeTeamPosts → 00:10 expireLinks → 00:15 lockRegistrations.

Refs: FR-42–51
```

**Git commands:**
```bash
git add Implementation/server/src/modules/events/event.routes.ts
git add Implementation/server/src/routes.ts
git add Implementation/server/src/server.ts
git commit -m "feat(server): wire F-6 registration routes and cron, bump version to 1.0.0-F6"
```

---

## Commit 7 — Client types + API client

```
feat(client/registrations): add F-6 types and API client

types.ts:
  - Member (userId, name, status, respondedAt?)
  - Registration (id, eventId, type, status, teamName?, leader, members,
    externalRegId?, submittedAt?, createdAt)
  - Input shapes: CreateRegistrationInput, UpdateRegistrationInput,
    MemberRespondInput, CreateTrackingInput
  - RegistrationPage (items, nextCursor?, hasMore)

registrations.api.ts — 7 functions:
  Student: createRegistration, updateRegistration, respondMember,
           getMyRegistration, createTracking.
  Faculty: getRoster (pagination params), downloadRosterCsv.
    downloadRosterCsv: requests as 'blob' responseType → returns
    URL.createObjectURL for hidden-anchor download trigger.
    Blob URL revoked after 5s via setTimeout.

Refs: FR-42–51
```

**Git commands:**
```bash
git add Implementation/client/src/features/registrations/types.ts
git add Implementation/client/src/features/registrations/api/registrations.api.ts
git commit -m "feat(client/registrations): add F-6 types and API client"
```

---

## Commit 8 — TanStack Query hooks

```
feat(client/registrations): add useRegistration hooks (7 hooks)

registrationKeys: { mine(eventId), roster(eventId) }

useMyRegistration(eventId):
  - staleTime 30s — registration changes infrequent but critical.
  - Returns null when student has not registered.

useCreateRegistration(eventId):
  - Invalidates mine(eventId) on success.

useUpdateRegistration(eventId):
  - Handles submit / withdraw / edit in one hook.
  - Invalidates mine(eventId) on success.

useRespondMember():
  - eventId passed at mutation call time (not hook instantiation).
  - Invalidates mine(eventId) on success.

useCreateTracking(eventId):
  - Invalidates mine(eventId) on success.

useRoster(eventId, status='all'):
  - staleTime 60s.

useDownloadRosterCsv(eventId):
  - useMutation (not useQuery) — imperative user action.
  - Creates hidden <a> element, clicks it, removes it.
  - Revokes blob URL after 5s.

Refs: FR-42–51
```

**Git commands:**
```bash
git add Implementation/client/src/features/registrations/hooks/useRegistration.ts
git commit -m "feat(client/registrations): add useRegistration hooks (7 hooks)"
```

---

## Commit 9 — UI components

```
feat(client/registrations): add RegisterButton, RegistrationStatusCard, MemberConfirmBanner

RegisterButton:
  - External events: direct <a> link to event.link.
  - In-app: 3-step choose flow.
    · Solo: fires createRegistration immediately.
    · Team: name input + memberIds textarea (paste from People Search).
      Creates draft — members added incrementally afterward.
    · Tracking: optional externalRegId input → createTracking.
  - Already registered: shows locked "Registered" state.
  - CTA style adapts: primary for solo-only events, secondary for 'team' choice.
  - Inline error display from useMutation.error.

RegistrationStatusCard:
  - Status badge (draft/submitted/locked/withdrawn) with correct icon.
  - Team name + type label.
  - Members list with status chips (confirmed=primary, invited=amber, declined=error).
  - Leader badge on leader row.
  - Draft reminder for leaders: "Not submitted yet."
  - Withdraw button (leader only, draft/submitted states).

MemberConfirmBanner:
  - Only rendered when user's member.status === 'invited'.
  - Disappears on isSuccess (no flash after respond).
  - Shows leader name, team name, confirmed count.
  - Join / Decline buttons with isPending disable.
  - Footer: "Declining frees your spot — leader can invite someone else."

Refs: FR-42–50
```

**Git commands:**
```bash
git add Implementation/client/src/features/registrations/components/RegisterButton.tsx
git add Implementation/client/src/features/registrations/components/RegistrationStatusCard.tsx
git add Implementation/client/src/features/registrations/components/MemberConfirmBanner.tsx
git commit -m "feat(client/registrations): add RegisterButton, RegistrationStatusCard, MemberConfirmBanner"
```

---

## Commit 10 — FacultyRosterPage

```
feat(client/registrations): add FacultyRosterPage (/events/:id/roster)

Stats grid: Total | Submitted | Locked | Teams — 4-column card grid.
CSV export button:
  - Calls useDownloadRosterCsv mutation.
  - Hidden anchor + blob URL approach (no page navigation).
  - Disabled when total === 0 or download in progress.

RosterRow component:
  - Team: shows teamName + "Led by leaderName".
  - Individual/tracking: shows leaderName.
  - Members summary: confirmed count + pending count + all names.
  - Submit timestamp with date + time.
  - StatusChip: draft/submitted/locked/withdrawn with colour-coded styles.

All 4 states handled: loading skeletons (5 pulse rows) / error / empty / results.
Back breadcrumb navigates to previous page (navigate(-1)).
Footer note: "use CSV export for full data" when hasMore is true.

Refs: FR-48 (roster), FR-49 (CSV export)
```

**Git commands:**
```bash
git add Implementation/client/src/features/registrations/pages/FacultyRosterPage.tsx
git commit -m "feat(client/registrations): add FacultyRosterPage (/events/:id/roster)"
```

---

## Commit 11 — Router + EventDetailPage wiring

```
feat(client): wire F-6 routes and update EventDetailPage

router.tsx:
  - Lazy import FacultyRosterPage.
  - /events/:id/roster → FacultyRosterPage (faculty+).
  - IMPORTANT: must be before /events/:id catch-all.

EventDetailPage.tsx:
  - Remove dead useRegister + handleRegister + registered/isRegistering state.
  - Add useMyRegistration(id!) — null = not registered.
  - Add useUpdateRegistration(id!) — for withdraw action.
  - Derived: alreadyRegistered, hasPendingInvite.
  - Restore isFaculty/isOwner/isClosed/isDraft (removed during refactor).
  - Update ctaLabel() to use alreadyRegistered (no more local state).

Sidebar registration section (id="sidebar-reg-section"):
  1. MemberConfirmBanner — hasPendingInvite && myReg && user.
  2. RegistrationStatusCard — alreadyRegistered && !hasPendingInvite.
  3. RegisterButton — !isFaculty && !alreadyRegistered && !isClosed && !isDraft.
  4. Closed/draft label — (isClosed || isDraft) && !isFaculty.
  5. "View Roster" button — isFaculty.

Mobile bottom bar:
  - Student: scroll-to #sidebar-reg-section on tap (shows context-aware label).
  - Faculty: "View Roster" → /events/:id/roster.
  - Removes all dead handleRegister/isRegistering/registered references.

Refs: FR-42–51
```

**Git commands:**
```bash
git add Implementation/client/src/app/router.tsx
git add Implementation/client/src/features/events/pages/EventDetailPage.tsx
git commit -m "feat(client): wire F-6 routes and update EventDetailPage"
```

---

## After all commits — push

```bash
git push
```

---

## PR Description

```markdown
## F-6: Event Registration

### Summary
Full in-app registration system. Supports individual, team (with member
consent flow), and external tracking registrations. Faculty see a live
roster with CSV export. A daily cron auto-locks submitted registrations
after the registration deadline.

### Changes
- **6 new server files** (model, schema, service, controller, routes, cron)
- **3 modified server files** (event.routes, routes.ts, server.ts)
- **7 new client files** (types, API, 7 hooks, 3 components, 1 page)
- **2 modified client files** (router, EventDetailPage)

### Key Design Decisions (SDE3)

| Decision | Rationale |
|----------|-----------|
| Partial unique index at DB layer | Concurrent POSTs from same student handled by Mongo 11000, not app mutex |
| MongoDB session for counter atomicity | counters.students + counters.teams updated in same transaction as status change — no eventual consistency |
| Counters decrement on withdraw | Symmetric with submit — keeps counters accurate without a reconciliation job |
| Members start as 'invited', never 'confirmed' | No consent = not added. Decline $pulls member, frees slot for replacement |
| teamSize validated only on submit | Allows leaders to create draft first, invite members incrementally |
| streamRosterCsv uses .cursor() | Never loads full roster into memory — safe for large events |
| CSV with BOM + RFC 4180 quoting | Excel-safe out of the box without telling users to configure encoding |
| lockRegistrations at 00:15 (not 00:05) | Runs after closeTeamPosts to avoid race conditions |

### Security Checklist
- [x] Only leaderId can submit/withdraw/edit
- [x] Only the specific member (uid === req.user.id) can confirm/decline
- [x] counters updated inside MongoDB session — no double-counting
- [x] locked registrations reject all edits → 409
- [x] Duplicate active registration → 409 at DB layer

### Testing Checklist
- [ ] POST individual → counters.students +1 on submit
- [ ] POST team → invite members → confirm → submit → counters correct
- [ ] Declined member removed → leader can add replacement
- [ ] Duplicate active registration → 409
- [ ] Team size violation on submit → 422
- [ ] Withdraw submitted → counters decremented
- [ ] PATCH /members/:uid by wrong user → 403
- [ ] GET /events/:id/registrations/export → valid CSV with all fields
- [ ] Set registrationDeadline in past → run cron → status = 'locked'
- [ ] POST to locked registration → 409

### Refs
FR-42, FR-43, FR-44, FR-45, FR-46, FR-47, FR-48, FR-49, FR-50, FR-51
```

---

## Commit order summary

| # | Subject | Key files |
|---|---------|-----------|
| 1 | `feat(server/models)` | `registration.model.ts` |
| 2 | `feat(server/schemas)` | `registration.schema.ts` |
| 3 | `feat(server/registrations)` service | `registration.service.ts` |
| 4 | `feat(server/registrations)` ctrl+routes | `registration.controller.ts`, `registration.routes.ts` |
| 5 | `feat(server/jobs)` | `lockRegistrations.ts` |
| 6 | `feat(server)` wiring | `event.routes.ts`, `routes.ts`, `server.ts` |
| 7 | `feat(client/registrations)` types+API | `types.ts`, `registrations.api.ts` |
| 8 | `feat(client/registrations)` hooks | `useRegistration.ts` |
| 9 | `feat(client/registrations)` components | `RegisterButton`, `RegistrationStatusCard`, `MemberConfirmBanner` |
| 10 | `feat(client/registrations)` page | `FacultyRosterPage.tsx` |
| 11 | `feat(client)` wiring | `router.tsx`, `EventDetailPage.tsx` |
