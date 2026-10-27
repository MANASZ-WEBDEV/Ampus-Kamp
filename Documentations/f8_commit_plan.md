# F-8: Analytics & Department Ranking — Git Commit Plan

> **Branch:** `main`  
> **Format:** Conventional Commits  
> **`tsc --noEmit` → 0 errors** on both server and client confirmed before push.

---

## Commit 1 — Shared cache helper

```
feat(server/shared): add node-cache wrapper with typed get/set and prefix invalidation

shared/cache.ts:
  - Singleton NodeCache({ stdTTL: 300, useClones: false }).
    stdTTL = 5 min — matches analytics cache window.
    useClones: false — skip deep-clone overhead; callers must not mutate values.

  - getCache<T>(key): T | undefined
      Returns undefined on miss. Never throws.

  - setCache<T>(key, value, ttlSeconds?): void
      ttlSeconds = 0 → use stdTTL; > 0 → per-key override.

  - invalidateCache(key): void
      No-op if key does not exist.

  - invalidateCachePrefix(prefix): void
      Iterates cache.keys(), deletes all keys starting with prefix.
      Used to wipe entire feature namespace without enumerating every key.
      Example: invalidateCachePrefix('analytics:') deletes all analytics keys.

Design: thin abstraction over node-cache. Swap to Redis later = 1-file change.
  Callers import only the 4 public functions — no direct NodeCache API exposure.

Cache keys used by analytics (documented here for discoverability):
  analytics:ranking:{year}
  analytics:summary:{year}
  analytics:breakdown:{deptId}:{year}

Refs: FR-23 (caching)
```

**Git commands:**
```bash
git add Implementation/server/src/shared/cache.ts
git commit -m "feat(server/shared): add node-cache wrapper with typed get/set and prefix invalidation"
```

---

## Commit 2 — Zod schemas

```
feat(server/analytics): add Zod schemas for analytics query params

analytics.schema.ts:

  Shared:
    yearSchema: z.coerce.number().int().min(2020).max(2100).default(currentYear)
    objectId(field): z.string().regex(/^[a-f\d]{24}$/i, ...) — inline helper,
      consistent with existing pattern across all modules (no shared/validators).

  rankingQuerySchema:
    year?:   yearSchema
    metric?: z.enum(['participationRate','perHundred','weightedPoints'])
             default: 'participationRate'

  breakdownParamsSchema:
    deptId: objectId('deptId')

  breakdownQuerySchema:
    year?: yearSchema

  summaryQuerySchema:
    year?: yearSchema

  Exported types: RankingQuery, BreakdownQuery, BreakdownParams, SummaryQuery

Refs: FR-23–28
```

**Git commands:**
```bash
git add Implementation/server/src/modules/analytics/analytics.schema.ts
git commit -m "feat(server/analytics): add Zod schemas for analytics query params"
```

---

## Commit 3 — Analytics service

