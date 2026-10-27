# F-10: Admin Panel & Platform Settings — Git Commit Plan

> **Branch:** `main`
> **Format:** Conventional Commits
> **`tsc --noEmit` → 0 errors** on both server and client confirmed before push.
> **21 code files changed** (8 server new · 2 server modified · 9 client new · 2 client modified)

---

## Commit 1 — Settings schema + service (pure business logic)

```
feat(server/F-10): add settings schema, KEY_MAP service (getAllSettings, updateSettings)

modules/settings/setting.schema.ts:

  putSettingsSchema:
    All 9 fields optional — supports partial update (PATCH semantics under PUT).
    Fields: uploadsPer24h (1–50), pendingCap (1–100), linksPerDay (1–50),
            linkExpiryDays (1–90), declineCooldownDays (0–365),
            spotCheckPercent (1–100), extractionsPerDay (1–200),
            rankingMetric (enum 3 values), tierPoints (object, all int ≥ 0).
    .refine(): At least one field must be provided.

  SettingsDto interface:
    Canonical shape returned by GET and PUT.
    Single source of truth for client types.

modules/settings/setting.service.ts:

  KEY_MAP — maps each SettingsDto field to its Setting document key + default:
    Single source of truth. If a default changes here it changes everywhere.
    Defaults mirror what all feature services assume when the key is absent.
    9 entries (credentialUploadPerDay, credentialMaxPending, linksPerDay,
               linkExpiryDays, declineCooldownDays, spotCheckPercent,
               extractionsPerDay, rankingMetric, tierPoints).

  getAllSettings():
    Reads all 9 Setting keys in parallel via Promise.all + getSetting().
    Missing keys fall back to KEY_MAP defaults — safe on any environment.
    Returns fully populated SettingsDto (no undefined fields).

  updateSettings(body):
    Maps body fields through KEY_MAP to their Setting document keys.
    Runs all upserts in parallel via Promise.all + findOneAndUpdate({ upsert:true }).
    After writes: invalidateCachePrefix('analytics:') — tierPoints and
      rankingMetric changes directly affect ranking output.
    Returns getAllSettings() after write — caller always gets fresh state.

Refs: FR-41 (global settings management)
```

**Git commands:**
```bash
git add Implementation/server/src/modules/settings/setting.schema.ts
git add Implementation/server/src/modules/settings/setting.service.ts
git commit -m "feat(server/F-10): add settings schema and service with KEY_MAP (getAllSettings, updateSettings, analytics cache bust)"
```

---

## Commit 2 — Settings HTTP layer

```
feat(server/F-10): add settings controller and router (admin-only GET/PUT)

modules/settings/setting.controller.ts:
  getSettings:  GET  /settings → 200 { data: SettingsDto }
    Thin: calls getAllSettings, returns response.
  putSettings:  PUT  /settings → 200 { data: SettingsDto } (fresh after write)
    Middleware array: [validate(putSettingsSchema), handler].
    Casts req.body to Partial<SettingsDto>; delegates entirely to updateSettings.

modules/settings/setting.routes.ts:
  settingsRouter.get('/', requireAuth, requireRole(['admin']), getSettings)
  settingsRouter.put('/', requireAuth, requireRole(['admin']), ...putSettings)
  Both routes admin-only — global settings are a privileged operation.
  No dept_head access: settings affect the whole platform, not one dept.

Design: PUT (not PATCH) URL — client sends only changed fields but PUT is
  semantically correct here (admin edits a settings document, not a resource).
  The partial-update behaviour is enforced by Zod schema's optional fields.

Refs: FR-41
```

**Git commands:**
```bash
git add Implementation/server/src/modules/settings/setting.controller.ts
git add Implementation/server/src/modules/settings/setting.routes.ts
git commit -m "feat(server/F-10): settings controller + admin-only router (GET /settings, PUT /settings)"
```

---

## Commit 3 — Admin Zod schemas

