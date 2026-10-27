# F-8: Analytics & Department Ranking — Implementation Plan

> **Requirements:** FR-23–28
> **Pre-conditions:** F-7 merged and green (`tsc --noEmit` = 0 errors).

---

## What already exists (do NOT recreate)

| Asset | Location | Relevant fields |
|-------|----------|-----------------|
| `Dept` model | `server/src/models/dept.model.ts` | `_id`, `code`, `name`, `studentStrength`, `headId` |
| `Credential` model | `server/src/models/credential.model.ts` | `verification.status`, `tier`, `department`, `studentId`, `year` |
| `Setting` + `getSetting` | `server/src/models/setting.model.ts` | key-value store; `getSetting<T>(key, default)` |
| `mountRoutes` stub | `server/src/routes.ts` line 92 | `// app.use('/api/v1/analytics', analyticsRouter);` |
| Router stub | `client/src/app/router.tsx` line 44 | `// const DepartmentDashboard = lazy(...)` |

---

## Server — 5 new files

### 1. `shared/cache.ts`

Thin `node-cache` wrapper — **shared across all features**:

```ts
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 300, useClones: false });

export function getCache<T>(key: string): T | undefined
export function setCache<T>(key: string, value: T, ttlSeconds?: number): void
export function invalidateCache(key: string): void
export function invalidateCachePrefix(prefix: string): void
  // iterates cache.keys(), deletes all matching the prefix
```

**Cache keys:**
```
analytics:ranking:{year}
analytics:summary:{year}
analytics:breakdown:{deptId}:{year}
```

**Invalidation trigger:** inside `credential.service.ts → verifyCredential()`, after `cred.save()`:
```ts
import { invalidateCachePrefix } from '@/shared/cache';
invalidateCachePrefix('analytics:');
```

> `node-cache` is in-process. Swap to Redis later — only this file changes.

---

### 2. `modules/analytics/analytics.schema.ts`

Zod schemas for query params:

```ts
rankingQuerySchema:
  year?:   z.coerce.number().int().min(2020).max(2100)  default: current year
  metric?: z.enum(['participationRate','perHundred','weightedPoints'])  default: 'participationRate'

breakdownQuerySchema:
  year?:   same
  // deptId comes from req.params — validated as mongoId separately

summaryQuerySchema:
  year?:   same
```

---

### 3. `modules/analytics/analytics.service.ts`

Three service functions, all cache-first:

**`getDepartmentRanking(year, metric)`**

Cache key: `analytics:ranking:{year}`
On miss — run the master-spec aggregation pipeline (§7.6):

```js
Credential.aggregate([
  { $match: { 'verification.status': 'verified', year } },

  // Stage 1: certs per (dept, student)
  { $group: {
      _id: { dept: '$department', student: '$studentId' },
      n: { $sum: 1 }
  }},

  // Stage 2: roll up to dept
  { $group: {
      _id: '$_id.dept',
      uniqueStudents:   { $sum: 1 },
      totalCredentials: { $sum: '$n' }
  }},

  // Stage 3: join dept metadata
  { $lookup: { from:'depts', localField:'_id', foreignField:'_id', as:'d' } },
  { $unwind: '$d' },

  // Guard: exclude depts with no students
  { $match: { 'd.studentStrength': { $gt: 0 } } },

  // Stage 4: compute participationRate + perHundred
  { $project: {
      department: { id:'$_id', code:'$d.code', name:'$d.name' },
      studentStrength:  '$d.studentStrength',
      uniqueStudents:   1,
      totalCredentials: 1,
      participationRate: {
        $multiply: [{ $divide: ['$uniqueStudents','$d.studentStrength'] }, 100]
      },
      perHundred: {
        $multiply: [{ $divide: ['$totalCredentials','$d.studentStrength'] }, 100]
      },
  }},
])
```

**Weighted points** — computed in JS after aggregation (not in pipeline) because `tierPoints` lives in `Setting`:

