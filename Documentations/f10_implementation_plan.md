# F-10: Admin, Settings & Platform Hardening — Implementation Plan

> **Requirements:** FR-16 (catalog), FR-22–26 (settings), FR-37 (reports)
> **Pre-conditions:** F-9 merged and green (`tsc --noEmit` = 0 errors, both sides).

---

## What Already Exists (do NOT recreate)

| Asset | Location | Notes |
|-------|----------|-------|
| `Setting` model | `server/src/models/setting.model.ts` | Key-value store; `getSetting<T>(key, default)` already used by F-6, F-7 |
| `AuditLog` model | `server/src/models/auditLog.model.ts` | 90-day TTL index; `{ userId, action, createdAt }` compound index |
| `Report` model | `server/src/models/report.model.ts` | `{pending, reviewed, dismissed}` status; admin queue index exists |
| `requireAuth` | `server/src/shared/middleware/auth.ts` | JWT cookie + Bearer |
| `requireRole` | `server/src/shared/middleware/index.ts` | Already used in `analytics.routes.ts` — reuse same pattern |
| `User` model | `server/src/models/user.model.ts` | `status: 'pending'|'active'|'suspended'`; `role` field typed |
| `Credential` model | `server/src/models/credential.model.ts` | `otherCourseName?` and `verification.method = 'admin'` already modelled |
| Safety routes (F-5) | `server/src/modules/safety/` | `POST /blocks`, `POST /reports` exist — admin review of reports is **new** |

---

## Settings Architecture Decision

The existing `Setting` model stores one document per key (key-value). The spec mentions a singleton `_id: 'global'` document — **we keep the existing key-value pattern** since `getSetting<T>()` is already called everywhere (F-6, F-7). A migration would break all callers.

`GET /settings` returns all keys assembled as `SettingsDto`. `PUT /settings` upserts each changed key individually.

```ts
// The canonical SettingsDto shape exposed by the API
interface SettingsDto {
  uploadsPer24h:       number;   // Setting key: 'credentialUploadPerDay'  default: 5
  pendingCap:          number;   // Setting key: 'credentialMaxPending'     default: 15
  linksPerDay:         number;   // Setting key: 'linksPerDay'              default: 10
  linkExpiryDays:      number;   // Setting key: 'linkExpiryDays'           default: 7
  declineCooldownDays: number;   // Setting key: 'declineCooldownDays'      default: 30
  spotCheckPercent:    number;   // Setting key: 'spotCheckPercent'         default: 10
  extractionsPerDay:   number;   // Setting key: 'extractionsPerDay'        default: 20
  rankingMetric:       'participation_rate' | 'per_hundred' | 'weighted_points';
  tierPoints: { pass: number; elite: number; elite_silver: number; elite_gold: number; };
}
```

---

## API Contract

### Settings
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/settings` | admin | Read all settings as structured DTO |
| `PUT` | `/api/v1/settings` | admin | Partial update — only provided fields are written |

### Admin — Users
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/admin/users` | admin | `?status=&role=&q=&cursor=&limit=20` |
| `PATCH` | `/api/v1/admin/users/:id/approve` | admin | `status → active` |
| `PATCH` | `/api/v1/admin/users/:id/suspend` | admin | `status → suspended` |

### Admin — Course Alias Queue
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/admin/courses/queue` | admin | Credentials with `otherCourseName` and no `courseId` |
| `PATCH` | `/api/v1/admin/courses/queue/:credId` | admin | Map to existing courseId OR create new Course |

### Admin — Reports
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/admin/reports` | admin | `?status=pending&cursor=&limit=20` |
| `PATCH` | `/api/v1/admin/reports/:id` | admin | `{ action, notes?, userAction?: 'warn'|'suspend' }` |