```
feat(server/F-10): add admin Zod schemas for all 8 admin endpoints

modules/admin/admin.schema.ts:

  Shared:
    objectId(field): inline regex validator — consistent with F-7/F-8 pattern.
      /^[a-f\d]{24}$/i — no shared/validators file (project convention).

  listUsersQuerySchema:
    status?: enum('pending','active','suspended')
    role?:   enum('student','faculty','dept_head','admin')
    q?:      string max 100 — matched against name / email / enrollmentNo regex
    cursor?: string — ObjectId-based keyset pagination
    limit?:  coerce int 1–50 default 20

  userIdParamSchema:    { params: { id: objectId } }

  mapCourseSchema:
    params: { credId: objectId }
    body:   existingCourseId? | (newCourseName + newCourseCategory required together)
    .refine(): existingCourseId OR (newCourseName AND newCourseCategory) must be present.
      Prevents partial new-course creation (name without category breaks ICourse.required).

  listReportsQuerySchema:
    status?: enum('pending','reviewed','dismissed')
    cursor, limit — same pattern as listUsersQuerySchema

  reviewReportSchema:
    body: { action: enum('reviewed','dismissed'), notes? max 1000, userAction?: enum('warn','suspend') }
    .refine(): userAction only valid when action='reviewed' — dismissed reports
      have no user-facing consequence.

  auditQuerySchema:
    action?: string max 100 — prefix match supported in service
    userId?: string — filtered by ObjectId if valid
    cursor, limit

Refs: FR-42–48
```

**Git commands:**
```bash
git add Implementation/server/src/modules/admin/admin.schema.ts
git commit -m "feat(server/F-10): add admin Zod schemas for all 8 admin endpoints (users, course queue, reports, audit)"
```

---

## Commit 4 — Admin service

```
feat(server/F-10): add admin service — user approval/suspension, course mapping, report review, audit

modules/admin/admin.service.ts — 7 exported functions:

  listUsers(query):
    Cursor-based keyset pagination ($lt ObjectId, sort createdAt desc).
    $or filter across name/email/enrollmentNo when q is provided.
    Projection '-passwordHash -phone' — no secrets leak in admin views.
    Returns { users, nextCursor? } — nextCursor absent on last page.

  approveUser(adminId, targetId):
    Guards: cannot approve self, status must be 'pending' (ConflictError if not).
    Sets status: 'active'. Writes AuditLog { action:'user_approve', meta:{targetId,targetName} }.

  suspendUser(adminId, targetId):
    Guards: cannot suspend self, cannot suspend another admin (ForbiddenError).
    Guards: already-suspended user → ConflictError.
    Protect admin-to-admin escalation: prevents social-engineering attacks via report system.
    Sets status: 'suspended'. Writes AuditLog { action:'user_suspend', meta:{ targetId, targetName, targetRole } }.

  getCourseAliasQueue(cursor?, limit):
    Filter: { otherCourseName: { $exists:true, $ne:'' }, courseId: { $exists:false } }
    Sort: createdAt:1 (FIFO — oldest unresolved alias first, not newest).
    Populates studentId (name, enrollmentNo). Cursor: $gt (FIFO direction).

  mapCourseAlias(adminId, credId, body):
    Guard: credential must have otherCourseName (ValidationError if not).
    Guard: credential must not already have courseId (ConflictError if already mapped).
    existingCourseId: verifies Course exists (NotFoundError if not).
    newCourseName path: creates new Course { name, code?, category, issuer, verificationMethod:'faculty' }.
    Sets cred.courseId = courseId, clears cred.otherCourseName = undefined, cred.save().
    Writes AuditLog { action:'course_alias_mapped', meta:{ credId, courseId, originalName } }.

  listReports(status?, cursor?, limit):
    Populates reporterId + targetUserId (name, enrollmentNo).
    Cursor: $lt (newest first).

  reviewReport(adminId, reportId, body):
    Guard: report must be 'pending' (ConflictError if already reviewed/dismissed).
    Sets report.status = action, reviewedBy = adminId, reviewNotes = notes.
    If body.userAction === 'suspend':
      Calls suspendUser(adminId, report.targetUserId) — reuses existing guard logic.
      suspendUser writes its own AuditLog entry → two audit entries, two facts.
      Guard: ValidationError if report has no targetUserId.
    Writes AuditLog { action:'report_review', meta:{ reportId, action, userAction } }.

  listAuditLog(query):
    Filters by action (exact string match) and userId (ObjectId) if provided.
    Populates userId (name, role). Cursor: $lt (newest first).

Refs: FR-42–48
```