```ts
const tierPoints = await getSetting<Record<string,number>>(
  'tierPoints',
  { pass:1, elite:2, elite_silver:3, elite_gold:4 }
);
// For each dept row, run:
// Credential.aggregate([
//   { $match: { 'verification.status':'verified', year, department: deptId } },
//   { $group: { _id:'$tier', count:{ $sum:1 } } }
// ])
// → weightedPointsPerHundred = sum(tierPoints[tier] * count) / studentStrength * 100
```

**Rank assignment:** sort by requested metric desc → assign `.rank` = i+1 (ties share rank).
Store full enriched array in cache. On cache hit, re-sort by requested metric before returning.

Response row shape:
```ts
{
  rank,
  department: { id, code, name },
  studentStrength, uniqueStudents, totalCredentials,
  participationRate, perHundred, weightedPointsPerHundred
}
```

---

**`getDeptBreakdown(deptId, year, requestingUser)`**

RBAC: `dept_head` whose `department !== deptId` → `ForbiddenError`.
Cache key: `analytics:breakdown:{deptId}:{year}`

```js
// Category distribution
Credential.aggregate([
  { $match: { 'verification.status':'verified', department:deptId, year } },
  { $lookup: { from:'courses', localField:'courseId', foreignField:'_id', as:'c' } },
  { $unwind: { path:'$c', preserveNullAndEmpty: true } },  // keep 'Other' creds
  { $group: { _id:{ $ifNull:['$c.category','other'] }, count:{ $sum:1 } } },
  { $sort: { count:-1 } }
])
```

Also returns:
- Tier distribution: `Credential.aggregate([$match, $group { _id:'$tier' }])`
- Top 5 courses: join + group by courseId, sort count desc, limit 5

---

**`getInstituteSummary(year)`**

Admin-only. Cache key: `analytics:summary:{year}`

```ts
{
  totalDepts:              Dept.countDocuments(),
  totalVerified:           Credential.countDocuments({ 'verification.status':'verified', year }),
  totalStudentsWithCreds:  Credential.distinct('studentId', { ... }).length,
  avgParticipationRate:    average of participationRate from getDepartmentRanking(),
  topDept:                 { name, rate } — first row from ranking,
  byTier:                  { pass, elite, elite_silver, elite_gold }
}
```

---

**`exportRankingCsv(year)`**

Uses `getDepartmentRanking(year, 'participationRate')` (cache-first) → `json2csv` → returns CSV string.

Columns: `Rank, Department, Code, Students, UniqueStudents, TotalCerts, ParticipationRate%, CertsPerHundred, WeightedPoints`

---

### 4. `modules/analytics/analytics.controller.ts`

```ts
getRanking   → GET /analytics/department-ranking → 200 { data: rows }
getBreakdown → GET /analytics/breakdown/:deptId  → 200 { data: breakdown }
getSummary   → GET /analytics/summary            → 200 { data: summary }
exportCsv    → GET /analytics/export             → 200 text/csv
```

`exportCsv`: sets `Content-Disposition: attachment; filename="ranking-{year}.csv"` + `Content-Type: text/csv`.

---

### 5. `modules/analytics/analytics.routes.ts`

```ts
GET /department-ranking  — requireAuth + requireRole('dept_head','admin')
GET /breakdown/:deptId   — requireAuth + requireRole('dept_head','admin')
GET /summary             — requireAuth + requireRole('admin')
GET /export              — requireAuth + requireRole('admin')
```

---

## Server — 2 modified files

**`credential.service.ts`** — add inside `verifyCredential()` after `cred.save()`:
```ts
import { invalidateCachePrefix } from '@/shared/cache';
invalidateCachePrefix('analytics:');
```

**`routes.ts`** — uncomment F-8 block, add analytics entry to root info, bump version to `'1.0.0-F8'`.

---

## Client — 7 new files

### `features/analytics/types.ts`