```
feat(server/analytics): add analytics.service with aggregation pipeline and cache

analytics.service.ts — 4 exported functions, all cache-first:

getDepartmentRanking(year, metric):
  Cache key: analytics:ranking:{year}
  On miss — 4-stage aggregation pipeline (verbatim from master spec §7.6):
    Stage 1: $group { dept, student } → count certs per student per dept.
    Stage 2: $group { dept }          → uniqueStudents + totalCredentials.
    Stage 3: $lookup depts            → join studentStrength, code, name.
    Stage 4: $project                 → participationRate + perHundred.
      Guard: $match { 'd.studentStrength': { $gt:0 } } — never divide by zero.

  Weighted points — computed in JS (not $project):
    Reason: tierPoints lives in Setting. Injecting it into $project would require
      $lookup on settings or $let/$expr hacks. JS post-processing is cleaner.
    computeWeightedPoints(): ONE combined aggregation for all depts, grouped by
      (department, tier). Accumulates in JS Map. O(total verified creds), not O(depts^2).

  assignRanks(): typed MetricKey union ('participationRate'|'perHundred'|
    'weightedPointsPerHundred') — no Record<string,number> cast needed.
    Stable ranking: equal scores share rank; next rank skips (i+1).

  On cache hit: re-sort by requested metric in-process (O(n log n), n ≤ ~50 depts).
    No extra DB hit. Cached array stores all 3 metrics — any metric sort is free.

getDeptBreakdown(deptId, year, requestingUser):
  RBAC: dept_head with department !== deptId → ForbiddenError.
    Enforced in service (not middleware) because only service has deptId context.
  Cache key: analytics:breakdown:{deptId}:{year}
  3 aggregations in parallel (Promise.all — no interdependency):
    1. byCategory: $lookup courses, $unwind { preserveNullAndEmptyArrays:true }
         preserveNullAndEmptyArrays keeps 'Other' creds (no courseId) in results.
         $ifNull(['$c.category','other']) — 'other' bucket for non-catalog certs.
    2. byTier: $group { _id:'$tier' }
    3. topCourses: group by courseId, limit 5, $lookup course name + issuer.

getInstituteSummary(year):
  Admin-only. Cache key: analytics:summary:{year}
  5 parallel queries (Promise.all):
    - Dept.countDocuments()
    - Credential.countDocuments(verified, year)
    - Credential.distinct('studentId').length — count without $group
    - Credential tier aggregation for byTier map
    - getDepartmentRanking() — cache-first, no extra DB hit on warm cache
  Derives avgParticipationRate + topDept from ranking result.

exportRankingCsv(year):
  Uses getDepartmentRanking (cache-first) — no redundant aggregation.
  RFC-4180 manual serialization — NO external dependency (same pattern as F-6).
  escCsv(): quotes values containing commas, quotes, or newlines.
  Columns: Rank, Department, Code, Students, UniqueStudents, TotalCerts,
           ParticipationRate%, CertsPerHundred, WeightedPoints
  Line separator: \r\n (RFC 4180 requirement).

Refs: FR-23–28
```

**Git commands:**
```bash
git add Implementation/server/src/modules/analytics/analytics.service.ts
git commit -m "feat(server/analytics): add analytics.service with aggregation pipeline and cache"
```

---

## Commit 4 — Controller and router

```
feat(server/analytics): add analytics controller and router

analytics.controller.ts — 4 thin handlers (all logic in service):
  getRanking:    GET /analytics/department-ranking → 200 { data: rows }
    Full ranking visible to all dept_head+ (competitive transparency is the point).
    dept_head restriction to own dept applies on /breakdown only.

  getBreakdown:  GET /analytics/breakdown/:deptId → 200 { data: breakdown }
    dept_head: ForbiddenError if wrong dept (enforced in service).

  getSummary:    GET /analytics/summary → 200 { data: summary }
    Admin only. Institute-wide totals + averages.

  exportCsv:     GET /analytics/export → 200 text/csv
    Content-Disposition: attachment; filename="ranking-{year}.csv"
    Content-Type: text/csv; charset=utf-8

analytics.routes.ts:
  GET /department-ranking   — requireAuth + requireRole(['dept_head','admin'])
  GET /breakdown/:deptId    — requireAuth + requireRole(['dept_head','admin'])
  GET /summary              — requireAuth + requireRole(['admin'])
  GET /export               — requireAuth + requireRole(['admin'])

  Note: dept_head RBAC for breakdown enforced in service (not route middleware)
    because middleware only knows the role, not whether deptId matches the caller's dept.

Refs: FR-23–28
```

**Git commands:**
```bash
git add Implementation/server/src/modules/analytics/analytics.controller.ts
git add Implementation/server/src/modules/analytics/analytics.routes.ts
git commit -m "feat(server/analytics): add analytics controller and router"
```

---

## Commit 5 — Cache invalidation hook + server wiring