**Git commands:**
```bash
git add Implementation/server/src/modules/admin/admin.service.ts
git commit -m "feat(server/F-10): add admin service — listUsers, approve/suspend, mapCourseAlias, reviewReport (with userAction chain), listAuditLog"
```

---

## Commit 5 — Admin controller + router

```
feat(server/F-10): add admin controller and router (8 endpoints, global requireRole middleware)

modules/admin/admin.controller.ts — 8 handler arrays:
  getAdminUsers:       GET  /admin/users                  → 200 { data: { users, nextCursor? } }
  approveUserHandler:  PATCH /admin/users/:id/approve     → 200 { data: { message } }
  suspendUserHandler:  PATCH /admin/users/:id/suspend     → 200 { data: { message } }
  getCourseQueue:      GET  /admin/courses/queue          → 200 { data: { items, nextCursor? } }
  mapCourseAliasHandler: PATCH /admin/courses/queue/:credId → 200 { data: { credId, courseId } }
  getReports:          GET  /admin/reports                → 200 { data: { items, nextCursor? } }
  reviewReportHandler: PATCH /admin/reports/:id           → 200 { data: { reportId, status } }
  getAuditLog:         GET  /admin/audit                  → 200 { data: { entries, nextCursor? } }

  req.query casts: `as unknown as TypedQuery` — required because Express's
    ParsedQs has string|string[]|ParsedQs|undefined values; Zod's coerce.number
    transforms the string to int after middleware runs. The double cast is
    intentional (unknown first removes the type overlap TS2352 error).

modules/admin/admin.routes.ts:
  adminRouter.use(requireAuth, requireRole(['admin']))
    Applied ONCE at router level — covers all 8 endpoints without repetition.
    No endpoint can silently bypass auth if a handler is added later.

Refs: FR-42–48
```

**Git commands:**
```bash
git add Implementation/server/src/modules/admin/admin.controller.ts
git add Implementation/server/src/modules/admin/admin.routes.ts
git commit -m "feat(server/F-10): admin controller + router — 8 endpoints, global requireAuth+requireRole at router level"
```

---

## Commit 6 — Server wiring + version bump

```
feat(server/F-10): mount /settings and /admin routers; version → 1.0.0-F10

routes.ts (MODIFIED):
  import settingsRouter from '@/modules/settings/setting.routes'
  import adminRouter    from '@/modules/admin/admin.routes'
  Uncomment + mount:
    app.use('/api/v1/settings', settingsRouter)
    app.use('/api/v1/admin',    adminRouter)
  Root info endpoint: add 'settings' and 'admin' endpoint description strings.
  Version bumped: '1.0.0-F9' → '1.0.0-F10'.

health.routes.ts (MODIFIED):
  Version string bumped to '1.0.0-F10'.
  Jobs map aligned: spotCheck padding added for consistency.

Refs: FR-41 (settings mount), FR-42 (admin mount)
```

**Git commands:**
```bash
git add Implementation/server/src/routes.ts
git add Implementation/server/src/modules/health/health.routes.ts
git commit -m "feat(server/F-10): mount /settings and /admin routers; bump version to 1.0.0-F10"
```

---

## Commit 7 — Client: admin data layer (types + API + hooks)

