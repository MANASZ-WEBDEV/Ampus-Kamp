import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import type { SettingsDto, AdminUsersPage, CourseQueuePage, AdminReportsPage, AuditPage, MapCourseBody, ReviewReportBody } from '../types';
import {
  getSettings,
  updateSettings,
  listAdminUsers,
  approveUser,
  suspendUser,
  getCourseQueue,
  mapCourseAlias,
  listReports,
  reviewReport,
  listAuditLog,
} from '../api/admin.api';

// ── Query key factory ─────────────────────────────────────────────────────────

export const adminKeys = {
  settings:   () => ['settings']                                    as const,
  users:      (f: object)  => ['admin', 'users', f]                as const,
  courseQueue: ()           => ['admin', 'courses', 'queue']        as const,
  reports:    (s?: string) => ['admin', 'reports', s ?? 'all']     as const,
  audit:      (f: object)  => ['admin', 'audit', f]                as const,
};

// ── Settings ──────────────────────────────────────────────────────────────────

export function useSettings() {
  return useQuery({
    queryKey: adminKeys.settings(),
    queryFn:  getSettings,
    staleTime: 60_000, // 1 min — settings change rarely
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SettingsDto>) => updateSettings(body),
    onSuccess: () => {
      // Invalidate settings and analytics — tierPoints/rankingMetric affect rankings
      void qc.invalidateQueries({ queryKey: adminKeys.settings() });
      void qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

// ── Users ─────────────────────────────────────────────────────────────────────

export function useAdminUsers(filter: {
  status?: string;
  role?:   string;
  q?:      string;
}) {
  return useInfiniteQuery<AdminUsersPage, Error, InfiniteData<AdminUsersPage>, ReturnType<typeof adminKeys.users>, string | undefined>({
    queryKey:    adminKeys.users(filter),
    queryFn:     ({ pageParam }) =>
      listAdminUsers({ ...filter, cursor: pageParam, limit: 20 }),
    initialPageParam: undefined,
    getNextPageParam:  (last) => last.nextCursor,
    staleTime: 30_000,
  });
}

export function useApproveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveUser(id),
    onSuccess:  () => void qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => suspendUser(id),
    onSuccess:  () => void qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

// ── Course Alias Queue ────────────────────────────────────────────────────────

export function useCourseQueue() {
  return useInfiniteQuery<CourseQueuePage, Error, InfiniteData<CourseQueuePage>, ReturnType<typeof adminKeys.courseQueue>, string | undefined>({
    queryKey:         adminKeys.courseQueue(),
    queryFn:          ({ pageParam }) => getCourseQueue({ cursor: pageParam, limit: 20 }),
    initialPageParam: undefined,
    getNextPageParam:  (last) => last.nextCursor,
    staleTime: 30_000,
  });
}

export function useMapCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ credId, body }: { credId: string; body: MapCourseBody }) =>
      mapCourseAlias(credId, body),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: adminKeys.courseQueue() }),
  });
}

// ── Reports ───────────────────────────────────────────────────────────────────

export function useAdminReports(status?: string) {
  return useInfiniteQuery<AdminReportsPage, Error, InfiniteData<AdminReportsPage>, ReturnType<typeof adminKeys.reports>, string | undefined>({
    queryKey:         adminKeys.reports(status),
    queryFn:          ({ pageParam }) =>
      listReports({ status, cursor: pageParam, limit: 20 }),
    initialPageParam: undefined,
    getNextPageParam:  (last) => last.nextCursor,
    staleTime: 30_000,
  });
}

export function useReviewReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReviewReportBody }) =>
      reviewReport(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
      // Also invalidate users — userAction:suspend may have changed a user's status
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export function useAuditLog(filter: { action?: string; userId?: string }) {
  return useInfiniteQuery<AuditPage, Error, InfiniteData<AuditPage>, ReturnType<typeof adminKeys.audit>, string | undefined>({
    queryKey:         adminKeys.audit(filter),
    queryFn:          ({ pageParam }) =>
      listAuditLog({ ...filter, cursor: pageParam, limit: 20 }),
    initialPageParam: undefined,
    getNextPageParam:  (last) => last.nextCursor,
    staleTime: 60_000, // audit log rarely needs real-time updates
  });
}