```
feat(server): wire F-8 analytics, add cache invalidation on verify, bump version to 1.0.0-F8

credential.service.ts — verifyCredential():
  After cred.save(), before AuditLog.create():
    invalidateCachePrefix('analytics:')
  Synchronous (node-cache in-process) — no await, zero latency impact on response.
  Wipes all analytics:* keys: ranking, summary, and all breakdown keys.
  Design: prefix-wipe is simpler and correct; analytics are cached anyway so a
    brief stale window during the wipe is acceptable.

routes.ts:
  - Import analyticsRouter.
  - Uncomment + mount: app.use('/api/v1/analytics', analyticsRouter).
  - Add analytics entry to root info endpoint.
  - Version bumped to '1.0.0-F8'.

Refs: FR-23 (cache invalidation), FR-28 (access control)
```

**Git commands:**
```bash
git add Implementation/server/src/modules/credentials/credential.service.ts
git add Implementation/server/src/routes.ts
git commit -m "feat(server): wire F-8 analytics, add cache invalidation on verify, bump version to 1.0.0-F8"
```

---

## Commit 6 — Client types + API + hooks

```
feat(client/analytics): add F-8 types, API client, and TanStack Query hooks

types.ts — 7 exports:
  AnalyticsMetric: 'participationRate' | 'perHundred' | 'weightedPoints'
  DeptRankRow:     rank, department{id,code,name}, studentStrength, uniqueStudents,
                   totalCredentials, participationRate, perHundred, weightedPointsPerHundred
  CategoryCount, TierCount, TopCourse
  DeptBreakdown:   { byCategory, byTier, topCourses }
  InstituteSummary: totalDepts, totalVerified, totalStudentsWithCreds,
                    avgParticipationRate, topDept{name,rate}|null, byTier

analytics.api.ts — 4 functions:
  getRanking(year, metric)   → DeptRankRow[]
  getBreakdown(deptId, year) → DeptBreakdown
  getSummary(year)           → InstituteSummary
  exportCsv(year)            → void
    responseType:'blob' → URL.createObjectURL → hidden <a> click → revoke after 3s.
    Same blob-URL download pattern as F-6's downloadRosterCsv.

useAnalytics.ts — 4 hooks:
  analyticsKeys factory: ranking(year, metric), breakdown(deptId, year), summary(year)

  useRanking(year, metric):     staleTime: 5 * 60 * 1000
  useBreakdown(deptId, year):   staleTime: 5min; enabled: !!deptId
  useSummary(year):             staleTime: 5min
  useExportCsv():               useMutation (imperative download — not useQuery)

  staleTime = 5min mirrors server cache TTL exactly.
    Prevents redundant refetches within the same cache window.

Refs: FR-23–28
```

**Git commands:**
```bash
git add Implementation/client/src/features/analytics/types.ts
git add Implementation/client/src/features/analytics/api/analytics.api.ts
git add Implementation/client/src/features/analytics/hooks/useAnalytics.ts
git commit -m "feat(client/analytics): add F-8 types, API client, and TanStack Query hooks"
```

---

## Commit 7 — UI components and pages