### Admin — Audit Log
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/admin/audit` | admin | `?action=&userId=&cursor=&limit=20` |

---

## Server Implementation — Step by Step

### Step 1 — `server/src/modules/settings/`

**`setting.schema.ts`** — Zod validation
```ts
const putSettingsSchema = z.object({
  uploadsPer24h:       z.number().int().min(1).max(50).optional(),
  pendingCap:          z.number().int().min(1).max(100).optional(),
  linksPerDay:         z.number().int().min(1).max(50).optional(),
  linkExpiryDays:      z.number().int().min(1).max(90).optional(),
  declineCooldownDays: z.number().int().min(0).max(365).optional(),
  spotCheckPercent:    z.number().int().min(1).max(100).optional(),
  extractionsPerDay:   z.number().int().min(1).max(200).optional(),
  rankingMetric:       z.enum(['participation_rate','per_hundred','weighted_points']).optional(),
  tierPoints: z.object({
    pass: z.number().int().min(0), elite: z.number().int().min(0),
    elite_silver: z.number().int().min(0), elite_gold: z.number().int().min(0),
  }).optional(),
});
```

**`setting.service.ts`**
```ts
// KEY_MAP: DTO field → { Setting key, default value }
const KEY_MAP = { uploadsPer24h: { key: 'credentialUploadPerDay', default: 5 }, ... };

async function getAllSettings(): Promise<SettingsDto>
// → Promise.all(Object.entries(KEY_MAP).map(([field, {key, default}]) => getSetting(key, default)))
// → assemble into SettingsDto shape

async function updateSettings(body: Partial<SettingsDto>): Promise<SettingsDto>
// → for each key in body: Setting.findOneAndUpdate({ key: KEY_MAP[k].key }, { $set: { value } }, { upsert: true })
// → invalidateCachePrefix('analytics:')  — tier/ranking changes affect ranking output
// → return getAllSettings()
```

**`setting.controller.ts`** — `getSettings`, `putSettings` (thin, parse + delegate)

**`setting.routes.ts`**
```ts
router.get('/', requireAuth, requireRole(['admin']), getSettings);
router.put('/', requireAuth, requireRole(['admin']), putSettings);
export { router as settingsRouter };
```

---

### Step 2 — `server/src/modules/admin/admin.schema.ts`

```ts
const listUsersQuerySchema = z.object({
  status: z.enum(['pending','active','suspended']).optional(),
  role:   z.enum(['student','faculty','dept_head','admin']).optional(),
  q:      z.string().max(100).optional(),   // name/email/enrollment regex
  cursor: z.string().optional(),
  limit:  z.coerce.number().int().min(1).max(50).default(20),
});

const userIdParamSchema = z.object({ id: objectId('id') });

const mapCourseSchema = z.object({
  existingCourseId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  newCourseName:    z.string().min(2).max(200).optional(),
  newCourseCode:    z.string().max(30).optional(),
  issuer:           z.string().max(100).optional(),
}).refine(d => d.existingCourseId || d.newCourseName, {
  message: 'Either existingCourseId or newCourseName is required.',
});

const reviewReportSchema = z.object({
  action:     z.enum(['reviewed', 'dismissed']),
  notes:      z.string().max(1000).optional(),
  userAction: z.enum(['warn', 'suspend']).optional(),
});

const auditQuerySchema = z.object({
  action:  z.string().optional(),
  userId:  z.string().optional(),
  cursor:  z.string().optional(),
  limit:   z.coerce.number().int().min(1).max(50).default(20),
});
```

---

### Step 3 — `server/src/modules/admin/admin.service.ts`

**`listUsers(query)`**
```
Build filter:
  status? → { status }
  role?   → { role }
  q?      → { $or: [{ name: /q/i }, { email: /q/i }, { enrollmentNo: /q/i }] }
  cursor? → { _id: { $lt: ObjectId(cursor) } }

User.find(filter)
  .select('-passwordHash')   // phone already select:false
  .populate('department', 'name code')
  .sort({ createdAt: -1 })
  .limit(limit + 1)
  .lean()

