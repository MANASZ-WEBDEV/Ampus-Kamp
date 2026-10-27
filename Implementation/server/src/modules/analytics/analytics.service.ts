import mongoose from 'mongoose';
import { Credential }   from '@/models/credential.model';
import { Dept }         from '@/models/dept.model';
import { getSetting }   from '@/models/setting.model';
import { ForbiddenError } from '@/shared/errors';
import { getCache, setCache } from '@/shared/cache';
import type { AuthUser } from '@/shared/types';
import type { RankingQuery, BreakdownQuery, SummaryQuery } from './analytics.schema';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DeptRankRow {
  rank:                     number;
  department:               { id: string; code: string; name: string };
  studentStrength:          number;
  uniqueStudents:           number;
  totalCredentials:         number;
  participationRate:        number;   // uniqueStudents / strength * 100
  perHundred:               number;   // totalCredentials / strength * 100
  weightedPointsPerHundred: number;   // Σ(tierPoints[tier] * count) / strength * 100
}

interface TierCount { tier: string; count: number }

// ── Helpers ───────────────────────────────────────────────────────────────────

const CACHE_TTL   = 300;  // 5 min — must match NodeCache stdTTL
const CURRENT_YEAR = new Date().getFullYear();

function rankingCacheKey(year: number)              { return `analytics:ranking:${year}`; }
function summCacheKey(year: number)                 { return `analytics:summary:${year}`; }
function breakdownCacheKey(deptId: string, year: number) { return `analytics:breakdown:${deptId}:${year}`; }

/**
 * assignRanks — stable ranking with tie-sharing.
 * Equal scores share the same rank; the next rank skips accordingly.
 */
function assignRanks(rows: Omit<DeptRankRow, 'rank'>[], metric: string): DeptRankRow[] {
  type MetricKey = 'participationRate' | 'perHundred' | 'weightedPointsPerHundred';
  const key = metric as MetricKey;
  const sorted = [...rows].sort((a, b) => b[key] - a[key]);
  let rank = 1;
  return sorted.map((row, i) => {
    if (i > 0 && sorted[i - 1]![key] !== row[key]) rank = i + 1;
    return { ...row, rank } as DeptRankRow;
  });
}

/**
 * computeWeightedPoints — runs a per-department tier-count aggregation in parallel
 * then maps tierPoints (from Setting) to a normalised score.
 *
 * Design: done in JS (not $project) because tierPoints lives in Setting —
 * embedding it in the pipeline would require $lookup on settings or $let/$expr hacks.
 */
async function computeWeightedPoints(
  deptIds: string[],
  year: number,
  studentStrengthMap: Map<string, number>,
  tierPoints: Record<string, number>,
): Promise<Map<string, number>> {
  // One aggregation — group by (department, tier) for all depts at once.
  const raw = await Credential.aggregate<{ _id: { dept: mongoose.Types.ObjectId; tier: string }; count: number }>([
    {
      $match: {
        'verification.status': 'verified',
        year,
        department: { $in: deptIds.map(id => new mongoose.Types.ObjectId(id)) },
      },
    },
    {
      $group: {
        _id:   { dept: '$department', tier: '$tier' },
        count: { $sum: 1 },
      },
    },
  ]);

  // Accumulate per dept.
  const pointsMap = new Map<string, number>();
  for (const row of raw) {
    const deptId   = row._id.dept.toString();
    const strength = studentStrengthMap.get(deptId) ?? 0;
    if (strength === 0) continue;
    const pts = (tierPoints[row._id.tier] ?? 0) * row.count;
    pointsMap.set(deptId, (pointsMap.get(deptId) ?? 0) + (pts / strength * 100));
  }
  return pointsMap;
}

// ── CSV helper ────────────────────────────────────────────────────────────────
// RFC 4180 — no external dependency (same pattern as F-6 streamRosterCsv).

