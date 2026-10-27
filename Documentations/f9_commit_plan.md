# F-9 — Notifications & Home Feed · Commit Plan

> Both `npx tsc --noEmit` clean (server ✓, client ✓)

---

## Files Changed

### Server — New Files

| File | Purpose |
|------|---------|
| `server/src/models/notification.model.ts` | `Notification` Mongoose model — 6 types, Mixed payload, `{ userId, readAt, createdAt }` compound index |
| `server/src/modules/notifications/notification.schema.ts` | Zod schemas — list query (cursor + limit) and `:id` param |
| `server/src/modules/notifications/notification.service.ts` | `sendNotification` (fire-and-forget), `getNotifications` (cursor-based), `markRead` (idempotent) |
| `server/src/modules/notifications/notification.controller.ts` | `GET /` + `PATCH /:id/read` — thin, delegates to service |
| `server/src/modules/notifications/notification.routes.ts` | Router — both routes `requireAuth` only |
| `server/src/modules/home/home.service.ts` | `getHomeData` — 30s cache, single `Promise.all`, skill-match with dept/year fallback, empty-key omission |
| `server/src/modules/home/home.controller.ts` | `GET /home` — thin controller |
| `server/src/modules/home/home.routes.ts` | Router |
| `server/src/jobs/deadlineReminders.ts` | Hourly cron — 48h + 4h windows, `AuditLog` dedup (2h window), per-member fan-out |

### Server — Modified Files

| File | Change |
|------|--------|
| `server/src/services/email.service.ts` | Added `sendNotificationEmail` + shared `buildHtml` helper. Existing `sendOtpEmail` unchanged. |
| `server/src/modules/credentials/credential.service.ts` | `verifyCredential` — fires `credential_update` notification after `AuditLog.create` (fire-and-forget) |
| `server/src/modules/links/link.service.ts` | `sendLink` → fires `link_received` + `invalidateHomeCache(recipientId)`. `respondLink` → fires `link_update` on accept/decline + invalidates both sides. |
| `server/src/modules/events/event.service.ts` | `publishEvent` → fires `notifyMatchingStudents` (all active students) + `invalidateAllHomeCaches()` |
| `server/src/server.ts` | Registers `scheduleDeadlineReminders()` alongside existing 5 cron jobs |
| `server/src/routes.ts` | Mounts `homeRouter` + `notificationsRouter`; version bumped to `1.0.0-F9`; F-9 stubs replaced with live mounts |

### Client — New Files

| File | Purpose |
|------|---------|
| `client/src/features/home/types.ts` | `HomeData`, `HomeUser`, `EventSummary`, `TeamPostSummary` types |
| `client/src/features/home/api/home.api.ts` | `getHomeData()` — wraps `GET /api/v1/home` |
| `client/src/features/home/hooks/useHome.ts` | `useHome` — 30s staleTime, refetchOnWindowFocus |
| `client/src/features/home/pages/HomePage.tsx` | Personalised home: greeting card, pending banner, closing-soon scroll, matched posts, all-caught-up empty state |
| `client/src/features/notifications/types.ts` | `AppNotification`, `NotifType`, `NotificationsPage` types |
| `client/src/features/notifications/api/notifications.api.ts` | `getNotifications(cursor?, limit)` + `markNotificationRead(id)` |
| `client/src/features/notifications/hooks/useNotifications.ts` | `useNotifications` (infinite query) + `useMarkRead` (invalidates notifications + home on success) |
| `client/src/features/notifications/pages/NotificationsPage.tsx` | Infinite scroll via `IntersectionObserver`, per-type content, unread highlight, relative timestamps via `Intl.RelativeTimeFormat`, skeleton + empty + error states |

### Client — Modified Files

| File | Change |
|------|---------|
| `client/src/app/router.tsx` | Replaces `StudentHomePage` import with `HomePage`; activates `/notifications` route (was commented out) |
| `client/src/components/layout/BottomNav.tsx` | Profile tab shows unread dot (error-colored) driven by `useHome().data.unreadNotificationsFlag` |

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Email for 3 types only** (`event_new`, `deadline`-48h, `credential_update`) | Conservative — avoids spam. Link events are frequent and in-app only. |
| **Fire-and-forget `sendNotification`** | Notification failures must never block or degrade the primary API response. Errors logged to stderr. |
| **AuditLog dedup for deadline reminders** | Avoids adding a `lastRemindedAt` field to the Event model (SRP). The `(action, meta.eventId, meta.hoursLeft)` triple is a natural dedup key. |
| **Fan-out 4h window emails suppressed** | 4h reminder is in-app only — too close to deadline to act on email. |
| **Cursor-based pagination** | ObjectId cursors are stable (no skipping on fast inserts), cheaper than `skip`/`count`, consistent under concurrent writes. |
| **`useHome` drives unread dot in BottomNav** | Single source of truth — no separate API call. Re-uses the cached 30s home data. |
| **Campus-wide `event_new` notifications** | `IEvent` has no `department` field. Eligibility scoping is a feed concern; notifications are discovery signals. |

---

## Suggested Commits

```bash
# 1 — Server: Notification model, service, email, cron, home feed
git add server/src/models/notification.model.ts \
        server/src/modules/notifications/ \
        server/src/modules/home/ \
        server/src/jobs/deadlineReminders.ts \
        server/src/services/email.service.ts \
        server/src/server.ts \
        server/src/routes.ts

git commit -m "feat(server/F-9): notifications model, home feed API, deadline cron, email"

# 2 — Server: hook notifications into credentials and links
git add server/src/modules/credentials/credential.service.ts \
        server/src/modules/links/link.service.ts \
        server/src/modules/events/event.service.ts

git commit -m "feat(server/F-9): wire notification triggers in credential, link, event services"

# 3 — Client: HomePage, NotificationsPage, router, BottomNav
git add client/src/features/home/ \
        client/src/features/notifications/ \
        client/src/app/router.tsx \
        client/src/components/layout/BottomNav.tsx

git commit -m "feat(client/F-9): HomePage, NotificationsPage, unread dot in BottomNav"
```