→ { users, nextCursor? }
```

**`approveUser(adminId, targetId)`**
```
Guard: targetId !== adminId → 403 'Cannot approve yourself'
user = User.findById(targetId) → 404 if missing
Guard: user.status === 'pending' → 409 if already active/suspended
User.findByIdAndUpdate(targetId, { $set: { status: 'active' } })
AuditLog.create({ userId: adminId, action: 'user_approve', meta: { targetId, name: user.name } })
```

**`suspendUser(adminId, targetId)`**
```
Guard: targetId !== adminId → 403 'Cannot suspend yourself'
user = User.findById(targetId) → 404 if missing
Guard: user.role !== 'admin'  → 403 'Cannot suspend another admin'
Guard: user.status !== 'suspended' → 409 if already suspended
User.findByIdAndUpdate(targetId, { $set: { status: 'suspended' } })
AuditLog.create({ userId: adminId, action: 'user_suspend', meta: { targetId, name: user.name } })
```

**`getCourseAliasQueue(cursor?, limit)`**
```
Credential.find({
  otherCourseName: { $exists: true, $ne: '' },
  courseId: { $exists: false },
})
  .sort({ createdAt: 1 })   // FIFO — oldest unresolved first
  .limit(limit + 1)
  .populate('studentId', 'name enrollmentNo')
  .lean()

→ { items: CourseQueueShape[], nextCursor? }
```

**`mapCourseAlias(adminId, credId, body)`**
```
cred = Credential.findById(credId) → 404 if missing
Guard: cred.otherCourseName must exist; cred.courseId must be null → 400 if already mapped

if body.existingCourseId:
  course = Course.findById(existingCourseId) → 404 if not found
else:
  course = await Course.create({ name: body.newCourseName, code: body.newCourseCode, issuer: body.issuer })

cred.courseId        = course._id
cred.otherCourseName = undefined
await cred.save()
AuditLog.create({ userId: adminId, action: 'course_alias_mapped',
  meta: { credId, courseId: course._id.toString(), courseName: course.name } })
```

**`listReports(status?, cursor?, limit)`**
```
filter = {}
if status → { status }
cursor  → { _id: { $lt: ObjectId(cursor) } }

Report.find(filter)
  .sort({ createdAt: -1 })
  .limit(limit + 1)
  .populate('reporterId', 'name enrollmentNo')
  .populate('targetUserId', 'name enrollmentNo')
  .lean()
```

**`reviewReport(adminId, reportId, body)`**
```
report = Report.findById(reportId) → 404 if missing
Guard: report.status === 'pending' → 409 if already reviewed/dismissed

report.status      = body.action   // 'reviewed' | 'dismissed'
report.reviewedBy  = ObjectId(adminId)
report.reviewNotes = body.notes
await report.save()

if body.userAction === 'suspend' && report.targetUserId:
  await suspendUser(adminId, report.targetUserId.toString())
  // suspendUser internally writes its own AuditLog entry

AuditLog.create({ userId: adminId, action: 'report_review',
  meta: { reportId, action: body.action, userAction: body.userAction } })
```

**`listAuditLog(query)`**
```
filter = {}
if query.action → { action: query.action }
if query.userId && isValidObjectId(query.userId) → { userId: ObjectId(query.userId) }
cursor → { _id: { $lt: ObjectId(cursor) } }

AuditLog.find(filter)
  .sort({ createdAt: -1 })
  .limit(limit + 1)
  .populate('userId', 'name role')
  .lean()
```

---

### Step 4 — `server/src/modules/admin/admin.controller.ts`

Thin controller functions: `listUsers`, `approveUser`, `suspendUser`, `getCourseQueue`, `mapCourseAlias`, `listReports`, `reviewReport`, `listAuditLog` — each parses with Zod, delegates to service, calls `next(err)`.

---

### Step 5 — `server/src/modules/admin/admin.routes.ts`

```ts
const router = Router();
// Single middleware block — all admin routes need both
router.use(requireAuth, requireRole(['admin']));