function escCsv(v: unknown): string {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ── getDepartmentRanking ───────────────────────────────────────────────────────

/**
 * Returns all departments with at least one student, ranked by the requested metric.
 * Result is cached keyed by year only (metric is a client-side sort concern).
 * On cache hit: re-sort in-process (O(n log n), n ≤ ~50 depts — negligible).
 */
export async function getDepartmentRanking(
  { year = CURRENT_YEAR, metric = 'participationRate' }: RankingQuery,
): Promise<DeptRankRow[]> {
  const cacheKey = rankingCacheKey(year);
  const cached   = getCache<Omit<DeptRankRow, 'rank'>[]>(cacheKey);

  let rows: Omit<DeptRankRow, 'rank'>[];

  if (cached) {
    rows = cached;
  } else {
    // ── 4-stage aggregation pipeline (verbatim from master spec §7.6) ─────────
    const pipeline = await Credential.aggregate<{
      _id: mongoose.Types.ObjectId;
      uniqueStudents: number;
      totalCredentials: number;
      department: { id: string; code: string; name: string };
      studentStrength: number;
      participationRate: number;
      perHundred: number;
    }>([
      { $match: { 'verification.status': 'verified', year } },

      // Stage 1: certs per (dept, student) pair
      {
        $group: {
          _id: { dept: '$department', student: '$studentId' },
          n:   { $sum: 1 },
        },
      },

      // Stage 2: roll up to department level
      {
        $group: {
          _id:              '$_id.dept',
          uniqueStudents:   { $sum: 1 },
          totalCredentials: { $sum: '$n' },
        },
      },

      // Stage 3: join dept metadata
      {
        $lookup: {
          from:         'depts',
          localField:   '_id',
          foreignField: '_id',
          as:           'd',
        },
      },
      { $unwind: '$d' },

      // Guard: exclude depts where studentStrength = 0 (division-by-zero)
      { $match: { 'd.studentStrength': { $gt: 0 } } },

      // Stage 4: project final shape + compute rate metrics
      {
        $project: {
          department: {
            id:   { $toString: '$_id' },
            code: '$d.code',
            name: '$d.name',
          },
          studentStrength:  '$d.studentStrength',
          uniqueStudents:   1,
          totalCredentials: 1,
          participationRate: {
            $multiply: [{ $divide: ['$uniqueStudents', '$d.studentStrength'] }, 100],
          },
          perHundred: {
            $multiply: [{ $divide: ['$totalCredentials', '$d.studentStrength'] }, 100],
          },
        },
      },
    ]);

    // ── Weighted points (JS post-processing) ──────────────────────────────────
    const tierPoints = await getSetting<Record<string, number>>(
      'tierPoints',
      { pass: 1, elite: 2, elite_silver: 3, elite_gold: 4 },
    );

    const strengthMap = new Map(pipeline.map(r => [r.department.id, r.studentStrength]));
    const deptIds     = pipeline.map(r => r.department.id);
    const wpMap       = await computeWeightedPoints(deptIds, year, strengthMap, tierPoints);

    rows = pipeline.map(r => ({
      department:               r.department,
      studentStrength:          r.studentStrength,
      uniqueStudents:           r.uniqueStudents,
      totalCredentials:         r.totalCredentials,
      participationRate:        r.participationRate,
      perHundred:               r.perHundred,
      weightedPointsPerHundred: wpMap.get(r.department.id) ?? 0,
    }));

    setCache(cacheKey, rows, CACHE_TTL);
  }

  return assignRanks(rows, metric);
}

// ── getDeptBreakdown ──────────────────────────────────────────────────────────

export interface DeptBreakdown {
  byCategory: { category: string; count: number }[];
  byTier:     TierCount[];
  topCourses: { name: string; issuer: string; count: number }[];
}

/**
 * Per-department breakdown: category distribution, tier distribution, top-5 courses.
 * dept_head: can only view their own department.
 */
export async function getDeptBreakdown(
  deptId: string,
  { year = CURRENT_YEAR }: BreakdownQuery,
  requestingUser: AuthUser,
): Promise<DeptBreakdown> {
  // RBAC — enforced in service (middleware can check role; only service knows deptId ownership)
  if (
    requestingUser.role === 'dept_head' &&
    requestingUser.department?.toString() !== deptId
  ) {
    throw new ForbiddenError('Department heads can only view their own department breakdown.');
  }

  const cacheKey = breakdownCacheKey(deptId, year);
  const cached   = getCache<DeptBreakdown>(cacheKey);
  if (cached) return cached;

  const deptOid  = new mongoose.Types.ObjectId(deptId);
  const baseMatch = { 'verification.status': 'verified', department: deptOid, year };

  // Run 3 aggregations in parallel — no inter-dependency
  const [byCategory, byTier, topCourses] = await Promise.all([
    // Category distribution — preserveNullAndEmpty keeps "Other" credentials (no courseId)
    Credential.aggregate<{ _id: string; count: number }>([
      { $match: baseMatch },
      { $lookup: { from: 'courses', localField: 'courseId', foreignField: '_id', as: 'c' } },
      { $unwind: { path: '$c', preserveNullAndEmptyArrays: true } },
      { $group: { _id: { $ifNull: ['$c.category', 'other'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    // Tier distribution
    Credential.aggregate<{ _id: string; count: number }>([
      { $match: baseMatch },
      { $group: { _id: '$tier', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    // Top 5 courses (only catalog courses — Other creds have no courseId)
    Credential.aggregate<{ _id: mongoose.Types.ObjectId; count: number; name: string; issuer: string }>([
      { $match: { ...baseMatch, courseId: { $exists: true, $ne: null } } },
      { $group: { _id: '$courseId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'c' } },
      { $unwind: '$c' },
      { $project: { name: '$c.name', issuer: '$c.issuer', count: 1 } },
    ]),
  ]);

  const result: DeptBreakdown = {
    byCategory: byCategory.map(r => ({ category: r._id, count: r.count })),
    byTier:     byTier.map(r => ({ tier: r._id, count: r.count })),
    topCourses: topCourses.map(r => ({ name: r.name, issuer: r.issuer, count: r.count })),
  };

  setCache(cacheKey, result, CACHE_TTL);
  return result;
}

// ── getInstituteSummary ───────────────────────────────────────────────────────

export interface InstituteSummary {
  totalDepts:             number;
  totalVerified:          number;
  totalStudentsWithCreds: number;
  avgParticipationRate:   number;
  topDept:                { name: string; rate: number } | null;
  byTier:                 Record<string, number>;
}

/** Admin-only. Full institute-wide summary. */
export async function getInstituteSummary(
  { year = CURRENT_YEAR }: SummaryQuery,
): Promise<InstituteSummary> {
  const cacheKey = summCacheKey(year);
  const cached   = getCache<InstituteSummary>(cacheKey);
  if (cached) return cached;

  const match = { 'verification.status': 'verified', year };

  const [totalDepts, totalVerified, distinctStudents, tierAgg, ranking] = await Promise.all([
    Dept.countDocuments(),
    Credential.countDocuments(match),
    // distinct() returns array of unique studentIds — .length gives count without $group
    Credential.distinct('studentId', match).then(arr => arr.length),
    Credential.aggregate<{ _id: string; count: number }>([
      { $match: match },
      { $group: { _id: '$tier', count: { $sum: 1 } } },
    ]),
    // Re-use getDepartmentRanking (cache-first) to avoid duplicate aggregation
    getDepartmentRanking({ year, metric: 'participationRate' }),
  ]);

  const byTier: Record<string, number> = {};
  for (const { tier, count } of tierAgg as unknown as TierCount[]) byTier[tier] = count;

  const avgParticipationRate =
    ranking.length > 0
      ? ranking.reduce((s, r) => s + r.participationRate, 0) / ranking.length
      : 0;

  const topDept = ranking[0]
    ? { name: ranking[0].department.name, rate: ranking[0].participationRate }
    : null;

  const result: InstituteSummary = {
    totalDepts,
    totalVerified,
    totalStudentsWithCreds: distinctStudents,
    avgParticipationRate,
    topDept,
    byTier,
  };

  setCache(cacheKey, result, CACHE_TTL);
  return result;
}

// ── exportRankingCsv ──────────────────────────────────────────────────────────

/**
 * Returns a RFC-4180 compliant CSV string of the ranking.
 * Uses getDepartmentRanking (cache-first) — no redundant DB hit on warm cache.
 */
export async function exportRankingCsv(year: number): Promise<string> {
  const rows = await getDepartmentRanking({ year, metric: 'participationRate' });

  const HEADERS = [
    'Rank', 'Department', 'Code', 'Students',
    'UniqueStudents', 'TotalCerts',
    'ParticipationRate%', 'CertsPerHundred', 'WeightedPoints',
  ];

  const lines = [
    HEADERS.join(','),
    ...rows.map(r =>
      [
        r.rank,
        escCsv(r.department.name),
        escCsv(r.department.code),
        r.studentStrength,
        r.uniqueStudents,
        r.totalCredentials,
        r.participationRate.toFixed(2),
        r.perHundred.toFixed(2),
        r.weightedPointsPerHundred.toFixed(2),
      ].join(','),
    ),
  ];

  return lines.join('\r\n');
}
