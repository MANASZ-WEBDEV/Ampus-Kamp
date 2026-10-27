# F-9: Notifications & Home Feed — Implementation Plan

> **Requirements:** FR-29, FR-30, FR-31, FR-39, FR-40, FR-S3
> **Pre-conditions:** F-8 merged and green (`tsc --noEmit` = 0 errors).

---

## What already exists (do NOT recreate)

| Asset | Location | Notes |
|-------|----------|-------|
| `email.service.ts` | `server/src/services/email.service.ts` | `sendOtpEmail` exists; F-9 **extends** with `sendNotificationEmail` |
| `User` model | `server/src/models/user.model.ts` | `firstEventOpenedAt`, `skills`, `year`, `department` already present |
| `vite.config.ts` Workbox rules | `client/vite.config.ts` lines 56–73 | Event feed (`StaleWhileRevalidate`, 60s) + profile (30s) cache = **FR-S3 already done** |
| VitePWA plugin | `client/vite.config.ts` | `registerType: 'autoUpdate'` already configured |
| 5 existing cron jobs | `server/src/jobs/` | `closeEvents`, `closeTeamPosts`, `expireLinks`, `lockRegistrations`, `spotCheck` |
| `shared/cache.ts` | `server/src/shared/cache.ts` | F-8 cache wrapper — used for 30s home cache |
| `routes.ts` stubs | `server/src/routes.ts` | F-9 commented stubs: `homeRouter`, `notificationsRouter` |
| `node-cron` | `server/package.json` | Already installed |
| `nodemailer` | `server/package.json` | Already installed |

---

## Dependencies to install

```bash
# Server only — web-push is the only new dep
npm install web-push
npm install --save-dev @types/web-push
```

> ⚠️ **VAPID keys** must be generated once and stored in `.env`:
> ```bash
> npx web-push generate-vapid-keys
> ```
> Add to server `.env`:
> ```
> VAPID_SUBJECT=mailto:admin@campus.edu
> VAPID_PUBLIC_KEY=<generated>
> VAPID_PRIVATE_KEY=<generated>
> ```
> Add `VITE_VAPID_PUBLIC_KEY` to client `.env` for browser subscription.

---

## Server — 2 new models

### 1. `models/notification.model.ts`

```ts
interface INotification {
  userId:    Types.ObjectId;   // ref → User
  type:      NotificationType;
  payload:   Record<string, unknown>;  // Mixed — type-safe via discriminated union in service
  readAt?:   Date;
  createdAt: Date;
}

type NotificationType =
  | 'event_new'          // new event matching branch/year
  | 'deadline'           // 48h + 4h before event deadline
  | 'link_received'      // team request/invite received
  | 'link_update'        // link accepted or declined
  | 'credential_update'  // credential verified or rejected
  | 'link_expiring';     // pending link expires tomorrow

// Compound index: fast unread-first list per user
{ userId: 1, readAt: 1, createdAt: -1 }
```

### 2. `models/pushSubscription.model.ts`

```ts
interface IPushSubscription {
  userId:   Types.ObjectId;    // ref → User
  endpoint: string;            // unique — one document per browser/device
  keys: {
    p256dh: string;
    auth:   string;
  };
  createdAt: Date;
}

// Unique: endpoint (prevents duplicate registrations for same device)
// Index: userId (fast lookup for sending)
```

---

## Server — 10 new files

### 1. `shared/push.ts`

Thin wrapper around `web-push`:

```ts
import webPush from 'web-push';
import { env } from '@/config/env';

// Initialise VAPID on module load (throws at startup if keys missing)
webPush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

export interface PushPayload {
  title:   string;
  body:    string;
  icon?:   string;   // default: '/pwa-192x192.png'
  url?:    string;   // deep-link on notification click
  tag?:    string;   // browser deduplication key
}

/**
 * sendPushToUser — fan-out to all active subscriptions for a userId.
 * - Deletes expired (410 Gone) subscriptions silently.
 * - Daily cap: 5 non-urgent pushes per user via node-cache counter.
 *   Urgent types bypass cap (deadline 4h, credential_update).
 * - iOS fallback: if ALL pushes fail → call emailFallback if provided.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  opts?: { urgent?: boolean; emailFallback?: () => Promise<void> }
): Promise<void>
```