```
feat(client/F-10): admin data layer — types, API client, TanStack Query hooks

features/admin/types.ts — 9 exported types:
  SettingsDto:       Mirrors server SettingsDto exactly (9 fields + tierPoints object).
  AdminUser:         { _id, name, email, enrollmentNo, role, status, department, createdAt }
  AdminUsersPage:    { users, nextCursor? }
  CourseQueueItem:   { _id, otherCourseName, issuer, createdAt, studentId{_id,name,enrollmentNo} }
  CourseQueuePage:   { items, nextCursor? }
  MapCourseBody:     { existingCourseId?, newCourseName?, newCourseCode?, newCourseCategory?, issuer? }
  AdminReport:       { _id, reason, status, reviewNotes?, createdAt, reporterId, targetUserId? }
  AdminReportsPage:  { items, nextCursor? }
  ReviewReportBody:  { action, notes?, userAction? }
  AuditEntry:        { _id, action, meta?, createdAt, userId{_id,name,role} }
  AuditPage:         { entries, nextCursor? }

features/admin/api/admin.api.ts — 10 functions:
  getSettings()                              GET  /settings
  updateSettings(body)                       PUT  /settings
  listAdminUsers(params)                     GET  /admin/users
  approveUser(id)                            PATCH /admin/users/:id/approve
  suspendUser(id)                            PATCH /admin/users/:id/suspend
  getCourseQueue(params?)                    GET  /admin/courses/queue
  mapCourseAlias(credId, body)               PATCH /admin/courses/queue/:credId
  listReports(params?)                       GET  /admin/reports
  reviewReport(id, body)                     PATCH /admin/reports/:id
  listAuditLog(params?)                      GET  /admin/audit

features/admin/hooks/useAdmin.ts — 10 hooks:

  adminKeys factory:
    settings(), users(filter), courseQueue(), reports(status?), audit(filter)

  useSettings():      staleTime 60s — settings change rarely; no point polling.
  useUpdateSettings():
    onSuccess: invalidates settings + analytics keys.
    analytics keys invalidated because tierPoints/rankingMetric affect rankings.

  useAdminUsers(filter):    useInfiniteQuery, staleTime 30s
  useApproveUser():         onSuccess: invalidates ['admin','users']
  useSuspendUser():         onSuccess: invalidates ['admin','users']
  useCourseQueue():         useInfiniteQuery, staleTime 30s
  useMapCourse():           onSuccess: invalidates courseQueue
  useAdminReports(status?): useInfiniteQuery, staleTime 30s
  useReviewReport():
    onSuccess: invalidates both reports AND users
      — userAction:suspend changes a user's status; stale user list must refresh.
  useAuditLog(filter):      useInfiniteQuery, staleTime 60s (audit rarely needs real-time)

Refs: FR-41–48
```

**Git commands:**
```bash
git add Implementation/client/src/features/admin/types.ts
git add Implementation/client/src/features/admin/api/admin.api.ts
git add Implementation/client/src/features/admin/hooks/useAdmin.ts
git commit -m "feat(client/F-10): admin data layer — types, API client, 10 TanStack Query hooks with targeted cache invalidation"
```

---

## Commit 8 — Client: all 6 admin pages

