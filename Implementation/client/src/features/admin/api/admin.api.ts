import { apiClient } from '@/lib/apiClient';
import type {
  SettingsDto,
  AdminUsersPage,
  CourseQueuePage,
  MapCourseBody,
  AdminReportsPage,
  ReviewReportBody,
  AuditPage,
} from '../types';

const BASE = '/admin';

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<SettingsDto> {
  const res = await apiClient.get<{ data: SettingsDto }>('/settings');
  return res.data.data;
}

export async function updateSettings(
  body: Partial<SettingsDto>,
): Promise<SettingsDto> {
  const res = await apiClient.put<{ data: SettingsDto }>('/settings', body);
  return res.data.data;
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function listAdminUsers(params: {
  status?: string;
  role?:   string;
  q?:      string;
  cursor?: string;
  limit?:  number;
}): Promise<AdminUsersPage> {
  const res = await apiClient.get<{ data: AdminUsersPage }>(`${BASE}/users`, {
    params,
  });
  return res.data.data;
}

export async function approveUser(id: string): Promise<void> {
  await apiClient.patch(`${BASE}/users/${id}/approve`);
}

export async function suspendUser(id: string): Promise<void> {
  await apiClient.patch(`${BASE}/users/${id}/suspend`);
}

// ── Course Alias Queue ────────────────────────────────────────────────────────

export async function getCourseQueue(params?: {
  cursor?: string;
  limit?:  number;
}): Promise<CourseQueuePage> {
  const res = await apiClient.get<{ data: CourseQueuePage }>(
    `${BASE}/courses/queue`,
    { params },
  );
  return res.data.data;
}

export async function mapCourseAlias(
  credId: string,
  body:   MapCourseBody,
): Promise<void> {
  await apiClient.patch(`${BASE}/courses/queue/${credId}`, body);
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function listReports(params?: {
  status?: string;
  cursor?: string;
  limit?:  number;
}): Promise<AdminReportsPage> {
  const res = await apiClient.get<{ data: AdminReportsPage }>(
    `${BASE}/reports`,
    { params },
  );
  return res.data.data;
}

export async function reviewReport(
  id:   string,
  body: ReviewReportBody,
): Promise<void> {
  await apiClient.patch(`${BASE}/reports/${id}`, body);
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export async function listAuditLog(params?: {
  action?:  string;
  userId?:  string;
  cursor?:  string;
  limit?:   number;
}): Promise<AuditPage> {
  const res = await apiClient.get<{ data: AuditPage }>(
    `${BASE}/audit`,
    { params },
  );
  return res.data.data;
}