```ts
export type AnalyticsMetric = 'participationRate' | 'perHundred' | 'weightedPoints';

export interface DeptRankRow {
  rank: number;
  department: { id: string; code: string; name: string };
  studentStrength: number;
  uniqueStudents: number;
  totalCredentials: number;
  participationRate: number;
  perHundred: number;
  weightedPointsPerHundred: number;
}

export interface CategoryCount  { category: string; count: number }
export interface TierCount      { tier: string;     count: number }
export interface TopCourse      { name: string; issuer: string; count: number }

export interface DeptBreakdown {
  byCategory: CategoryCount[];
  byTier:     TierCount[];
  topCourses: TopCourse[];
}

export interface InstituteSummary {
  totalDepts:              number;
  totalVerified:           number;
  totalStudentsWithCreds:  number;
  avgParticipationRate:    number;
  topDept:                 { name: string; rate: number };
  byTier:                  Record<string, number>;
}
```

---

### `features/analytics/api/analytics.api.ts`

```ts
getRanking(year: number, metric: AnalyticsMetric)  → DeptRankRow[]
getBreakdown(deptId: string, year: number)          → DeptBreakdown
getSummary(year: number)                            → InstituteSummary
exportCsv(year: number)                             → void
```

`exportCsv`: `responseType:'blob'` → `URL.createObjectURL` → hidden `<a>` click → `setTimeout(revoke, 3000)`.

---

### `features/analytics/hooks/useAnalytics.ts`

```ts
analyticsKeys = {
  ranking:   (year, metric) => ['analytics', 'ranking', year, metric],
  breakdown: (deptId, year) => ['analytics', 'breakdown', deptId, year],
  summary:   (year)         => ['analytics', 'summary', year],
}

useRanking(year, metric):    staleTime: 5 * 60 * 1000
useBreakdown(deptId, year):  staleTime: 5 * 60 * 1000; enabled: !!deptId
useSummary(year):            staleTime: 5 * 60 * 1000
useExportCsv():              useMutation (imperative download action)
```

`staleTime` mirrors server cache TTL — prevents redundant refetches inside the same 5-min window.

---

### `features/analytics/components/RankCard.tsx`

Single ranked row card:

- **Rank badge:** #1 = `text-[#b8860b]` (gold) + trophy icon; #2 = silver; #3 = bronze; rest = neutral circle.
- Dept `name` + `code` chip.
- 3 metric columns — active metric **bold + primary colour**.
- Thin progress bar under participationRate (width = `${rate}%`, max 100%).
- Entire card clickable → `navigate('/analytics/:deptId')`.
- Hover: `hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-px transition-all`.

---

### `features/analytics/pages/DepartmentRankingPage.tsx`  `/analytics`

- **Year picker** `<select>`: current year down to 2024.
- **Metric switcher**: 3-pill button group — Participation Rate / Certs per 100 / Weighted Points.
- **Admin summary bar** (conditional on `user.role === 'admin'`): 4 stat cards from `useSummary`.
- **Loading**: 5 skeleton pulse cards (matching RankCard height).
- **Empty**: illustration + "No verified credentials for {year}" message.
- **Ranked list**: `useRanking(year, metric)` → map over `DeptRankRow[]` → `<RankCard>`.
- **dept_head** sees only their own row (filter `row.department.id === user.department`).
- **Export CSV button** (admin only, top-right): calls `useExportCsv().mutate(year)`.

---

### `features/analytics/pages/BreakdownPage.tsx`  `/analytics/:deptId`

- **Guard**: if `user.role === 'dept_head'` and `user.department !== params.deptId` → `<Navigate to="/analytics" />`.
- Back button → `/analytics`.
- Dept name + year in gradient header.
- **Category bar chart** (Recharts `<BarChart layout="vertical">`):
  - Y-axis: category labels; X-axis: count.
  - Each bar coloured by category.
  - Tooltip shows exact count.
- **Tier distribution** (Recharts `<BarChart>` or `<PieChart>`): pass / elite / elite_silver / elite_gold.
- **Top 5 courses** list: course name + issuer chip + count badge.
- Loading / error / empty states for all sections.