```
feat(client/F-10): admin pages — Dashboard, UserManagement, CourseQueue, Settings, Reports, AuditLog

AdminDashboardPage (/admin):
  Gradient header (primary→tertiary). Shows user's first name.
  Live pending-count chips: pending users (error-container), open reports
    (error-container), course aliases (secondary-container).
    "All clear" chip when all 3 are zero.
    Counts come from first page of each infinite query — no extra API call.
  6 NavCards → /admin/users, /admin/courses/queue, /admin/reports,
               /admin/settings, /admin/audit, /analytics.
  Each card: icon (role-colored), title, description, chevron_right.
    hover:-translate-y-0.5 + hover:shadow-md micro-animation.

UserManagementPage (/admin/users):
  Sticky header with search input + 4 status filter chips (All/Pending/Active/Suspended).
  Default filter: 'pending' — most urgent view on load.
  UserRow: name, email, enrollmentNo, status chip, role chip, department.
    Approve button: only shown when status='pending'.
    Suspend button: hidden for admins and already-suspended users.
  ConfirmDialog (suspend): modal with cancel/confirm buttons.
    Dialog is separate from the mutation — prevents accidental suspend.
  Infinite scroll via 'Load more' button. Skeleton loading (4 placeholder rows).

CourseAliasQueuePage (/admin/courses/queue):
  Default sort: FIFO (oldest unresolved first) — matches server sort.
  QueueCard: otherCourseName, issuer, studentId.name + enrollmentNo.
    Tap expand_more chevron → opens MapForm inline (no modal).
  MapForm toggle: 'Create new course' | 'Map to existing'.
    existing: single ObjectId input.
    new: name (pre-filled from otherCourseName), category (required), issuer.
    Submit → useMapCourse.mutate → card disappears on next query invalidation.
  Empty state: checklist icon + "Queue is empty — no unresolved aliases".

SettingsPage (/admin/settings):
  Sticky header with "Unsaved changes" warning text (visible when isDirty).
  Local state (local: Partial<SettingsDto>) tracks uncommitted edits.
  merged = { ...serverSettings, ...local } — displayed values reflect unsaved changes.
  NumberField component: label + description + constrained <input type="number">.
    min/max enforced by browser + server Zod.
  Ranking metric: 3-button selector (not a <select>) with description per option.
  Tier points: 2×2 grid of number inputs (pass, elite, elite_silver, elite_gold).
  Sticky save bar: disabled when not dirty or busy.
    States: 'Save Changes' → spinner 'Saving…' → check_circle 'Saved' (3s auto-clear).
  updateSettings called with only the changed keys (local object), not full SettingsDto.

SafetyReportsPage (/admin/reports):
  Default filter: 'pending'. Filter chips: Pending / Reviewed / Dismissed / All.
  ReportCard: reason, reporter name + date, target user (if any), status chip.
    'Review' button only on pending reports.
  ReviewDrawer (bottom-sheet): slides up over 40% backdrop.
    Action toggle: 'Take action' | 'Dismiss'.
    UserAction: No action / Warn / Suspend (only shown when action='reviewed' AND targetUserId exists).
    Notes textarea (optional, max 1000 chars).
    Submit → useReviewReport.mutate → drawer closes on success.
  userAction:'suspend' chains suspendUser in the server service —
    single round-trip, two audit log entries.

AuditLogPage (/admin/audit):
  Action filter: text input (live filter via queryKey change → re-fetches).
  AuditRow: action-based icon + color (check_circle/tertiary for approve,
    person_off/error for suspend, flag/warning for reports, category/secondary
    for course alias).
  action text: underscores replaced with spaces, capitalized.
  Expand → shows meta object as formatted JSON (pretty-printed, break-all).
  relativeTime(iso): Intl.RelativeTimeFormat auto-selects seconds/minutes/hours/days.
  Infinite scroll via 'Load more' button.

Refs: FR-41–48
```

**Git commands:**
```bash
git add Implementation/client/src/features/admin/pages/AdminDashboardPage.tsx
git add Implementation/client/src/features/admin/pages/UserManagementPage.tsx
git add Implementation/client/src/features/admin/pages/CourseAliasQueuePage.tsx
git add Implementation/client/src/features/admin/pages/SettingsPage.tsx
git add Implementation/client/src/features/admin/pages/SafetyReportsPage.tsx
git add Implementation/client/src/features/admin/pages/AuditLogPage.tsx
git commit -m "feat(client/F-10): add AdminDashboardPage, UserManagementPage, CourseAliasQueuePage, SettingsPage, SafetyReportsPage, AuditLogPage"
```

---

## Commit 9 — Client: wire F-10 into app shell

