# Campus Innovation Platform — Feature-Wise Implementation Plan
### MAANG-Level Engineering Design Document · October 2026

> **Stack:** Node.js · Express · TypeScript (strict) · MongoDB · Zod · React · Vite · TanStack Query · Tailwind · PWA  
> **API prefix:** `/api/v1/` on every route  
> **Source of truth:** Master Reference Document (Parts 1–29)

---

## Table of Contents

| # | Feature | Priority | Week |
|---|---------|----------|------|
| F-0 | [Project Scaffold & Infrastructure](#f-0-project-scaffold--infrastructure) | M | 0 |
| F-1 | [Authentication & Profiles](#f-1-authentication--profiles) | M | 1 |
| F-2 | [Event Feed & Management](#f-2-event-feed--management) | M | 2 |
| F-3 | [Paste-to-Post AI Extraction](#f-3-paste-to-post-ai-extraction) | M | 3 |
| F-4 | [Team Finder — Posts & Requests](#f-4-team-finder--posts--requests) | M | 4 |
| F-5 | [Invites, Connect & People Search](#f-5-invites-connect--people-search) | M | 5a |
| F-6 | [Event Registration](#f-6-event-registration) | M | 5b |
| F-7 | [Credentials & Verification](#f-7-credentials--verification) | M | 6 |
| F-8 | [Analytics & Department Ranking](#f-8-analytics--department-ranking) | M | 7a |
| F-9 | [Notifications & Home Feed](#f-9-notifications--home-feed) | M | 7b |
| F-10 | [Admin, Settings & Hardening](#f-10-admin-settings--platform-hardening) | M/S | 8 |

---

## Global Engineering Standards

### Response Shape (every route)
```ts
{ data: T }                                         // success
{ error: { code: string; message: string } }        // failure
```

### Layering Rule
```
Route (Zod validate) → Controller (thin) → Service (all logic) → Model
```
A module may call another module only through its **service**, never its model.

### TypeScript
- `strict: true`, no `any`, no unexplained assertions.
- Zod schemas end in `Schema`; types from `z.infer<>`.
- Every cross-layer function has typed I/O.
- All async handlers wrapped in `asyncHandler`.

### Security Baseline (inherited by every feature)
- JWT from `Authorization: Bearer` **or** httpOnly cookie `SameSite=Strict`.
- `requireAuth` + `requireRole([...])` on every protected route.
- `role`, `department`, `userId` always from token/DB — **never from request body**.
- `passwordHash` and `phone` are `select: false` — never leak.
- All secrets in `.env`, validated at startup.
- `AppError` shapes; stack traces never reach clients in production.

### Folder Skeleton
```
server/src/modules/<feature>/
  <feature>.model.ts      # Mongoose schema + indexes
  <feature>.schema.ts     # Zod request/response schemas
  <feature>.service.ts    # Business logic only
  <feature>.controller.ts # Thin request/response bridge
  <feature>.routes.ts     # Route wiring + middleware
  <feature>.test.ts       # Supertest integration tests

client/src/features/<feature>/
  api/<feature>.api.ts    # TanStack Query functions
  components/             # Dumb UI pieces
  hooks/                  # useXxx hooks
  pages/                  # Full page components
  schemas/                # Client-side Zod
  types.ts
  index.ts                # Public barrel export
```

---

---

# F-0: Project Scaffold & Infrastructure

## Overview
One-time monorepo setup. No user-facing feature ships, but every subsequent feature depends on this.

## Deliverables
| Artifact | Description |
|----------|-------------|
| `server/` | Express + `/api/v1/health`, MongoDB, Zod env, error handler, lint |
| `client/` | Vite + React PWA shell, Router, TanStack Query, Tailwind |
| `AGENT_RULES.md` | Project rules file at repo root |
| `docs/spikes.md` | NPTEL QR spike + LLM spike results |

## Infrastructure Decisions
| Concern | Decision |
|---------|----------|
| Scheduled jobs | `node-cron` (in-process, zero infra, fine for pilot) |
| Caching | `node-cache`: 60 s event feed, 30 s `/home`, 5 min analytics |
| File storage | Cloudinary (free tier), `multer` for parsing |
| Token storage | httpOnly cookie + SameSite=Strict + CSRF double-submit |
| Logging | Structured JSON + `request-id` header |
| API versioning | `/api/v1/` prefix on all routes |

## Key Files
```
server/src/
  app.ts, server.ts, routes.ts
  config/env.ts (Zod), config/db.ts (retry + graceful shutdown)
  shared/middleware/ auth.ts  requireRole.ts  validate.ts  rateLimit.ts  errorHandler.ts
  shared/utils/     asyncHandler.ts  hash.ts  pagination.ts
  shared/errors.ts  shared/types.ts
```

## Acceptance Criteria
- [ ] `GET /api/v1/health` → `{ data: { status:"ok" } }`
- [ ] Bad `.env` → startup throws a clear descriptive error
- [ ] SIGTERM drains in-flight requests, closes DB connection
- [ ] Client renders at `/` with zero console errors
- [ ] `tsc --noEmit` + ESLint pass clean
- [ ] Spike results written in `docs/spikes.md`

## Agent Task Prompt
```
TASK: Set up the full project scaffold.
CONTEXT: New monorepo. Folder structure in Master Reference §21.
FILES: server/src/app.ts, server.ts, routes.ts, config/env.ts, config/db.ts,
       shared/middleware/*, shared/utils/*, shared/errors.ts, shared/types.ts,
       client/src/ (Vite+React+Tailwind+PWA shell), AGENT_RULES.md
ACCEPTANCE CRITERIA:
1. GET /api/v1/health → 200.
2. Missing env var → descriptive startup error.
3. SIGTERM handler drains and closes DB.
4. Client renders at / with no errors.
5. tsc + ESLint clean.
OUT OF SCOPE: Any business module.
HOW I WILL TEST: curl /api/v1/health, npm run lint, npx tsc --noEmit.
Write a plan first and wait for my approval.
```

---

---

# F-1: Authentication & Profiles

## Overview
Students register with `enrollmentNo` + `collegeId`, verified against pre-loaded `StudentRoster`. OTP confirms email. Faculty/admin created by admin. Every other feature depends on the JWT produced here.

**Requirements:** FR-1, FR-2, FR-3, FR-4, FR-5

## Data Model
```ts
// StudentRoster
{ enrollmentNo, collegeId, name, department(→Dept), year, email?, claimedBy?(→User) }

// User
{ enrollmentNo, collegeId, name, email, passwordHash(select:false),
  role: 'student'|'faculty'|'dept_head'|'admin',
  department(→Dept), year, skills[], phone(select:false), phoneVisible,
  allowInvites, status: 'pending'|'active'|'suspended',
  emailVerified, lastLoginAt, firstOpenedAt, firstEventOpenedAt }
// Indexes: { department,year }, { skills }

// Otp
{ userId, purpose, codeHash, attempts, expiresAt }
// TTL index on expiresAt

// Department
{ code, name, studentStrength, headId(→User) }
```

## API Contract
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/auth/register` | Public | Create user from roster; send OTP |
| `POST` | `/api/v1/auth/verify-otp` | Public | Activate account; issue JWT |
| `POST` | `/api/v1/auth/login` | Public | Issue JWT |
| `POST` | `/api/v1/auth/resend-otp` | Public | Resend (rate-limited) |
| `GET` | `/api/v1/users/me` | student+ | Own full profile |
| `PUT` | `/api/v1/users/me` | student+ | Update skills, phone, visibility |
| `GET` | `/api/v1/users/:id` | student+ | Public profile only |
| `POST` | `/api/v1/roster/import` | admin | Bulk CSV import |

```ts
// POST /api/v1/auth/register
Body:     { enrollmentNo, collegeId, password }
Response: { data: { userId, message: "OTP sent" } }

// GET /api/v1/users/:id   — never returns phone/email
Response: { data: { id, name, branch, year, skills, allowInvites } }
```

## Business Rules
| Rule | Enforcement |
|------|-------------|
| Verify both `enrollmentNo` AND `collegeId` against roster | `auth.service` |
| `name`, `department`, `year` copied from roster — never body | `auth.service` |
| bcrypt salt rounds ≥ 10 | `auth.service` |
| OTP: 10 min TTL, max 3 attempts | TTL index + counter |
| Only `status:'active'` can log in | `auth.service` |
| Login rate limit: 5/min per IP | `rateLimit.ts` |
| `firstOpenedAt` set on first ever login | `user.service` |

## Security Checklist
- [ ] `passwordHash` `select:false` — never in any response
- [ ] `phone` `select:false`
- [ ] JWT secret from env, never hard-coded
- [ ] OTP hash stored, not plain code
- [ ] Rate limit on `/login` and `/verify-otp`

## Acceptance Criteria
- [ ] Register with valid unclaimed roster row → pending user + OTP sent
- [ ] Unknown enrollment → `404`; already claimed → `409`
- [ ] Wrong password → `401`; pending user login → `403`
- [ ] `GET /users/:id` — zero contact fields in response
- [ ] Student calling faculty-only route → `403`
- [ ] 6th login attempt in a minute → `429`

## Frontend Components
| Component | States |
|-----------|--------|
| `LoginPage` `/login` | form · loading · error |
| `RegisterPage` `/register` | form · loading · error |
| `OtpPage` `/verify` | form · resend · loading · error |
| `ProfilePage` `/profile` | loading · view · edit |
| `useAuth` hook | token · user · login() · logout() |
| `ProtectedRoute` | redirects to `/login` |

## Test Strategy
Unit: `hashPassword`, OTP generate/check.  
Integration: register success, unknown enrollment, claimed, wrong password, pending login, expired OTP, rate limit.

## Agent Task Prompt
```
TASK: Build StudentRoster model + CSV import, User model, auth endpoints.
CONTEXT: modules/auth/, modules/users/, modules/roster/. FR-1–5. §7.3.1.
FILES: roster.model.ts, roster.service.ts, scripts/importRoster.ts,
       user.model.ts, user.schema.ts, user.service.ts,
       auth.schema.ts, auth.service.ts, auth.controller.ts, auth.routes.ts, auth.test.ts
ACCEPTANCE CRITERIA:
1. POST /register checks enrollmentNo+collegeId vs roster; copies name/dept/year.
2. passwordHash never returned.
3. POST /verify-otp activates user; returns JWT in httpOnly cookie + body.
4. POST /login: 401 wrong password, 403 pending, 429 after 5 attempts/min.
5. GET /users/:id never returns phone or email.
6. Supertest cases for all failure paths.
OUT OF SCOPE: Profile update UI, admin user management.
Write a plan first and wait for my approval.
```

---

---

# F-2: Event Feed & Management

## Overview
Faculty post events; students see a filterable, deadline-sorted feed. Counters on `Event` are denormalized for fast card rendering. A daily cron closes events past deadline.

**Requirements:** FR-6, FR-7, FR-9, FR-10, FR-S5, FR-S6

## Data Model
```ts
// Event
{ title, type: enum[6], organizer, deadline, eventDate,
  eligibility: { branches[], years[], notes },
  teamSize: { min, max }, fee, link, summary,
  registrationMode: 'in_app'|'external', registrationDeadline,
  counters: { students:0, teams:0, tracking:0 },
  rawMessage,    // original pasted text — never sent to students
  extraction: { model, promptVersion, editedFields[], usedFallback },
  postedBy(→User), status: 'draft'|'published'|'closed'|'archived',
  deletedAt?     // soft-delete }
// Indexes: { status,deadline }, { type,deadline }
// State: draft → published → closed → archived
```

## API Contract
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/events` | student+ | Paginated feed with filters |
| `GET` | `/api/v1/events/:id` | student+ | Event detail |
| `POST` | `/api/v1/events` | faculty+ | Create draft |
| `PUT` | `/api/v1/events/:id` | faculty+ | Edit (owner or admin) |
| `PATCH` | `/api/v1/events/:id/publish` | faculty+ | Publish draft |
| `PATCH` | `/api/v1/events/:id/close` | faculty+ | Close |
| `DELETE` | `/api/v1/events/:id` | faculty+ | Soft-delete |
| `POST` | `/api/v1/events/:id/bookmark` | student | Toggle bookmark |

```
GET /api/v1/events?type=hackathon,competition&branch=CSE&year=2,3&cursor=<id>&limit=20
```
Students always see only `status:'published'` — this filter is **server-enforced**, not a query param.

## Business Rules
| Rule | Enforcement |
|------|-------------|
| Students see only published events | Service always appends `{ status:'published' }` for student role |
| `postedBy` from token, never body | Service: `postedBy = req.user.id` |
| Edit/close/delete: owner or admin only | Service ownership check |
| `rawMessage` never returned to student role | Projection excludes it |
| Daily cron closes events where `deadline < now` | `jobs/closeEvents.ts` |

## Security Checklist
- [ ] Student role cannot override `status` filter via query param
- [ ] `rawMessage` excluded from student responses
- [ ] Ownership check before any mutation

## Acceptance Criteria
- [ ] Students see only published events; closed event disappears from feed
- [ ] `?type=hackathon` filters correctly
- [ ] Faculty can create draft → publish
- [ ] Student `POST /events` → `403`; faculty editing another's event → `403`
- [ ] Cron closes expired events daily

## Frontend Components
| Component | States |
|-----------|--------|
| `EventFeedPage` `/events` | loading (skeletons) · empty · error · list |
| `EventCard` | normal · closing-soon (red badge) · closed |
| `EventFilterBar` | type · branch · year chips |
| `EventDetailPage` `/events/:id` | loading · view · error |
| `FacultyPostEventPage` `/events/new` | blank form → confirm |
| `BookmarkButton` | bookmarked / not |

## Agent Task Prompt
```
TASK: Events module — model, CRUD, feed, seed, close-events cron.
CONTEXT: modules/events/. §7.3.3. FR-6,7,9,10.
FILES: event.model.ts, event.schema.ts, event.service.ts, event.controller.ts,
       event.routes.ts, event.test.ts, jobs/closeEvents.ts, scripts/seedEvents.ts
ACCEPTANCE CRITERIA:
1. GET /events returns published events, cursor-paginated, filterable.
2. POST /events (faculty) creates draft.
3. PATCH /events/:id/publish publishes; triggers student notifications (stub ok).
4. Student → 403 on POST; other faculty's event edit → 403.
5. rawMessage never in student response.
6. Cron closes expired events.
7. Seed 10+ events (mix of types, deadlines, registration modes).
OUT OF SCOPE: Extraction (F-3), registration counters (F-6).
Write a plan first and wait for my approval.
```

---

---

# F-3: Paste-to-Post AI Extraction

## Overview
Faculty paste a raw announcement. LLM extracts structured fields. Faculty review (uncertain fields highlighted) and confirm. Regex baseline runs in parallel for the research evaluation. Raw text + edited fields saved as labeled dataset.

**Requirements:** FR-8, FR-9, FR-S6, FR-S7

## Pipeline
```
POST /api/v1/events/extract
 ├─ per-user quota check (20/day from Setting)
 ├─ send rawMessage ONLY to llm.service
 │    ├─ build prompt with fixed JSON schema
 │    ├─ call LLM API (timeout 10s, retry 3x exponential backoff)
 │    ├─ Zod safeParse response
 │    └─ return { extracted, uncertainFields[], usedFallback }
 ├─ run regex.service in parallel (for comparison)
 └─ return to client (rawMessage stripped)

Fallback order:
  1. LLM success → highlighted card
  2. LLM fail → regex results + empty fields
  3. Both fail → empty form beside raw text
```

> **Rule:** Only the raw announcement string goes to the LLM. No student names, enrollment numbers, or personal data.

## API Contract
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/events/extract` | faculty+ | Extract from raw text |

```ts
Body:     { rawMessage: string }   // max 5000 chars
Response: { data: { extracted: Partial<EventFields>, uncertainFields: string[], usedFallback: boolean } }
```

## LLM Prompt Schema
```
Return ONLY a JSON object. null for missing/uncertain fields.
Fields: title, type (hackathon|competition|sports|workshop|seminar|other),
organizer, deadline (ISO8601), eventDate (ISO8601),
eligibility_branches (string[]), eligibility_years (number[]),
teamSize_min, teamSize_max, fee, link (URL), summary (≤100 words).
Announcement: """{ rawMessage }"""
```

## Business Rules
| Rule | Enforcement |
|------|-------------|
| Per-user quota: 20/day | Count `AuditLog` extract entries per user; limit from `Setting.extractionsPerDay` |
| LLM API key server-side only | `config/env.ts` — never in client bundle |
| LLM output always Zod-validated | `safeParse`; failure → fallback |
| Dates validated; invalid → `null`, highlighted | Zod date refinement |
| URLs validated `^https?://` | Zod `.url()` |
| `promptVersion` stored on confirmed Event | Constant in `llm.service`; incremented on prompt changes |
| Retry on 429/timeout | Max 3 retries: 1s → 2s → 4s |

## Security Checklist
- [ ] `LLM_API_KEY` only in `.env`, never logged
- [ ] Only raw announcement string sent to LLM — zero PII
- [ ] Per-user quota enforced server-side
- [ ] `safeParse` failure never crashes the endpoint

## Acceptance Criteria
- [ ] Real announcement → structured card in < 10 s
- [ ] Uncertain fields listed in `uncertainFields`
- [ ] Simulated LLM timeout → graceful fallback (no 500)
- [ ] 21st extraction in a day → `429`
- [ ] `promptVersion` stored on confirmed event
- [ ] `editedFields` accurately records faculty changes
- [ ] Evaluation script prints field-level F1 for regex vs LLM

## Frontend Components
| Component | Description |
|-----------|-------------|
| `PasteToPostPage` | Textarea + Extract button |
| `ExtractionConfirmForm` | Pre-filled form; uncertain fields highlighted yellow; raw text in collapsible panel |
| `UncertainBadge` | "AI uncertain — please verify" chip |

## Agent Task Prompt
```
TASK: Paste-to-post extraction pipeline.
CONTEXT: modules/events/extraction/. FR-8,9. FR-S6,S7.
FILES: extraction/llm.service.ts, extraction/regex.service.ts,
       extraction/extraction.schema.ts, (update) event.routes.ts,
       scripts/evaluateExtraction.ts
ACCEPTANCE CRITERIA:
1. POST /events/extract: LLM call → Zod validate → return extracted + uncertainFields.
2. LLM fail/timeout → regex fallback or empty form.
3. Retry 3x exponential backoff on 429/timeout.
4. Per-user quota 20/day from Setting.
5. LLM_API_KEY only from env, never logged.
6. promptVersion constant in llm.service; stored on confirmed Event.
7. Eval script: precision/recall/F1 per field from labeled CSV.
OUT OF SCOPE: Event creation (F-2), confirm form UI details.
Write a plan first and wait for my approval.
```

---

---

# F-4: Team Finder — Posts & Requests

## Overview
Path A of team formation: student creates a team post; another student sends a join request; owner accepts/declines; contact revealed after acceptance. Includes the contact-reveal rule and daily/expiry limits.

**Requirements:** FR-11–15, FR-36–38, FR-41

## Data Model
```ts
// TeamPost
{ eventId, ownerId, title, description, rolesNeeded[], spotsTotal, spotsLeft,
  status: 'open'|'full'|'closed'|'expired', expiresAt }
// Index: { eventId, status }

// TeamLink
{ direction: 'request'|'invite'|'connect',
  fromUserId, toUserId, eventId?, teamPostId?,
  message,       // ≤200 chars, plain text, no URLs
  status: 'pending'|'accepted'|'declined'|'withdrawn'|'expired',
  expiresAt,     // createdAt + 7 days
  respondedAt }
// Indexes:
//   { toUserId, status, createdAt } — inbox
//   { fromUserId, status, createdAt } — sent
//   { fromUserId, toUserId, eventId } unique partial on status='pending'
//   { expiresAt } partial on status='pending'
```

## API Contract
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/events/:id/teams` | student+ | List team posts |
| `POST` | `/api/v1/teams` | student | Create team post |
| `PATCH` | `/api/v1/teams/:id` | student | Edit / close (owner) |
| `POST` | `/api/v1/links` | student | Send request/invite/connect |
| `PATCH` | `/api/v1/links/:id` | student | Accept/decline/withdraw |
| `GET` | `/api/v1/links?box=in\|out` | student | Inbox / sent |

## Contact Reveal Rule (server-enforced)
```ts
// Only after accept, only if phoneVisible=true
if (link.status === 'accepted' && toUser.phoneVisible) {
  return { phone: toUser.phone }   // fetched with select('+phone')
} else {
  return { hint: "Ask leader to share a WhatsApp group link" }
}
// phone NEVER appears in pending/declined/expired responses
```

## Business Rules
| Rule | Value | Enforcement |
|------|-------|-------------|
| Daily link limit | 10 invites+connects/day | Count today's links; limit from `Setting.linksPerDay` |
| One pending per pair per event | — | Unique partial index |
| Expiry | 7 days | `jobs/expireLinks.ts` daily cron |
| Decline cool-down | 30 days | Query declined link < 30 days before resend |
| `spotsLeft` atomic decrement | Cannot go below 0 | `$inc` with condition `{ spotsLeft: {$gt:0} }` |
| Team post auto-close at event deadline | — | `jobs/closeTeamPosts.ts` |
| Block check before any link creation | — | Query `Block` collection first |
| Message validation | plain text, ≤200 chars, no URLs | Zod refinement |

## Security Checklist
- [ ] `phone` never in `GET /links` response unless accepted + phoneVisible
- [ ] `spotsLeft` decrement is atomic — concurrent test required
- [ ] Block list checked before link insertion
- [ ] Owner check on team post edit/close
- [ ] Daily limit reads from `Setting`, not hard-coded

## Acceptance Criteria
- [ ] Create post → send join request → owner accepts → spotsLeft decrements → contact revealed
- [ ] Concurrent accepts: only one succeeds; other gets clear error
- [ ] 11th link in a day → `429`
- [ ] Duplicate pending pair/event → `409`
- [ ] Decline cool-down: resend within 30 days → `429`
- [ ] Expired links auto-set to `expired` by cron
- [ ] Team post auto-closed at event deadline
- [ ] `phone` absent from any non-accepted response

## Frontend Components
| Component | States |
|-----------|--------|
| `TeamPostsPage` | loading · empty ("Be the first") · error · list |
| `TeamPostCard` | open · full · closed · expired |
| `CreateTeamPostForm` | roles · spots · description |
| `RequestToJoinModal` | optional message · send |
| `LinkInboxPage` `/teams/inbox` | tabs: In / Sent |
| `LinkCard` | pending · accepted (contact) · declined · expired |
| `MyTeamView` | Per-event: members · status · WhatsApp reveal |

## Agent Task Prompt
```
TASK: Team posts and join request flow (Path A).
CONTEXT: modules/teams/, modules/links/. §7.3.4. FR-11–15, FR-36–38.
FILES: teamPost.model.ts/.schema/.service/.controller/.routes/.test,
       teamLink.model.ts/.schema/.service/.controller/.routes/.test,
       jobs/expireLinks.ts, jobs/closeTeamPosts.ts
ACCEPTANCE CRITERIA:
1. POST /teams creates a team post (student only).
2. POST /links (direction=request) sends join request; checks block + daily limit.
3. PATCH /links/:id accept by owner: spotsLeft $inc with {spotsLeft:{$gt:0}} condition.
4. Concurrent accepts: only one wins — test this with Promise.all.
5. phone only returned after accept AND phoneVisible=true.
6. Decline cool-down (30d) and 7-day expiry enforced.
7. Cron expires pending links; closes team posts at event deadline.
OUT OF SCOPE: Paths B/C (F-5), registration (F-6).
Write a plan first and wait for my approval.
```

---

---

# F-5: Invites, Connect & People Search

## Overview
Paths B (leader invites from profile/search) and C (direct connect to any student), people search, "I'm looking for a team" flag, and safety tools (block, report). All three paths reuse the `TeamLink` collection.

**Requirements:** FR-32–38 (full set), FR-34, FR-35

## Data Model
```ts
// LookingFlag
{ userId, eventId, note(≤120) }
// Unique: { userId, eventId }; Index: { eventId }

// Block  { userId, blockedUserId }  Unique: { userId, blockedUserId }
// Report { reporterId, targetUserId?, linkId?, reason(≤500), status }
```
TeamLink reused with `direction:'invite'` or `direction:'connect'`.

## API Contract
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/people` | student+ | Search by skills/branch/year |
| `PUT` | `/api/v1/events/:id/looking` | student | Toggle looking flag |
| `GET` | `/api/v1/events/:id/looking` | student+ | List students looking |
| `POST` | `/api/v1/links` (direction=invite\|connect) | student | Send invite/connect |
| `POST` | `/api/v1/blocks` | student | Block user |
| `POST` | `/api/v1/reports` | student | Report user or link |

```ts
// GET /api/v1/people?skills=react,ml&branch=CSE&year=2
// Response: [{ id, name, branch, year, skills, allowInvites, isLooking }]
// NO phone, email, enrollmentNo — ever
```

## Business Rules
| Rule | Enforcement |
|------|-------------|
| `allowInvites:false` → block invite/connect creation | Server `403`; client hides button |
| People search: zero contact fields | Projection in `user.service` |
| Block cascade: delete all pending links between pair | Cascade in `block.service` |
| Looking flag cleared when event closes | `jobs/closeTeamPosts.ts` also clears flags |
| Same daily limit (10/day) shared across invite + connect | Same counter as F-4 |

## Security Checklist
- [ ] `phone`, `email`, `enrollmentNo` never in people search response
- [ ] `allowInvites:false` enforced server-side, not just hidden client-side
- [ ] Block cascade verified with integration test

## Acceptance Criteria
- [ ] People search returns matching students with zero contact fields
- [ ] Student with `allowInvites:false` → invite creation returns `403`
- [ ] Blocking a user removes all their pending links
- [ ] Looking flag toggles; appears in event's looking list
- [ ] Invite accepted → same contact-reveal logic as Path A
- [ ] Report appears in admin queue

## Frontend Components
| Component | Description |
|-----------|-------------|
| `PeopleSearchPage` `/teams/people` | filter chips · student list |
| `StudentCard` | name · branch · year · skills · Invite/Connect (hidden if `allowInvites=false`) |
| `LookingToggle` | On event detail page |
| `LookingListPage` | Event sub-page |
| `BlockReportMenu` | Bottom-sheet on every incoming link card |

## Agent Task Prompt
```
TASK: People search, looking flag, invite/connect (Paths B & C), safety tools.
CONTEXT: modules/looking/, modules/safety/. §7.3.4. FR-32–38.
FILES: lookingFlag.model/.service/.routes, block.model, report.model,
       safety.service/.routes, (update) links/teamLink.service (invite+connect),
       (update) users/user.routes (people search)
ACCEPTANCE CRITERIA:
1. GET /people: skills/branch/year filter; zero contact fields.
2. Invite/connect respects allowInvites, daily limit, block check.
3. Block cascades pending link deletion (integration test required).
4. PUT /events/:id/looking toggles flag.
5. POST /reports stores for admin.
OUT OF SCOPE: Admin report UI (F-10).
Write a plan first and wait for my approval.
```

---

---

# F-6: Event Registration

## Overview
Two kinds: (1) **in-app** — full team registration with member consent; (2) **external** — "I registered" tracking. `Event.counters` updated atomically. Faculty see roster and export CSV.

**Requirements:** FR-42–51

## Data Model
```ts
// Registration
{ eventId, type: 'individual'|'team'|'tracking',
  teamName?, leaderId?,
  members: [{ userId, status: 'invited'|'confirmed' }],
  externalRegId?,
  status: 'draft'|'submitted'|'withdrawn'|'locked', submittedAt? }
// Unique: (eventId, members.userId) partial on status in [draft,submitted,locked]
// State: draft → submitted → withdrawn | locked (at registrationDeadline)
// Member: invited → confirmed | declined
```

## API Contract
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/events/:id/registrations` | student | Create registration |
| `PATCH` | `/api/v1/registrations/:id` | student | Edit / submit / withdraw |
| `PATCH` | `/api/v1/registrations/:id/members/:uid` | student | Confirm or decline |
| `GET` | `/api/v1/events/:id/registrations` | faculty+ | Roster |
| `GET` | `/api/v1/events/:id/registrations/export` | faculty+ | CSV |
| `POST` | `/api/v1/events/:id/tracking` | student | External tracking |

## Business Rules
| Rule | Enforcement |
|------|-------------|
| One active registration per student per event | Unique partial index |
| No member added without consent | Member `status:'invited'` until they confirm |
| Submit validates `teamSize.min/max` | Service validation |
| `Event.counters` updated atomically with registration change | MongoDB session + `$inc` |
| Declined member removed from `members[]`; can join another team | `registration.service` |
| Leader edit/withdraw until `registrationDeadline` | Service date check |
| Cron locks at `registrationDeadline` | `jobs/lockRegistrations.ts` |
| After `eventDate`: prompt registered students to add result | Notification trigger |

## Security Checklist
- [ ] Only `leaderId` can edit/submit/withdraw
- [ ] Member confirmation: only that member can call `PATCH /members/:uid`
- [ ] Counters in MongoDB session — no double-counting
- [ ] `locked` registrations reject all edits → `409`

## Acceptance Criteria
- [ ] Individual registration → `Event.counters.students` increments
- [ ] Team: leader adds members → each gets confirmation notification → confirmed members counted
- [ ] Duplicate student registration → `409`
- [ ] Team size outside limits on submit → `422`
- [ ] Cron locks all registrations at `registrationDeadline`
- [ ] Faculty roster shows all teams; CSV export is valid
- [ ] Declined member removed; spot freed

## Frontend Components
| Component | Description |
|-----------|-------------|
| `RegisterButton` | Context-aware: solo / team / external |
| `TeamRegistrationForm` | Multi-step: name → add members → submit |
| `MemberConfirmBanner` | Notification + page banner to confirm/decline |
| `RegistrationStatusCard` | State · members · team name |
| `FacultyRosterPage` `/events/:id/roster` | Table + CSV export |

## Agent Task Prompt
```
TASK: Event registration module.
CONTEXT: modules/registrations/. §7.3.3. FR-42–51.
FILES: registration.model/.schema/.service/.controller/.routes/.test,
       jobs/lockRegistrations.ts
ACCEPTANCE CRITERIA:
1. POST /events/:id/registrations creates individual or team registration.
2. Team members notified to confirm; no consent = not added.
3. Submit checks teamSize.min/max.
4. Event.counters updated inside MongoDB session ($inc atomic).
5. Declined member removed; can join another team.
6. Cron locks registrations at registrationDeadline.
7. Faculty GET roster + CSV export.
8. Unique partial index prevents duplicate active registration.
OUT OF SCOPE: Participation/proof upload (F-7).
Write a plan first and wait for my approval.
```

---

---

# F-7: Credentials & Verification

## Overview
Students upload certificates from a searchable catalog. Duplicate detection on `certificateId` + `proofHash`. Faculty verify for their department. Optional QR auto-verify pipeline for NPTEL (if week-0 spike succeeded).

**Requirements:** FR-16–22, FR-52–56, FR-S7 (upload limits)

## Data Model
```ts
// Course
{ issuer, name, code?, category, language?, aliases[], verificationMethod, active }
// Unique: (issuer,name); Text index: (name,aliases)

// Credential
{ studentId, department,   // department ALWAYS from req.user, never body
  courseId?, otherCourseName?,
  issuer, session, year, tier,
  certificateId,
  proofUrl, proofHash,     // SHA-256 server-computed
  qr?: { url, host },
  verification: {
    status: 'pending'|'verified'|'rejected',
    method: 'issuer_qr'|'faculty'|'admin',
    verifiedBy?, verifiedAt?, reason?, evidence? } }
// Unique: (issuer,certificateId) partial; Unique: proofHash
// Indexes: (dept,year,verif.status), (studentId,createdAt desc)

// Participation (shared Verification sub-doc)
{ eventId, registrationId?, teamName, members[{userId,department}],
  result, resultNote, proofUrl, proofHash, verification }
```

## QR Auto-Verification Pipeline
```
Upload PDF → decode QR (jsQR/zbar)
  → validate host against allowlist (nptel.ac.in only)
  → server-side fetch (5s timeout, 1MB limit, SSRF-hardened)
  → fuzzy compare: name, course, roll, session
  → Match   → verified, method='issuer_qr', evidence stored
  → Mismatch → rejected with reason
  → Fetch fail → send to faculty queue (status remains pending)
```

## API Contract
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/courses` | student+ | Search catalog |
| `POST` | `/api/v1/courses` | admin | Add course |
| `PATCH` | `/api/v1/courses/:id/aliases` | admin | Add alias |
| `POST` | `/api/v1/credentials` | student | Upload credential (multipart) |
| `GET` | `/api/v1/credentials/me` | student | Own credentials |
| `GET` | `/api/v1/credentials/pending` | faculty+ | Dept queue |
| `PATCH` | `/api/v1/credentials/:id/verify` | faculty+ | Approve/reject |
| `PATCH` | `/api/v1/credentials/:id` | student | Edit pending |
| `POST` | `/api/v1/participations` | student | Upload participation proof |
| `PATCH` | `/api/v1/participations/:id/verify` | faculty+ | Verify participation |

## Business Rules
| Rule | Enforcement |
|------|-------------|
| `department` from `req.user.department` — never body | `credential.service` |
| Upload limits: 5/24h, 15 pending | Count recent docs; limits from `Setting` |
| Duplicate `certificateId` → `409` with link to existing record | Unique index |
| Duplicate `proofHash` → `409` | Unique index |
| "Other" course → admin queue; `courseId` null | Service handles `otherCourseName` |
| Self-verify blocked | `credential.studentId.equals(req.user.id)` → `403` |
| Editing verified resets to pending | Service resets `verification.status` |
| Faculty see only own department queue | `department = req.user.department` filter |
| Every verification writes AuditLog | `audit.service` called from credential service |
| QR: allowlisted host only; resolve IP, reject private ranges; 5s timeout | `qr-verify.service` |
| Spot-check: 10% of verified items monthly | `jobs/spotCheck.ts` |

## Security Checklist
- [ ] File MIME check (PDF/JPG/PNG), max 10 MB
- [ ] `proofHash` computed server-side, never from client
- [ ] `department` always from `req.user.department`
- [ ] Self-verify blocked
- [ ] QR fetch: allowlist + IP range check + timeout

## Acceptance Criteria
- [ ] Upload NPTEL cert → lands in faculty department queue
- [ ] 6th upload in 24h → `429`
- [ ] Duplicate `certificateId` → `409` with existing record link
- [ ] Duplicate `proofHash` → `409`
- [ ] Faculty approve → AuditLog written; status → `verified`
- [ ] Self-verify → `403`
- [ ] Edit verified credential → resets to `pending`
- [ ] "Other" course → admin queue; student sees "under review"
- [ ] QR auto-verify: match → verified; mismatch → rejected; fetch fail → faculty queue
- [ ] Spot-check cron picks ~10% monthly

## Frontend Components
| Component | States |
|-----------|--------|
| `AddAchievementPage` | form · loading · success · error |
| `CourseSearchInput` | searching · results · empty · "Other" option |
| `MyAchievementsPage` ("Achievements" tab) | loading · empty · list |
| `CredentialCard` | status chip · proof link · resubmit button (rejected) |
| `FacultyVerificationQueuePage` `/verify` | loading · empty · list (oldest first) |
| `VerifyModal` | approve / reject + reason selector |

## Agent Task Prompt
```
TASK: Credentials upload and verification module.
CONTEXT: modules/credentials/, modules/courses/, modules/participations/. §7.3.2. FR-16–22, FR-52–56.
FILES: course.model/.schema/.service/.controller/.routes,
       credential.model/.schema/.service/.controller/.routes/.test,
       qr-verify.service.ts,
       participation.model/.service/.routes,
       jobs/spotCheck.ts
ACCEPTANCE CRITERIA:
1. POST /credentials (multipart); department from req.user.
2. Upload limits 5/24h, 15 pending from Setting.
3. Duplicate certificateId or proofHash → 409.
4. "Other" course → courseId null, otherCourseName set, admin queue.
5. PATCH /credentials/:id/verify: own-dept faculty; self-verify → 403; edit-verified → reset pending; AuditLog written.
6. QR pipeline: allowlist, IP check, timeout, fuzzy compare, evidence stored.
7. Spot-check cron 10% monthly.
OUT OF SCOPE: Analytics aggregation (F-8).
Write a plan first and wait for my approval.
```

---

---

# F-8: Analytics & Department Ranking

## Overview
Aggregates verified credentials/participations into department rankings. Three metrics (participation rate default), admin-configurable weights, 5-min cache. Department heads see only their department.

**Requirements:** FR-23–28

## Ranking Formulas
```
Participation Rate = unique students with ≥1 verified credential / studentStrength × 100
Certs per 100     = total verified credentials / studentStrength × 100
Weighted Points   = Σ tierPoints[tier] / studentStrength × 100
  tierPoints: { pass:1, elite:2, elite_silver:3, elite_gold:4 } — from Setting
```
**Default metric:** `participationRate`. Show all three side-by-side.  
**Guard:** never divide when `studentStrength = 0` (exclude such departments).

## API Contract
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/analytics/department-ranking` | dept_head+ | Ranked list |
| `GET` | `/api/v1/analytics/breakdown/:deptId` | dept_head+ | Per-dept breakdown |
| `GET` | `/api/v1/analytics/summary` | admin | Institute-wide |
| `GET` | `/api/v1/analytics/export` | admin | CSV (PDF = could-have) |

```ts
// Response shape
{ data: [{ department: {id,code,name}, studentStrength, uniqueStudents,
           totalCredentials, participationRate, perHundred, weightedPointsPerHundred, rank }] }
```

## Core Aggregation Pipeline (from Master Reference §7.6)
```js
Credential.aggregate([
  { $match: { 'verification.status':'verified', year:2026 } },
  { $group: { _id:{dept:'$department',student:'$studentId'}, n:{$sum:1} } },
  { $group: { _id:'$_id.dept', students:{$sum:1}, certificates:{$sum:'$n'} } },
  { $lookup: { from:'departments', localField:'_id', foreignField:'_id', as:'d' } },
  { $unwind:'$d' },
  { $match: { 'd.studentStrength':{$gt:0} } },
  { $project: {
      code:'$d.code',
      participationRate: { $multiply:[{$divide:['$students','$d.studentStrength']},100] },
      perHundred: { $multiply:[{$divide:['$certificates','$d.studentStrength']},100] }
  }},
  { $sort:{ participationRate:-1 } }
])
```

## Caching
```
node-cache (in-memory)
  /analytics/department-ranking  → 5 min TTL
  /analytics/summary             → 5 min TTL
  /analytics/breakdown/:deptId   → 5 min TTL
Cache invalidated on each credential verify/reject.
```

## Business Rules
| Rule | Enforcement |
|------|-------------|
| Only verified credentials count | `$match: {'verification.status':'verified'}` always |
| `studentStrength=0` excluded | `$match: {'d.studentStrength':{$gt:0}}` |
| `dept_head` sees only own dept breakdown | Service ownership check |
| Weights editable without code change | Read from `Setting.tierPoints` |

## Security Checklist
- [ ] `dept_head` cannot call `/analytics/summary` → `403`
- [ ] `dept_head` cannot query another dept's breakdown → `403`
- [ ] Cache invalidated on credential verification

## Acceptance Criteria
- [ ] Ranking matches hand-calculated spreadsheet on seed data
- [ ] `?metric=per_hundred` changes sort order
- [ ] `studentStrength=0` dept absent from ranking
- [ ] Admin changes `tierPoints` in Setting → next call reflects new weights
- [ ] `dept_head` calling `/analytics/summary` → `403`
- [ ] Cache: second call in 5 min hits cache (not MongoDB)
- [ ] CSV export contains correct data

## Frontend Components
| Component | Description |
|-----------|-------------|
| `DepartmentDashboardPage` `/analytics` | Year picker · metric switcher · ranked table |
| `RankCard` | All three metrics visible per row |
| `BreakdownPage` `/analytics/:deptId` | Category breakdown bar chart (Recharts) |
| `AdminAnalyticsPage` | Institute summary + export button |

## Agent Task Prompt
```
TASK: Analytics and department ranking module.
CONTEXT: modules/analytics/. §7.6. FR-23–28.
FILES: analytics/analytics.service.ts, analytics.controller.ts,
       analytics.routes.ts, analytics.test.ts
ACCEPTANCE CRITERIA:
1. GET /analytics/department-ranking: all three metrics; sorted by ?metric= param.
2. tierPoints from Setting; studentStrength=0 excluded.
3. dept_head sees only own dept breakdown; /summary admin-only.
4. node-cache 5 min; invalidated on credential verify.
5. GET /analytics/export → CSV.
6. Output verified against manual spreadsheet on seed data.
OUT OF SCOPE: PDF report, Setting UI (F-10).
Write a plan first and wait for my approval.
```

---

---

# F-9: Notifications & Home Feed

## Overview
Single `GET /home` endpoint (30 s cached per user). Notifications sent async via email (M) + web push (S). Six notification types. PWA service worker caches event feed + profile for offline.

**Requirements:** FR-29, FR-30, FR-31, FR-39, FR-40, FR-S3

## Data Model
```ts
// Notification
{ userId, type: enum[6], payload: Mixed, readAt? }
// Index: { userId, readAt, createdAt desc }

// PushSubscription
{ userId, endpoint(unique), keys: { p256dh, auth } }
```

## Notification Types
| Type | Trigger | Channel |
|------|---------|---------|
| `event_new` | New published event matching branch/year | Push + email digest |
| `deadline` | 48h and 4h before event deadline | Push |
| `link_received` | Request/invite/connect received | Push + email |
| `link_update` | Link accepted or declined | Push |
| `credential_update` | Credential verified or rejected | Push + email |
| `link_expiring` | Pending link expires tomorrow | Push |

## Home Endpoint
```ts
GET /api/v1/home
Response: { data: {
  user: { name, branch, year, verifiedBadgeCount },
  pendingRequestCount: number,
  closingSoonEvents: Event[],    // deadline < now+48h, limit 5
  matchedTeamPosts: TeamPost[],  // matched on skills → fallback branch/year
  unreadNotificationsFlag: boolean
} }
// Cached 30s per userId
// Empty arrays → key omitted from response (client never renders empty blocks)
```

## API Contract
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/home` | student+ | Home data |
| `GET` | `/api/v1/notifications` | student+ | List in-app |
| `PATCH` | `/api/v1/notifications/:id/read` | student+ | Mark read |
| `POST` | `/api/v1/push/subscribe` | student | Register endpoint |
| `DELETE` | `/api/v1/push/subscribe` | student | Unsubscribe |

## Business Rules
| Rule | Enforcement |
|------|-------------|
| `userId` from token, never query param | Service uses `req.user.id` |
| Notification sending is async — never blocks API response | Fire-and-forget background function |
| iOS push fallback → email | Catch push error → send email |
| Daily cap: 5 non-urgent push per user | Counter in notification service |
| `firstEventOpenedAt` set on first `GET /events/:id` | `event.service` sets it once |
| Home cache invalidated on new event / new link | Cache key invalidated in respective services |

## Security Checklist
- [ ] `/home` reads `userId` from token only
- [ ] Push subscription stored per user — cannot subscribe on behalf of another
- [ ] Push errors never surface as API errors

## Acceptance Criteria
- [ ] `GET /home` responds < 500 ms with seed data
- [ ] Closing-soon events correct (< 48h)
- [ ] No-skill student gets branch/year fallback for team posts
- [ ] Empty blocks absent from response (not empty arrays)
- [ ] New event → matching students get push + email (async)
- [ ] 48h and 4h deadline reminders fire from cron without double-sending
- [ ] Credential verified → student notified

## Frontend Components
| Component | States |
|-----------|--------|
| `HomePage` `/` | loading (skeletons) · populated · empty state |
| `GreetingBlock` | name · badge count |
| `PendingBanner` | only if `pendingRequestCount > 0` |
| `ClosingSoonSection` | horizontal scroll · hidden if absent |
| `MatchedTeamPostsSection` | list · hidden if absent |
| `NotificationsPage` `/notifications` | loading · empty · list |
| Service Worker | Cache: event feed + own profile for offline |

## Agent Task Prompt
```
TASK: Home feed endpoint + notifications module.
CONTEXT: modules/notifications/. §7.3.5 + §9.4. FR-29–31, FR-39.
FILES: notification.model/.service/.controller/.routes,
       home/home.controller, home/home.routes,
       jobs/deadlineReminders.ts,
       client: service-worker.ts, push setup
ACCEPTANCE CRITERIA:
1. GET /home: one round-trip; cached 30s per user; empty arrays omitted.
2. New event published → async push+email to matching students (non-blocking).
3. Deadline reminders cron at 48h and 4h; no double-send.
4. POST /push/subscribe saves subscription per user.
5. In-app notification list paginated.
6. Service worker caches event feed + own profile offline (FR-S3).
OUT OF SCOPE: Telegram bot (C-priority).
Write a plan first and wait for my approval.
```

---

---

# F-10: Admin, Settings & Platform Hardening

## Overview
Admin tools: user approval, course alias queue, platform settings (limits, ranking weights), safety report review, audit log. Final week: comprehensive tests, security audit, seed data, deployment, demo prep.

**Requirements:** FR-16 (catalog), FR-22–26 (settings), FR-37 (reports)

## Settings Document (singleton)
```ts
{
  _id: 'global',
  uploadsPer24h: 5, pendingCap: 15, linksPerDay: 10,
  linkExpiryDays: 7, declineCooldownDays: 30, sessionDays: 30,
  spotCheckPercent: 10, extractionsPerDay: 20,
  rankingMetric: 'participation_rate'|'per_hundred'|'weighted_points',
  tierPoints: { pass:1, elite:2, elite_silver:3, elite_gold:4 },
  updatedBy
}
// All limits read from this document at runtime — zero hard-coded values
```

## API Contract
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET/PUT` | `/api/v1/settings` | admin | Read/write global settings |
| `GET` | `/api/v1/admin/users` | admin | List users (filter by status/role) |
| `PATCH` | `/api/v1/admin/users/:id/approve` | admin | Approve pending |
| `PATCH` | `/api/v1/admin/users/:id/suspend` | admin | Suspend user |
| `GET` | `/api/v1/admin/courses/queue` | admin | "Other" alias queue |
| `PATCH` | `/api/v1/admin/courses/queue/:id` | admin | Map to existing or new course |
| `GET` | `/api/v1/admin/reports` | admin | Safety report queue |
| `PATCH` | `/api/v1/admin/reports/:id` | admin | Review / action |
| `GET` | `/api/v1/admin/audit` | admin | Audit log (paginated) |

## Security Audit Checklist
| Area | Check |
|------|-------|
| Auth coverage | Every route has `requireAuth`; protected routes have `requireRole` |
| Input validation | Zod on every body, query, param |
| Output sanitization | No `passwordHash`, `phone`, `email` in unexpected responses |
| Hard-coded secrets | `grep -r 'API_KEY\|SECRET\|PASSWORD' src/` — zero hits |
| Rate limits | Login, OTP, extract, link creation all limited |
| File uploads | MIME check, size limit, `proofHash` server-computed |
| QR fetch | Allowlist + IP range check + timeout + size limit |
| CSRF | Double-submit cookie pattern (if httpOnly cookie used) |
| Stack traces | Error handler strips stack in production |

## Test Coverage Targets
| Type | Target | Focus |
|------|--------|-------|
| Unit | Key rules | Ranking calc, upload limit check, duplicate detection, OTP hash |
| Integration | All critical paths | Auth flow, event CRUD, link state machine, credential verify, registration |
| Manual UAT | Demo checklist | 1 faculty + 3–5 students on deployed app |

## Deployment Checklist
- [ ] `.env` Zod-validated at startup — app refuses to start on bad config
- [ ] `SIGTERM` handler drains requests + closes DB
- [ ] Structured JSON logs with `request-id`
- [ ] `GET /api/v1/health` reports: `status`, last cron run times
- [ ] MongoDB Atlas daily backup enabled
- [ ] Frontend on Vercel/Netlify; backend on Render/Railway
- [ ] Cloudinary upload limits set (free tier)

## Demo Checklist (Master Reference §29.3)
- [ ] Faculty paste a real announcement → card confirmed → published
- [ ] Student sees it, forms a team, registers → card counters update
- [ ] Student uploads NPTEL cert → faculty verifies
- [ ] Department ranking updates → breakdown explains the change
- [ ] Extraction F1 numbers ready on one slide

## Frontend Components
| Component | Description |
|-----------|-------------|
| `AdminDashboardPage` `/admin` | Links to all admin sections |
| `UserManagementPage` | Approve · suspend · filter by role |
| `CourseAliasQueuePage` | Map "Other" submissions to catalog |
| `SettingsPage` | Edit all Setting fields |
| `ReportQueuePage` | Review reports · action users |
| `AuditLogPage` | Paginated filterable log |

## Agent Task Prompt
```
TASK: Admin and settings module + final hardening.
CONTEXT: modules/settings/, modules/admin/. §7.3.5. FR-26, FR-S4.
FILES: setting.model/.service/.controller/.routes,
       admin.service/.controller/.routes/.test
ACCEPTANCE CRITERIA:
1. GET/PUT /settings (admin only): reads/writes singleton Setting.
2. ALL business-rule limits read from Setting — grep confirms zero hard-coded values.
3. PATCH /admin/users/:id/approve → status='active'.
4. GET /admin/courses/queue lists otherCourseName credentials; PATCH maps them.
5. GET /admin/reports lists open reports; PATCH marks reviewed/actioned.
6. Audit log paginated, filterable.
7. Security checklist above passes with zero failures.
8. Demo checklist passes on deployed app.
OUT OF SCOPE: PDF report, Telegram bot.
Write a plan first and wait for my approval.
```

---

---

## Appendix A — Feature Dependency Graph

```
F-0  Scaffold
 └─ F-1  Auth & Profiles
       ├─ F-2  Event Feed
       │    └─ F-3  AI Extraction
       ├─ F-4  Team Posts & Requests
       │    └─ F-5  Invites, Connect, Search
       │         └─ F-6  Registration
       ├─ F-7  Credentials & Verification
       │    └─ F-8  Analytics & Ranking
       └─ F-9  Notifications & Home
            └─ F-10 Admin, Settings, Hardening
```

---

## Appendix B — Scheduled Jobs Summary

| Job | Schedule | Feature |
|-----|----------|---------|
| `closeEvents` | Daily 00:01 | F-2 |
| `expireLinks` | Daily 00:05 | F-4 |
| `closeTeamPosts` | Daily 00:07 | F-4 |
| `lockRegistrations` | Daily 00:10 | F-6 |
| `deadlineReminders` | Hourly | F-9 |
| `spotCheck` | 1st of month 09:00 | F-7 |

All jobs record `lastRunAt`. `GET /api/v1/health` exposes these times — a missed job becomes immediately visible.

---

## Appendix C — Cut Order

| Priority | Cut | What Stays |
|----------|-----|------------|
| 1 | Connect + looking flag (F-5 Path C) | Paths A & B |
| 2 | Web push (F-9) | Email + in-app |
| 3 | PDF annual report (F-8) | CSV export |
| 4 | QR auto-verify (F-7) | Faculty button |
| 5 | External event tracking (F-6) | In-app registration |
| 6 | Weighted points metric (F-8) | Participation rate + per-100 |

**Never cut:** Auth + roster check · Event feed · Paste-to-post + evaluation · Team request + accept · Credentials + faculty verify · Department ranking.

---

## Appendix D — Open Decisions

| ID | Decision | Recommendation |
|----|----------|----------------|
| OD-1 | JWT storage | httpOnly cookie + SameSite=Strict |
| OD-2 | Default ranking metric | Participation rate |
| OD-3 | "Badges" tab name | Rename to "Achievements" |
| OD-4 | Scheduled jobs runner | `node-cron` for pilot |
| OD-5 | QR auto-verify go/no-go | After week-0 spike result |
| OD-6 | Spot-check owner | Department faculty member |

---

*Campus Innovation Platform — Feature-Wise Implementation Plan · October 2026*