```
feat(client/analytics): add RankCard, DepartmentRankingPage, BreakdownPage

RankCard (components/RankCard.tsx):
  - Rank badge: #1 gold emoji_events, #2 silver, #3 bronze; rest neutral circle.
  - Dept name + code chip (secondary-container).
  - 3 metric columns: active metric highlighted (primary-container bg, bold text).
  - Thin progress bar: participationRate% of 100 (bg-primary, transitions 500ms).
  - Entire card clickable → navigate('/analytics/:deptId').
  - Keyboard: tabIndex=0, onKeyDown Enter triggers navigation (WCAG combobox).
  - Hover: hover:-translate-y-px + shadow elevation.

DepartmentRankingPage (/analytics):
  - Year picker <select>: current year down to 2024.
  - Metric switcher: 3-pill button group (icons: groups, workspace_premium, stars).
  - Admin summary bar (conditional on user.role==='admin'):
      4 SummaryCards from useSummary(year).
  - Loading: 5 skeleton pulse cards. Empty: leaderboard icon + message.
  - dept_head sees FULL ranking — breakdown restricted separately.
  - Export CSV button (admin only): useExportCsv.mutate(year).
    Disabled when rows.length === 0 or mutation isPending.

BreakdownPage (/analytics/:deptId):
  - Guard: dept_head with wrong deptId → <Navigate to="/analytics" replace />.
  - Secondary gradient header + back button.
  - Category bar chart (Recharts BarChart layout="vertical"):
      YAxis tickFormatter: capitalize. Each bar Cell from CATEGORY_COLORS map.
      CustomTooltip: surface-container card with count.
  - Tier distribution (Recharts PieChart):
      nameKey="tier"; label: name + percent (guards undefined with ?? 0).
      Tooltip: (v) => [`${String(v ?? 0)} certs`, '']
        String(v ?? 0) avoids Recharts ValueType|undefined TS2322 error.
  - Top 5 courses: numbered badges, course name + issuer, count chip.
  - Auth: useAuth() from AuthContext (project uses context, not zustand store).

Recharts fix notes (for code review):
  - YAxis tick: textTransform not a valid SVG prop — use tickFormatter instead.
  - PieLabel: Recharts passes `name` (from nameKey), not the raw field name.
  - Tooltip formatter: must accept ValueType (= number|string|Array|undefined).

Refs: FR-23–27
```

**Git commands:**
```bash
git add Implementation/client/src/features/analytics/components/RankCard.tsx
git add Implementation/client/src/features/analytics/pages/DepartmentRankingPage.tsx
git add Implementation/client/src/features/analytics/pages/BreakdownPage.tsx
git commit -m "feat(client/analytics): add RankCard, DepartmentRankingPage, BreakdownPage"
```

---

## Commit 8 — Router + BottomNav wiring

```
feat(client): wire F-8 analytics routes and BottomNav quick action

router.tsx:
  - Lazy imports:
      DepartmentRankingPage → @/features/analytics/pages/DepartmentRankingPage
      BreakdownPage         → @/features/analytics/pages/BreakdownPage
  - Remove stale commented DepartmentDashboard + LeaderboardPage stubs.
  - 2 new routes:
      /analytics          → ProtectedRoute roles=['dept_head','admin']
      /analytics/:deptId  → ProtectedRoute roles=['dept_head','admin']
    Both are standalone routes (not wildcard) — each renders its own page.
    dept_head RBAC for /analytics/:deptId enforced in BreakdownPage (redirect)
    AND in analytics.service (ForbiddenError) — defence in depth.

BottomNav.tsx:
  FACULTY_QUICK_ACTIONS (+1 item):
    { id:'qa-analytics', label:'Analytics', icon:'bar_chart',
      to:'/analytics', color:'bg-tertiary', textColor:'text-on-tertiary' }
  Tertiary colour distinguishes Analytics from:
    Post Event (primary), My Events (primary-fixed), Verify Queue (secondary).

Refs: FR-23–28
```

**Git commands:**
```bash
git add Implementation/client/src/app/router.tsx
git add Implementation/client/src/components/layout/BottomNav.tsx
git commit -m "feat(client): wire F-8 analytics routes and BottomNav quick action"
```

---

## After all commits — push

```bash
git push
```

---

## PR Description