```
feat(client/F-10): activate 6 admin routes and ADMIN_QUICK_ACTIONS in BottomNav

router.tsx (MODIFIED):
  Removed: placeholder comment '// const AdminDashboardPage = lazy(…)'
  Added 6 lazy imports (all from @/features/admin/pages/):
    AdminDashboardPage, UserManagementPage, CourseAliasQueuePage,
    SettingsPage, SafetyReportsPage, AuditLogPage
  Added 6 routes (all ProtectedRoute roles={['admin']}):
    /admin                → AdminDashboardPage
    /admin/users          → UserManagementPage
    /admin/courses/queue  → CourseAliasQueuePage
    /admin/settings       → SettingsPage
    /admin/reports        → SafetyReportsPage
    /admin/audit          → AuditLogPage
  Note: flat routes (not /admin/*) — each page is its own route so
    ProtectedRoute handles role-check per-route without nested outlets.

BottomNav.tsx (MODIFIED):
  Added ADMIN_QUICK_ACTIONS array (4 items):
    Post Event (primary), Verify Queue (secondary),
    Analytics (tertiary), Admin Panel (error — red, high-visibility).
  Error color for Admin Panel: red intentionally signals elevated privilege.
    Tertiary was already used for Analytics — color differentiation is correct.
  Updated quickActions selector:
    isAdmin    = user?.role === 'admin'
    isFaculty  = user?.role === 'faculty' || user?.role === 'dept_head'
    isAdmin ? ADMIN_QUICK_ACTIONS : isFaculty ? FACULTY_QUICK_ACTIONS : STUDENT_QUICK_ACTIONS
  Admin no longer inherits faculty's 'My Events' quick action — My Events is
    irrelevant to admin (admin rarely posts events; they manage the platform).

Refs: FR-41–48
```

**Git commands:**
```bash
git add Implementation/client/src/app/router.tsx
git add Implementation/client/src/components/layout/BottomNav.tsx
git commit -m "feat(client/F-10): activate 6 /admin/* routes and ADMIN_QUICK_ACTIONS in BottomNav (admin gets dedicated quick-action set)"
```

---

## After all commits — push

```bash
git push
```

---

## PR Description

