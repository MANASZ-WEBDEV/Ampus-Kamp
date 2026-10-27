// ── Settings ──────────────────────────────────────────────────────────────────

export interface SettingsDto {
  uploadsPer24h:       number;
  pendingCap:          number;
  linksPerDay:         number;
  linkExpiryDays:      number;
  declineCooldownDays: number;
  spotCheckPercent:    number;
  extractionsPerDay:   number;
  rankingMetric:       'participation_rate' | 'per_hundred' | 'weighted_points';
  tierPoints: {
    pass:         number;
    elite:        number;
    elite_silver: number;
    elite_gold:   number;
  };
}

// ── Users ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  _id:          string;
  name:         string;
  email:        string;
  enrollmentNo: string;
  role:         'student' | 'faculty' | 'dept_head' | 'admin';
  status:       'pending' | 'active' | 'suspended';
  department:   { _id: string; name: string; code: string } | null;
  createdAt:    string;
}

export interface AdminUsersPage {
  users:       AdminUser[];
  nextCursor?: string;
}

// ── Course Alias Queue ────────────────────────────────────────────────────────

export interface CourseQueueItem {
  _id:             string;
  otherCourseName: string;
  issuer:          string;
  createdAt:       string;
  studentId: {
    _id:          string;
    name:         string;
    enrollmentNo: string;
  };
}

export interface CourseQueuePage {
  items:       CourseQueueItem[];
  nextCursor?: string;
}

export interface MapCourseBody {
  existingCourseId?:   string;
  newCourseName?:      string;
  newCourseCode?:      string;
  newCourseCategory?:  string;
  issuer?:             string;
}

// ── Reports ───────────────────────────────────────────────────────────────────

export interface AdminReport {
  _id:        string;
  reason:     string;
  status:     'pending' | 'reviewed' | 'dismissed';
  reviewNotes?: string;
  createdAt:  string;
  reporterId:   { _id: string; name: string; enrollmentNo: string };
  targetUserId?: { _id: string; name: string; enrollmentNo: string };
}

export interface AdminReportsPage {
  items:       AdminReport[];
  nextCursor?: string;
}

export interface ReviewReportBody {
  action:      'reviewed' | 'dismissed';
  notes?:      string;
  userAction?: 'warn' | 'suspend';
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export interface AuditEntry {
  _id:      string;
  action:   string;
  meta?:    Record<string, unknown>;
  createdAt: string;
  userId: {
    _id:  string;
    name: string;
    role: string;
  };
}

export interface AuditPage {
  entries:     AuditEntry[];
  nextCursor?: string;
}
