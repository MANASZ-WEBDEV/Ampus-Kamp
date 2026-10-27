// ── Metric types ──────────────────────────────────────────────────────────────

export type AnalyticsMetric =
  | 'participationRate'
  | 'perHundred'
  | 'weightedPoints';

// ── Ranking ───────────────────────────────────────────────────────────────────

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

// ── Breakdown ─────────────────────────────────────────────────────────────────

export interface CategoryCount { category: string; count: number }
export interface TierCount     { tier: string;     count: number }
export interface TopCourse     { name: string; issuer: string; count: number }

export interface DeptBreakdown {
  byCategory: CategoryCount[];
  byTier:     TierCount[];
  topCourses: TopCourse[];
}

// ── Institute summary ─────────────────────────────────────────────────────────

export interface InstituteSummary {
  totalDepts:             number;
  totalVerified:          number;
  totalStudentsWithCreds: number;
  avgParticipationRate:   number;
  topDept:                { name: string; rate: number } | null;
  byTier:                 Record<string, number>;
}