---

## Client — 2 modified files

**`app/router.tsx`**:
```tsx
// F-8: Analytics
const DepartmentRankingPage = lazy(() => import('@/features/analytics/pages/DepartmentRankingPage'));
const BreakdownPage         = lazy(() => import('@/features/analytics/pages/BreakdownPage'));

// Routes:
<Route path="/analytics"          element={<ProtectedRoute roles={['dept_head','admin']}><DepartmentRankingPage /></ProtectedRoute>} />
<Route path="/analytics/:deptId"  element={<ProtectedRoute roles={['dept_head','admin']}><BreakdownPage /></ProtectedRoute>} />
```

**`components/layout/BottomNav.tsx`** — add to `FACULTY_QUICK_ACTIONS`:
```ts
{ id:'qa-analytics', label:'Analytics', icon:'bar_chart',
  to:'/analytics', color:'bg-tertiary', textColor:'text-on-tertiary' }
```

---

## Dependencies to install

```bash
# Server
npm install node-cache
npm install --save-dev @types/node-cache

# Client — check if recharts already present first
npm install recharts
```

---

## Key design decisions

| Decision | Rationale |
|----------|-----------|
| `shared/cache.ts` wrapper | Centralised TTL + prefix-invalidation; swap node-cache → Redis = 1 file change |
| `weightedPoints` in JS, not `$project` | `tierPoints` is in `Setting` — injecting it into `$project` requires `$lookup` on settings or `$let`/`$expr` hacks |
| Prefix-wipe on any verify action | Simple and correct; brief stale window acceptable given 5-min cache |
| RBAC in service, not only middleware | Middleware checks role; only service knows if requested `deptId` belongs to the calling `dept_head` |
| `preserveNullAndEmpty:true` in breakdown `$unwind` | Without it, "Other" credentials (no `courseId`) are silently dropped from breakdown |
| Recharts for charts | Common React chart lib, no extra setup; BreakdownPage only shown to faculty/admin |
| `staleTime: 5min` on client hooks | Mirrors server cache TTL — no wasted refetches inside the same window |
| `AdminAnalyticsPage` section inside `DepartmentRankingPage`, not a separate route | Admin still needs to see the ranking; a second route would duplicate the year-picker and metric-switcher logic |

---

## Full file list

**New — server:**
```
server/src/shared/cache.ts
server/src/modules/analytics/analytics.schema.ts
server/src/modules/analytics/analytics.service.ts
server/src/modules/analytics/analytics.controller.ts
server/src/modules/analytics/analytics.routes.ts
```

**Modified — server:**
```
server/src/modules/credentials/credential.service.ts   (+invalidateCachePrefix call)
server/src/routes.ts                                    (+mount, +version bump)
```

**New — client:**
```
client/src/features/analytics/types.ts
client/src/features/analytics/api/analytics.api.ts
client/src/features/analytics/hooks/useAnalytics.ts
client/src/features/analytics/components/RankCard.tsx
client/src/features/analytics/pages/DepartmentRankingPage.tsx
client/src/features/analytics/pages/BreakdownPage.tsx
```

**Modified — client:**
```
client/src/app/router.tsx                               (+2 routes)
client/src/components/layout/BottomNav.tsx              (+1 quick action)
```

---

## Implementation order

```
1.  shared/cache.ts
2.  analytics.schema.ts
3.  analytics.service.ts
4.  analytics.controller.ts + analytics.routes.ts
5.  credential.service.ts  — invalidateCachePrefix hook
6.  routes.ts              — mount + version bump
7.  client: types.ts + analytics.api.ts
8.  client: useAnalytics.ts
9.  client: RankCard.tsx
10. client: DepartmentRankingPage.tsx
11. client: BreakdownPage.tsx
12. client: router.tsx + BottomNav.tsx
13. tsc --noEmit (both) → 0 errors
```
