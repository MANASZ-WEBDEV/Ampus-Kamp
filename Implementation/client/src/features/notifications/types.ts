// ── Notification types ────────────────────────────────────────────────────────

export type NotifType =
  | 'event_new'
  | 'deadline'
  | 'link_received'
  | 'link_update'
  | 'credential_update'
  | 'link_expiring';

export interface AppNotification {
  id:        string;
  type:      NotifType;
  payload:   Record<string, unknown>;
  readAt:    string | null;  // ISO or null
  createdAt: string;         // ISO
}

export interface NotificationsPage {
  notifications: AppNotification[];
  nextCursor?:   string;
}