router.get  ('/users',                 listUsers);
router.patch('/users/:id/approve',     approveUser);
router.patch('/users/:id/suspend',     suspendUser);

router.get  ('/courses/queue',         getCourseQueue);
router.patch('/courses/queue/:credId', mapCourseAlias);

router.get  ('/reports',               listReports);
router.patch('/reports/:id',           reviewReport);

router.get  ('/audit',                 listAuditLog);

export { router as adminRouter };
```

---

### Step 6 — `routes.ts` + version bump

```ts
import { settingsRouter } from '@/modules/settings/setting.routes';
import { adminRouter }    from '@/modules/admin/admin.routes';

// F-10: Admin & Settings
app.use('/api/v1/settings', settingsRouter);
app.use('/api/v1/admin',    adminRouter);
```

Version: `1.0.0-F9` → `1.0.0-F10`.

Also update `endpoints` map in root info response to include new routes.

---

### Step 7 — Seed Script: `server/src/scripts/seed.ts`

Creates minimum viable demo data:
- 1 admin user
- 3 departments
- 3 faculty (1 per dept)
- 15 students (5 per dept)
- 2 published events, 1 draft event
- 10 credentials (mix of verified/pending/rejected)
- All 9 `Setting` key-value documents with defaults

Run: `npx ts-node src/scripts/seed.ts`
Guard: detect `NODE_ENV=production` and refuse to run.

---

## Client Implementation — Step by Step

### Client Step 1 — `client/src/features/admin/types.ts`

```ts
export interface AdminUser {
  id: string; name: string; email: string; enrollmentNo: string;
  role: string; status: string; department: { id: string; name: string } | null;
  createdAt: string;
}
export interface CourseQueueItem {
  credId: string; student: { name: string; enrollmentNo: string };
  otherCourseName: string; issuer: string; createdAt: string;
}
export interface AdminReport {
  id: string; reporter: { name: string; enrollmentNo: string };
  targetUser?: { name: string; enrollmentNo: string };
  reason: string; status: string; createdAt: string; reviewNotes?: string;
}
export interface AuditEntry {
  id: string; user: { id: string; name: string; role: string };
  action: string; meta?: Record<string, unknown>; createdAt: string;
}
export interface SettingsDto { ... }  // as defined above
```

### Client Step 2 — `client/src/features/admin/api/admin.api.ts`

One function per endpoint. All delegate to `apiClient`. Follows same pattern as `analytics.api.ts`.

### Client Step 3 — `client/src/features/admin/hooks/`

| Hook | Query key | Notes |
|------|-----------|-------|
| `useSettings()` | `['settings']` | `staleTime: 60_000` |
| `useUpdateSettings()` | — | Mutation; invalidates `['settings']` + `['analytics']` |
| `useAdminUsers(filter)` | `['admin','users', filter]` | `useInfiniteQuery` |
| `useApproveUser()` | — | Mutation; invalidates `['admin','users']` |
| `useSuspendUser()` | — | Mutation; invalidates `['admin','users']` |
| `useCourseQueue()` | `['admin','courses','queue']` | `useInfiniteQuery` |
| `useMapCourse()` | — | Mutation; invalidates queue key |
| `useAdminReports(status)` | `['admin','reports', status]` | `useInfiniteQuery` |
| `useReviewReport()` | — | Mutation; invalidates reports key |
| `useAuditLog(filter)` | `['admin','audit', filter]` | `useInfiniteQuery` |

### Client Step 4 — Pages (6 pages)

**`AdminDashboardPage`** `/admin`
- 6 cards: Users · Course Queue · Reports · Settings · Audit Log · Analytics
- 3 quick-stats chips at top: pending users / open reports / course queue count
- Gradient header card (matches existing design language)

**`UserManagementPage`** `/admin/users`
- Chip filter row: All / Pending / Active / Suspended + role filter
- Infinite list — name, role chip, status chip, dept, joined date, action buttons
- Approve/Suspend with confirm dialog for suspend

**`CourseAliasQueuePage`** `/admin/courses/queue`
- Infinite list of cards; each expandable
- Expanded: course search typeahead (calls `GET /api/v1/courses?q=`) + new course form
- Submit maps the credential

**`SettingsPage`** `/admin/settings`
- All 9 settings in one form with validation
- `rankingMetric` → 3-way segmented control
- `tierPoints` → 4 number inputs in a grid
- Live save with debounce 300ms; success toast

**`ReportQueuePage`** `/admin/reports`
- Status chip filter; infinite list
- Expand row → full reason + review form + Suspend user button

**`AuditLogPage`** `/admin/audit`
- Filter by action + userId
- Read-only infinite table; meta shown as collapsible JSON

### Client Step 5 — Router

Add 6 lazy-loaded routes under `/admin/*` — all `ProtectedRoute roles={['admin']}`.
Update F-10 comment in router.tsx.

### Client Step 6 — BottomNav

Add `ADMIN_QUICK_ACTIONS` array. Render it for `user.role === 'admin'`.

```ts
const ADMIN_QUICK_ACTIONS = [
  { id: 'qa-admin-users',    label: 'Users',     icon: 'manage_accounts', to: '/admin/users' },
  { id: 'qa-admin-reports',  label: 'Reports',   icon: 'flag',            to: '/admin/reports' },
  { id: 'qa-admin-settings', label: 'Settings',  icon: 'tune',            to: '/admin/settings' },
  { id: 'qa-analytics',      label: 'Analytics', icon: 'bar_chart',       to: '/analytics' },
];
```

---

## Security Hardening Checklist

| Check | Verification |
|-------|-------------|
| Every route has `requireAuth` | `grep` all `router.get/post/patch` — zero without auth middleware |
| All admin routes have `requireRole(['admin'])` | Router-level `router.use(requireRole)` covers all |
| No `passwordHash` / `phone` in list responses | `select: false` + explicit `-passwordHash` projection |
| No hard-coded secrets in `src/` | `grep -r 'SECRET\|PASSWORD\|API_KEY' src/` → zero hits |
| Settings changes invalidate analytics cache | `invalidateCachePrefix('analytics:')` in `updateSettings` |
| Admin cannot suspend self | Guard in `suspendUser` service |
| Admin cannot suspend another admin | Guard in `suspendUser` service |
| AuditLog written for every admin mutation | Verified per service function |
| Error handler strips stack traces in prod | Already in `app.ts` |
| `dept_head` cannot access admin routes | `requireRole(['admin'])` blocks them |

---

## Business Rules

| Rule | Enforcement |
|------|-------------|
| Admin cannot suspend themselves | `suspendUser` guard → `403` |
| Admin cannot suspend another admin | Role check in `suspendUser` → `403` |
| Only `pending` users can be approved | Guard → `409` if already `active`/`suspended` |
| Only `pending` reports can be reviewed | Guard → `409` if already actioned |
| `userAction: 'suspend'` requires `targetUserId` on report | Zod `.refine()` |
| `PUT /settings` is partial (PATCH semantics) | All Zod fields `.optional()` |
| `mapCourseAlias` requires `courseId = null` | Service guard → `400` if already mapped |
| AuditLog written for every admin mutation | In service layer, never controller |
| Settings change invalidates analytics cache | `invalidateCachePrefix('analytics:')` |

---

## What is OUT OF SCOPE for F-10

- PDF annual report (CSV export is F-8)
- Telegram bot notifications
- Role promotion UI (admin can change roles via direct DB for now)
- Bulk user operations
- Per-department custom ranking weights
- Multi-admin conflict handling (last-write-wins on Settings is acceptable for pilot)