```markdown
## F-10: Admin Panel & Platform Settings

### Summary
Full admin surface for the Campus Innovation Platform. Settings singleton
(key-value store, 9 editable keys, invalidates analytics cache on change).
User management with approve/suspend guards (cannot suspend self or another admin).
Course alias queue resolves "Other" credentials into catalog entries (FIFO, inline
map form). Safety report review with optional one-step user suspension. Paginated
audit log (90-day TTL, action filter, expandable JSON meta). All 8 endpoints behind
a single `router.use(requireAuth, requireRole(['admin']))` — no middleware duplication.

### Changes
- **4 new server files** (`settings/` — schema, service, controller, routes)
- **4 new server files** (`admin/` — schema, service, controller, routes)
- **2 modified server files** (`routes.ts` — mounts + version; `health.routes.ts` — version)
- **3 new client files** (types, API client, 10 TanStack hooks)
- **6 new client pages** (Dashboard, UserManagement, CourseAliasQueue, Settings, Reports, AuditLog)
- **2 modified client files** (`router.tsx` — 6 routes; `BottomNav.tsx` — ADMIN_QUICK_ACTIONS)

### Key Design Decisions (SDE3)

| Decision | Rationale |
|----------|-----------|
| KEY_MAP singleton in settings.service | Single source of truth for Setting document keys + defaults — change a default once, applies everywhere |
| PUT (not PATCH) URL for /settings | Admin edits a settings singleton (a document), not a resource. Partial-update is Zod's job, not HTTP semantics |
| `invalidateCachePrefix('analytics:')` on any settings write | tierPoints and rankingMetric both affect ranking output — wiping all analytics keys is simpler and correct |
| `router.use(requireAuth, requireRole(['admin']))` once | DRY — a new handler added to adminRouter can never silently bypass auth |
| suspendUser reused inside reviewReport | Single audit trail entry per action; code reuse enforces the same guards (cannot suspend admin, cannot double-suspend) |
| FIFO sort for course alias queue | Oldest unresolved aliases should be resolved first — LIFO would leave early entries stale indefinitely |
| Confirm dialog for suspend in UserManagementPage | Suspend is irreversible from the student's perspective; one extra tap prevents fat-finger mistakes |
| ADMIN_QUICK_ACTIONS separate from FACULTY_QUICK_ACTIONS | Admins manage the platform, not events; 'My Events' is irrelevant to admin role |
| Error-colored Admin Panel quick-action | Red signals elevated privilege — intentional; tertiary was already used for Analytics |
| `unknown` cast for ParsedQs → typed query | Express's ParsedQs doesn't overlap with Zod's coerced typed output; `as unknown as T` is the idiomatic TypeScript escape hatch here |

### Security Checklist
- [x] Cannot suspend self → `ForbiddenError`
- [x] Cannot suspend another admin → `ForbiddenError`
- [x] Cannot approve a non-pending user → `ConflictError`
- [x] Cannot double-suspend → `ConflictError`
- [x] Cannot re-review an already-reviewed/dismissed report → `ConflictError`
- [x] Cannot map a credential that already has courseId → `ConflictError`
- [x] mapCourseAlias: Course.findById verifies existingCourseId exists → `NotFoundError`
- [x] All /settings and /admin/* routes require role='admin' at router level
- [x] Settings writes invalidate analytics cache immediately

### Testing Checklist
- [ ] `GET /settings` returns defaults when no Setting docs exist
- [ ] `PUT /settings { tierPoints: { pass:2 } }` persists and returns new value
- [ ] Settings write → analytics cache wiped → next ranking call hits DB
- [ ] Admin cannot approve an already-active user → `409`
- [ ] Admin cannot suspend self → `403`
- [ ] Admin cannot suspend another admin → `403`
- [ ] Suspend a user → their status becomes 'suspended'
- [ ] Course alias queue sorted oldest-first (FIFO)
- [ ] mapCourseAlias with existingCourseId → credential.courseId set, otherCourseName cleared
- [ ] mapCourseAlias with newCourseName → new Course created in DB
- [ ] Mapping an already-mapped credential → `409`
- [ ] Review report with userAction:'suspend' → user suspended + two AuditLog entries
- [ ] Review report with no targetUserId + userAction:'suspend' → `422`
- [ ] Re-reviewing a reviewed report → `409`
- [ ] AuditLog filtered by action= returns only matching entries
- [ ] Audit entries capped at 20 per page; nextCursor present when more
- [ ] Non-admin calling any /admin/* route → `403`
- [ ] Non-admin calling /settings → `403`
- [ ] Admin Panel quick-action visible only to admin in BottomNav FAB

### Refs
FR-41 (global settings), FR-42 (user management), FR-43 (course alias queue),
FR-44 (report review), FR-45 (audit log), FR-46 (suspend chain), FR-47 (admin shell)
```

---

## Commit order summary

| # | Commit subject | Key files |
|---|---------------|-----------|
| 1 | `feat(server/F-10)` — settings schema + service | `setting.schema.ts`, `setting.service.ts` |
| 2 | `feat(server/F-10)` — settings HTTP layer | `setting.controller.ts`, `setting.routes.ts` |
| 3 | `feat(server/F-10)` — admin schemas | `admin.schema.ts` |
| 4 | `feat(server/F-10)` — admin service | `admin.service.ts` |
| 5 | `feat(server/F-10)` — admin controller + router | `admin.controller.ts`, `admin.routes.ts` |
| 6 | `feat(server/F-10)` — server wiring + version | `routes.ts`, `health.routes.ts` |
| 7 | `feat(client/F-10)` — data layer | `types.ts`, `admin.api.ts`, `useAdmin.ts` |
| 8 | `feat(client/F-10)` — all 6 admin pages | `AdminDashboardPage`, `UserManagementPage`, `CourseAliasQueuePage`, `SettingsPage`, `SafetyReportsPage`, `AuditLogPage` |
| 9 | `feat(client/F-10)` — app shell wiring | `router.tsx`, `BottomNav.tsx` |
