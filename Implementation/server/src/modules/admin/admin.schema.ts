import { z } from 'zod';

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Inline ObjectId validator — consistent with existing module pattern (F-7, F-8). */
const objectId = (field: string) =>
  z.string().regex(/^[a-f\d]{24}$/i, `${field} must be a valid ObjectId`);

// ── GET /admin/users query ────────────────────────────────────────────────────

export const listUsersQuerySchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'active', 'suspended']).optional(),
    role:   z.enum(['student', 'faculty', 'dept_head', 'admin']).optional(),
    q:      z.string().max(100).optional(),   // name / email / enrollmentNo regex
    cursor: z.string().optional(),
    limit:  z.coerce.number().int().min(1).max(50).default(20),
  }),
});

// ── PATCH /admin/users/:id/approve|suspend ────────────────────────────────────

export const userIdParamSchema = z.object({
  params: z.object({
    id: objectId('id'),
  }),
});

// ── PATCH /admin/courses/queue/:credId ────────────────────────────────────────
//
// Either map to an existing courseId OR provide fields to create a new Course.
// `category` is required when creating a new course (ICourse.category is required).

export const mapCourseSchema = z.object({
  params: z.object({
    credId: objectId('credId'),
  }),
  body: z
    .object({
      existingCourseId: z
        .string()
        .regex(/^[a-f\d]{24}$/i)
        .optional(),
      newCourseName: z.string().trim().min(2).max(200).optional(),
      newCourseCode: z.string().trim().max(30).optional(),
      newCourseCategory: z.string().trim().min(1).max(100).optional(),
      issuer:        z.string().trim().max(100).optional(),
    })
    .refine(
      (d) => d.existingCourseId || (d.newCourseName && d.newCourseCategory),
      {
        message:
          'Provide existingCourseId OR both newCourseName and newCourseCategory to create a new course.',
      },
    ),
});

// ── GET /admin/reports query ──────────────────────────────────────────────────

export const listReportsQuerySchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'reviewed', 'dismissed']).optional(),
    cursor: z.string().optional(),
    limit:  z.coerce.number().int().min(1).max(50).default(20),
  }),
});

// ── PATCH /admin/reports/:id ──────────────────────────────────────────────────

export const reviewReportSchema = z.object({
  params: z.object({
    id: objectId('id'),
  }),
  body: z
    .object({
      action:     z.enum(['reviewed', 'dismissed']),
      notes:      z.string().trim().max(1000).optional(),
      userAction: z.enum(['warn', 'suspend']).optional(),
    })
    // 'suspend' is only valid when there is a target user to suspend —
    // enforced in the service (we don't have the report's targetUserId here).
    // Zod only validates the shape; service adds business-rule guard.
    .refine(
      (d) => d.action === 'reviewed' || !d.userAction,
      {
        message: 'userAction can only be set when action is "reviewed".',
      },
    ),
});

// ── GET /admin/audit query ────────────────────────────────────────────────────

export const auditQuerySchema = z.object({
  query: z.object({
    action:  z.string().trim().max(100).optional(),
    userId:  z.string().optional(),
    cursor:  z.string().optional(),
    limit:   z.coerce.number().int().min(1).max(50).default(20),
  }),
});

// ── PATCH /admin/courses/queue/:credId param-only schema ─────────────────────

export const credIdParamSchema = z.object({
  params: z.object({
    credId: objectId('credId'),
  }),
});

export const reportIdParamSchema = z.object({
  params: z.object({
    id: objectId('id'),
  }),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type ListUsersQuery   = z.infer<typeof listUsersQuerySchema>['query'];
export type MapCourseBody    = z.infer<typeof mapCourseSchema>['body'];
export type ReviewReportBody = z.infer<typeof reviewReportSchema>['body'];
export type AuditQuery       = z.infer<typeof auditQuerySchema>['query'];