**Daily cap implementation:**
```ts
// Cache key: `push:cap:{userId}:{YYYY-MM-DD}`
// TTL: seconds until midnight (per-day expiry without a cron)
// Non-urgent pushes: skip if cap.count >= 5
// Urgent pushes: always send — no cap check
```

---

### 2. `modules/notifications/notification.service.ts`

```ts
// Discriminated union for type safety
type NotifPayload =
  | { type: 'event_new';         eventId: string; eventTitle: string }
  | { type: 'deadline';          eventId: string; eventTitle: string; hoursLeft: 48 | 4 }
  | { type: 'link_received';     linkId: string; fromName: string }
  | { type: 'link_update';       linkId: string; status: 'accepted' | 'declined' }
  | { type: 'credential_update'; credId: string; status: 'verified' | 'rejected' }
  | { type: 'link_expiring';     linkId: string };

// sendNotification — fire-and-forget (callers do: void sendNotification(...))
// 1. Notification.create(document)   ← in-app notification always created
// 2. sendPushToUser(userId, ...)      ← best-effort
// 3. If email-eligible: sendNotificationEmail(...)  ← email.service.ts
//
// email-eligible types: event_new, link_received, credential_update
export function sendNotification(userId: string, payload: NotifPayload): void

// API-facing
export async function getNotifications(userId: string, cursor?: string, limit?: number)
export async function markRead(userId: string, notificationId: string): Promise<void>
```

**Push payload per type:**
| Type | Title | Body | url | urgent |
|------|-------|------|-----|--------|
| `event_new` | "New Event" | eventTitle | `/events/{id}` | No |
| `deadline` 48h | "Deadline in 48h" | eventTitle | `/events/{id}` | No |
| `deadline` 4h | "Deadline in 4h!" | eventTitle | `/events/{id}` | **Yes** |
| `link_received` | "Team Request" | fromName wants to connect | `/teams/inbox` | No |
| `link_update` | "Link {accepted/declined}" | — | `/teams/inbox` | No |
| `credential_update` | "Cert {Verified/Rejected}" | — | `/badges` | **Yes** |
| `link_expiring` | "Request Expiring" | — | `/teams/inbox` | No |

---

### 3. `modules/notifications/notification.schema.ts`

```ts
listQuerySchema:  { cursor?: string; limit?: number (1–50, default 20) }
idParamSchema:    { id: objectId('id') }
```

### 4. `modules/notifications/notification.controller.ts`

```ts
listNotifications(req, res, next)     // GET  /notifications
markNotificationRead(req, res, next)  // PATCH /notifications/:id/read
// userId ALWAYS from req.user.id — never a query param
```

### 5. `modules/notifications/notification.routes.ts`

```ts
GET   /notifications          — requireAuth (all roles)
PATCH /notifications/:id/read — requireAuth (all roles)
```

### 6. `modules/push/push.schema.ts`

```ts
subscribeBodySchema:
  endpoint: z.string().url()
  keys: { p256dh: z.string(), auth: z.string() }

unsubscribeBodySchema:
  endpoint: z.string().url()
```

### 7. `modules/push/push.controller.ts`

```ts
subscribePush(req, res, next):
  // Upsert PushSubscription by endpoint — idempotent (same device re-subscribes safely)

unsubscribePush(req, res, next):
  // Delete by endpoint — no-op if not found (204 always)
```

### 8. `modules/push/push.routes.ts`

```ts
POST   /push/subscribe   — requireAuth + requireRole(['student'])
DELETE /push/subscribe   — requireAuth + requireRole(['student'])
```

### 9. `modules/home/home.service.ts`

```ts
export async function getHomeData(userId: string): Promise<HomeData>
```

**One parallel `Promise.all` for all data:**
```ts
const [user, verifiedBadgeCount, pendingCount, closingSoon, teamPosts, unreadFlag] =
  await Promise.all([
    User.findById(userId).populate('department', 'name'),
    Credential.countDocuments({ studentId: userId, 'verification.status': 'verified' }),
    TeamLink.countDocuments({ $or:[{from:userId},{to:userId}], status:'pending' }),
    Event.find({ deadline: { $gte: now, $lt: now+48h }, status:'published' })
          .sort({ deadline: 1 }).limit(5).lean(),
    /* skills match → fallback */
    TeamPost.find({ requiredSkills: { $in: user.skills } }).limit(5).lean()
      // if empty: .find({ department: user.department, year: user.year }).limit(5)
    Notification.exists({ userId, readAt: null }),
  ]);
```

