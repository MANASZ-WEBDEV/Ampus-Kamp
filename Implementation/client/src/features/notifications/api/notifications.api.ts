import { apiClient }              from '@/lib/apiClient';
import type { NotificationsPage } from '../types';

// ── GET /api/v1/notifications ─────────────────────────────────────────────────

export async function getNotifications(
  cursor?: string,
  limit    = 20,
): Promise<NotificationsPage> {
  const params: Record<string, unknown> = { limit };
  if (cursor) params.cursor = cursor;
  const res = await apiClient.get<{ data: NotificationsPage }>('/notifications', { params });
  return res.data.data;
}

// ── PATCH /api/v1/notifications/:id/read ─────────────────────────────────────

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`);
}