```markdown
## F-8: Analytics & Department Ranking

### Summary
Aggregates verified credentials into department rankings with three metrics
(participation rate default). 5-minute server-side cache (node-cache, Redis-swappable).
Admin-configurable tier weights from Setting. CSV export (RFC-4180, no deps).
Recharts bar chart + pie chart for per-department breakdown. dept_head sees
full ranking for competitive transparency; breakdown restricted to own dept.

### Changes
- **1 new shared server file** (`cache.ts` wrapper)
- **4 new server files** (schema, service, controller, routes)
- **2 modified server files** (`credential.service` — invalidation hook; `routes.ts` — mount + version)
- **7 new client files** (types, API, hooks, RankCard, 2 pages)
- **2 modified client files** (router.tsx, BottomNav.tsx)

### Key Design Decisions (SDE3)

| Decision | Rationale |
|----------|-----------|
| `shared/cache.ts` wrapper | Centralised TTL + prefix-invalidation; swap node-cache → Redis = 1 file change |
| `weightedPoints` in JS, not `$project` | `tierPoints` lives in `Setting` — embedding in pipeline requires `$lookup` on settings or `$let`/`$expr` hacks |
| One combined aggregation for weighted points | Groups all depts in one query; accumulates in JS Map — O(total creds), not O(depts²) |
| Cache keyed by year, sorted by metric in-process | All 3 metrics stored per row; metric sort is O(n log n), n ≤ ~50 — no per-metric cache entry needed |
| Cache prefix-wipe on any verify | Simpler and correct; brief stale window acceptable given 5-min TTL |
| RBAC in service, not only middleware | Middleware knows the role; only service knows if `deptId` belongs to the calling `dept_head` |
| `preserveNullAndEmptyArrays:true` in `$unwind` | Without it, "Other" creds (no `courseId`) silently drop from category breakdown |
| dept_head sees full ranking | Competitive transparency is the point of a ranking; hiding peers defeats the purpose |
| RFC-4180 CSV — no `json2csv` dep | Flat table; 10 lines of manual serialisation is not worth a dependency |
| `String(v ?? 0)` in Recharts Tooltip | Recharts `ValueType` includes `undefined`; typed param causes TS2322 |

### Security Checklist
- [x] `dept_head` cannot call `/analytics/summary` → `403`
- [x] `dept_head` cannot view another dept's breakdown → `403` (service) + redirect (client)
- [x] Only `verified` credentials count in every aggregation
- [x] `studentStrength=0` depts excluded (no division by zero)
- [x] Cache invalidated on every `verifyCredential` action

### Testing Checklist
- [ ] Ranking matches hand-calculated spreadsheet on seed data
- [ ] `?metric=perHundred` changes sort order correctly
- [ ] `?metric=weightedPoints` reflects `Setting.tierPoints` weights
- [ ] Dept with `studentStrength=0` absent from ranking
- [ ] Admin changes `tierPoints` → next non-cached call reflects new weights
- [ ] `dept_head` calling `/analytics/summary` → `403`
- [ ] `dept_head` calling `/analytics/breakdown/:otherDeptId` → `403`
- [ ] Cache: second call within 5 min hits cache (no MongoDB query fired)
- [ ] Verify credential → cache wiped → next ranking call is fresh from DB
- [ ] CSV export: correct headers, correct data, RFC-4180 quoting on special chars
- [ ] Admin summary bar visible only to admin role
- [ ] `BreakdownPage` dept_head with wrong deptId → redirect to `/analytics`
- [ ] Category breakdown includes "Other" credentials (no courseId)
- [ ] Top 5 courses shows correct names, issuers, counts

### Refs
FR-23, FR-24, FR-25, FR-26, FR-27, FR-28
```

---

## Commit order summary

| # | Commit subject | Key files |
|---|---------------|-----------|
| 1 | `feat(server/shared)` — cache wrapper | `cache.ts` |
| 2 | `feat(server/analytics)` — schemas | `analytics.schema.ts` |
| 3 | `feat(server/analytics)` — service | `analytics.service.ts` |
| 4 | `feat(server/analytics)` — ctrl+routes | `analytics.controller.ts`, `analytics.routes.ts` |
| 5 | `feat(server)` — invalidation + wiring | `credential.service.ts`, `routes.ts` |
| 6 | `feat(client/analytics)` — types+API+hooks | `types.ts`, `analytics.api.ts`, `useAnalytics.ts` |
| 7 | `feat(client/analytics)` — components+pages | `RankCard.tsx`, `DepartmentRankingPage.tsx`, `BreakdownPage.tsx` |
| 8 | `feat(client)` — wiring | `router.tsx`, `BottomNav.tsx` |