**Cache:** `home:{userId}` — TTL 30s via `setCache`.
**Invalidation hooks:** (added in other services)
- `invalidateCachePrefix('home:')` — on new event published
- `invalidateCache('home:{userId}')` — on link create/update

**Empty-key omission:**
```ts
if (pendingCount > 0)    resp.pendingRequestCount = pendingCount;
if (closingSoon.length)  resp.closingSoonEvents   = closingSoon;
if (teamPosts.length)    resp.matchedTeamPosts    = teamPosts;
```

### 10. `modules/home/home.controller.ts` + `modules/home/home.routes.ts`

```ts
GET /home — requireAuth (all roles)
// userId from req.user.id only
```

---

### 11. `jobs/deadlineReminders.ts`

```ts
// Schedule: '0 * * * *' (every hour)
// Window 48h: events where deadline ∈ [now+47h, now+49h]
// Window 4h:  events where deadline ∈ [now+3h, now+5h]
//
// Double-send dedup:
//   AuditLog.exists({
//     action: 'deadline_reminder',
//     'meta.eventId': eventId,
//     'meta.hoursLeft': hoursLeft,
//     createdAt: { $gte: now - 2h }
//   }) → skip if already sent within 2h
//
// Fan-out: Registration.find({ eventId, status:'registered' })
//          → for each registrant → void sendNotification(userId, { type:'deadline', ... })
//
// After sending: AuditLog.create({ action:'deadline_reminder', meta:{ eventId, hoursLeft } })
```

**Why AuditLog for dedup (not a field on Event)?**
`AuditLog` is already indexed on `(userId, action, createdAt)`. Adding a `reminderSentAt48h` field couples the deadline scheduling concern directly to the domain model — violates SRP.

---

## Server — 5 modified files

### `services/email.service.ts`
Add `sendNotificationEmail()` alongside `sendOtpEmail` — same transporter, same dev-fallback pattern:
```ts
export async function sendNotificationEmail(payload: {
  to: string; name: string;
  subject: string; bodyText: string; ctaUrl?: string; ctaLabel?: string;
}): Promise<void>
```

### `modules/events/event.service.ts`
After `event.save()` in `createEvent()`:
```ts
// 1. Invalidate all home caches (new event is relevant to everyone)
invalidateCachePrefix('home:');
// 2. Async push to matching students — non-blocking
void notifyMatchingStudents(event);

async function notifyMatchingStudents(event: IEvent) {
  // User.find({ department: event.department, status: 'active' })
  // for each → void sendNotification(userId, { type:'event_new', ... })
}
```

### `modules/credentials/credential.service.ts`
In `verifyCredential()`, after existing `invalidateCachePrefix('analytics:')`:
```ts
void sendNotification(cred.studentId.toString(), {
  type:   'credential_update',
  credId: cred._id.toString(),
  status: body.verdict,
});
```

### `modules/links/link.service.ts`
- On link created: `void sendNotification(recipientId, { type:'link_received', ... })` + `invalidateCache('home:{recipientId}')`
- On link updated (accepted/declined): `void sendNotification(requesterId, { type:'link_update', ... })`

### `routes.ts`
```ts
import { homeRouter }          from '@/modules/home/home.routes';
import { notificationsRouter } from '@/modules/notifications/notification.routes';
import { pushRouter }          from '@/modules/push/push.routes';

app.use('/api/v1/home',          homeRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/push',          pushRouter);
// version: '1.0.0-F9'
```

---

## Client — 8 new files

### `features/home/types.ts`
```ts
export interface HomeData {
  user: { name: string; branch: string; year: number|null; verifiedBadgeCount: number };
  pendingRequestCount?:    number;
  closingSoonEvents?:      EventSummary[];
  matchedTeamPosts?:       TeamPostSummary[];
  unreadNotificationsFlag: boolean;
}
```

### `features/home/api/home.api.ts`
```ts
export async function getHomeData(): Promise<HomeData>
```

### `features/home/hooks/useHome.ts`
```ts
export function useHome() {
  return useQuery({
    queryKey:           ['home'],
    queryFn:            getHomeData,
    staleTime:          30_000,     // mirrors server 30s cache
    refetchOnWindowFocus: true,     // refresh on tab focus
  });
}
```

### `features/home/pages/HomePage.tsx`  `/home`

Four conditional blocks:

**GreetingBlock** (always shown):
- Gradient card: "Hi {name}" + trophy icon.
- "{verifiedBadgeCount} verified badges" chip → `/badges`.

**PendingBanner** (if `pendingRequestCount > 0`):
- Amber warning card: "{n} pending team requests" → `/teams/inbox`.

**ClosingSoonSection** (if `closingSoonEvents?.length`):
- Horizontal scroll row of event cards.
- Countdown chip: "Closes in Xh" — computed with `Date.now()`.

**MatchedTeamPostsSection** (if `matchedTeamPosts?.length`):
- Subtitle: "Based on your skills" / "Based on your branch & year".
- Vertical list, click → `/events/:eventId/teams`.

Loading: skeleton for each block (same height, animate-pulse).
`usePushSetup()` called on mount (see below).

---

### `features/notifications/types.ts`
```ts
export type NotifType = 'event_new'|'deadline'|'link_received'|'link_update'|'credential_update'|'link_expiring';
export interface Notification { _id: string; type: NotifType; payload: Record<string,unknown>; readAt?: string; createdAt: string }
```

### `features/notifications/api/notifications.api.ts`
```ts
getNotifications(cursor?, limit?): { notifications: Notification[]; nextCursor?: string }
markRead(id: string): void
subscribePush(sub: PushSubscriptionJSON): void
unsubscribePush(endpoint: string): void
```

### `features/notifications/hooks/useNotifications.ts`

```ts
useNotifications():
  useInfiniteQuery with cursor-based pagination
  queryKey: ['notifications']
  getNextPageParam: (lastPage) => lastPage.nextCursor

useMarkRead():
  useMutation → onSuccess: invalidateQueries(['notifications'])

usePushSetup():
  // Called once on HomePage mount.
  // Idempotent: localStorage.getItem('push:subscribed') === 'true' → skip.
  // Flow:
  //   navigator.serviceWorker.ready
  //     .then(reg => reg.pushManager.subscribe({ userVisibleOnly:true,
  //       applicationServerKey: VITE_VAPID_PUBLIC_KEY }))
  //     .then(sub => api.subscribePush(sub.toJSON()))
  //     .then(() => localStorage.setItem('push:subscribed','true'))
  //     .catch(() => {})  // never throws — push is best-effort
  useEffect(() => { void setupPush(); }, []);
```

### `features/notifications/pages/NotificationsPage.tsx`  `/notifications`

- `useInfiniteQuery` via `useNotifications()`.
- IntersectionObserver on last item → `fetchNextPage()`.
- Per item:
  - Icon per type (Material Symbols).
  - Bold title + body text derived from payload.
  - `Intl.RelativeTimeFormat` relative timestamp.
  - Unread: primary-container highlight; tap → `useMarkRead().mutate(id)`.
- Empty state: bell icon + "No notifications yet".
- Loading: 5 skeleton rows.

---

## Client — 2 modified files

### `app/router.tsx`
```tsx
// Replace StudentHomePage with new HomePage
const HomePage          = lazy(() => import('@/features/home/pages/HomePage'));
const NotificationsPage = lazy(() => import('@/features/notifications/pages/NotificationsPage'));

// /home route: replace existing StudentHomePage route
<Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
<Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
```

### `components/layout/BottomNav.tsx`
- Profile nav tab: add a red dot badge when `useHome().data?.unreadNotificationsFlag === true`.
- The dot is a `6×6` px circle absolutely positioned on the icon — same pattern as iOS notification badges.

---

## FR-S3 Status — ✅ Already done

| Requirement | Already implemented |
|-------------|---------------------|
| Cache event feed offline | `vite.config.ts` L56–63: `StaleWhileRevalidate`, 60s |
| Cache own profile offline | `vite.config.ts` L64–72: `StaleWhileRevalidate`, 30s |
| PWA service worker | `registerType: 'autoUpdate'` + Workbox |

**No changes to `vite.config.ts`.**

---

## Key design decisions

| Decision | Rationale |
|----------|-----------|
| `sendNotification()` is `void` not `async` — fire-and-forget | Spec: "notification sending is async — never blocks API response" |
| Daily push cap via node-cache TTL to midnight | Avoids a DB write per push; TTL auto-expires the counter at day-end without a cleanup cron |
| Double-send dedup via `AuditLog` (not Event field) | Reuses indexed model; keeps Event model free of scheduling concerns (SRP) |
| Home cache keyed by userId, 30s TTL | Personalised data can't be shared across users |
| `invalidateCachePrefix('home:')` on new event | Cheap fan-out; node-cache iteration is in-process; all home caches stale = correct |
| `invalidateCache('home:{userId}')` on link events | Targeted — only the affected user's home invalidated |
| `usePushSetup` idempotent via localStorage | Prevents duplicate POST /push/subscribe on every mount |
| iOS push → email fallback | iOS has limited Push API support; email ensures delivery |
| Cursor pagination on notifications (ObjectId) | Offset pagination loses rows on a fast-inserting collection; ObjectId cursor is stable |
| FR-S3 already done in vite.config.ts | No new SW code; declarative Workbox config is idiomatic for VitePWA |

---

## Full file list

**New — server:**
```
server/src/models/notification.model.ts
server/src/models/pushSubscription.model.ts
server/src/shared/push.ts
server/src/modules/notifications/notification.schema.ts
server/src/modules/notifications/notification.service.ts
server/src/modules/notifications/notification.controller.ts
server/src/modules/notifications/notification.routes.ts
server/src/modules/push/push.schema.ts
server/src/modules/push/push.controller.ts
server/src/modules/push/push.routes.ts
server/src/modules/home/home.service.ts
server/src/modules/home/home.controller.ts
server/src/modules/home/home.routes.ts
server/src/jobs/deadlineReminders.ts
```

**Modified — server:**
```
server/src/services/email.service.ts              (+sendNotificationEmail)
server/src/modules/events/event.service.ts        (+notification trigger + home cache invalidation)
server/src/modules/credentials/credential.service.ts (+credential_update notification)
server/src/modules/links/link.service.ts          (+link notifications + home cache)
server/src/routes.ts                              (+3 mounts + version 1.0.0-F9)
```

**New — client:**
```
client/src/features/home/types.ts
client/src/features/home/api/home.api.ts
client/src/features/home/hooks/useHome.ts
client/src/features/home/pages/HomePage.tsx
client/src/features/notifications/types.ts
client/src/features/notifications/api/notifications.api.ts
client/src/features/notifications/hooks/useNotifications.ts
client/src/features/notifications/pages/NotificationsPage.tsx
```

**Modified — client:**
```
client/src/app/router.tsx              (replace StudentHomePage + add NotificationsPage)
client/src/components/layout/BottomNav.tsx  (unread dot badge)
```

---

## Implementation order

```
1.  npm install web-push @types/web-push (server)
2.  Generate VAPID keys → add to .env
3.  models/notification.model.ts
4.  models/pushSubscription.model.ts
5.  shared/push.ts
6.  services/email.service.ts (+sendNotificationEmail)
7.  modules/notifications/notification.service.ts
8.  modules/notifications/schema + controller + routes
9.  modules/push/schema + controller + routes
10. modules/home/home.service.ts
11. modules/home/home.controller.ts + home.routes.ts
12. jobs/deadlineReminders.ts + register in server.ts
13. event.service.ts — notification trigger + home cache invalidation
14. credential.service.ts — credential_update notification
15. link.service.ts — link_received/link_update + home cache
16. routes.ts — 3 mounts + version bump
17. client: home/types + api + useHome + HomePage.tsx
18. client: notifications/types + api + useNotifications + NotificationsPage.tsx
19. client: router.tsx + BottomNav.tsx
20. tsc --noEmit (both) → 0 errors
```
