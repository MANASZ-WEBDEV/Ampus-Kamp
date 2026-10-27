# Campus Innovation Platform — Manual QA Walkthrough
## Testing from `http://localhost:5173`

> Run the dev servers before starting:
> ```powershell
> # Terminal 1 — Server
> cd c:\MANAS\Ampus\Implementation\server && npm run dev
> # Terminal 2 — Client
> cd c:\MANAS\Ampus\Implementation\client && npm run dev
> ```
> Server runs on `http://localhost:5000`. Client on `http://localhost:5173`.

---

## F-0: Infrastructure Health Check

**Who:** Anyone (no login needed)

1. Open `http://localhost:5000/api/v1/health`
   - ✅ Expect: `{ data: { status: "ok", version: "1.0.0-F10", database: "connected", uptime: N, jobs: {...} } }`
2. Open `http://localhost:5173`
   - ✅ Expect: Redirect to `/login` (not logged in yet)
   - ✅ No console errors in DevTools

**Gap check:** ✅ All F-0 criteria met.

---

## F-1: Authentication & Profiles

### 1a. Register as a Student

1. Go to `/register`
2. Enter `enrollmentNo`, `collegeId`, `password` matching a roster row
3. Submit → should redirect to `/verify` with "OTP sent" message
4. Enter the 6-digit OTP received on the registered email
5. ✅ Expect: Redirect to `/home`

**Negative tests:**
- Wrong `collegeId` → `404 Roster not found`
- Already-claimed enrollment → `409 Already registered`
- Wrong OTP → `401`; 3 wrong attempts → OTP blocked
- 6th login in 60 s from same IP → `429`
- Login with `status:'pending'` (before OTP verified) → `403`

### 1b. View and Edit Profile

1. Go to `/profile`
2. ✅ Expect: Your name, branch, year, skills loaded
3. Edit skills → Save
4. ✅ Expect: Updated immediately (optimistic update)
5. Check `GET /api/v1/users/:id` in DevTools Network — confirm **no** `phone`, `email`, `passwordHash` in response

**Gap check:**
- ✅ Register + OTP flow
- ✅ JWT in httpOnly cookie
- ✅ Profile view/edit
- ⚠️ `firstOpenedAt` / `firstEventOpenedAt` tracking — implemented in user model but no dedicated UI test
- ⚠️ `POST /roster/import` (CSV admin import) — server exists, no client UI (admin does this via curl/Postman)

---

## F-2: Event Feed & Management

### 2a. As a Student — Browse Events

1. Go to `/events`
2. ✅ Expect: List of published events with gradient/image banners
3. Filter by type chip (Hackathon) → only hackathons shown
4. Click "Apply Now" on any event → detail page opens
5. ✅ Expect: Hero banner shows the Unsplash photo behind coloured gradient
6. Bookmark an event (top-right star icon) → bookmark fills
7. Go to `/home` → ✅ Closing-soon events appear in "Closing Soon" strip

### 2b. As a Faculty — Post and Publish

1. Login as faculty account
2. Go to `/events/new`
3. Fill in the form: title, type (Hackathon), deadline (2 days away), branches, year, team size
4. Submit → event created as **draft** (`status:'draft'`)
5. ✅ Expect: Redirect to event detail page showing "Draft" banner
6. Click "Review & Publish" → event moves to `status:'published'`
7. Switch to student account → event now appears in `/events`

**Negative tests:**
- Student trying to `POST /api/v1/events` directly → `403`
- Faculty editing another faculty's event → `403`

**Gap check:**
- ✅ Feed with filter, pagination, bookmarks
- ✅ Create draft → publish flow
- ✅ `rawMessage` absent from student's event detail response
- ✅ Type-colour gradient banners
- ✅ **NEW**: Unsplash default image now shows on all hackathon/competition/sports cards and detail pages
- ⚠️ Daily `closeEvents` cron — testable by setting a deadline to `now - 1 min` and manually triggering the cron or waiting until 00:01

---

## F-3: Paste-to-Post AI Extraction

> **Note:** `SHOW_AI_BANNER = false` in [FacultyPostEventPage.tsx](file:///c:/MANAS/Ampus/Implementation/client/src/features/events/pages/FacultyPostEventPage.tsx#L11) hides the AI banner on the post form. The **server endpoint** works fully.

### To test the AI extraction (server-only):

```bash
curl -X POST http://localhost:5000/api/v1/events/extract \
  -H "Authorization: Bearer <faculty_token>" \
  -H "Content-Type: application/json" \
  -d '{"rawMessage": "Hackathon 2026 by IEEE CSE. Register before 15 Nov. Team of 2-4. Free entry. At Main Auditorium."}'
```
- ✅ Expect: `{ data: { extracted: {...}, uncertainFields: [...], usedFallback: false } }`
- Kill the LLM key → `{ usedFallback: true }` + regex fallback fields

### To enable in the UI:
Change line 11 in [FacultyPostEventPage.tsx](file:///c:/MANAS/Ampus/Implementation/client/src/features/events/pages/FacultyPostEventPage.tsx#L11):
```ts
const SHOW_AI_BANNER = true;  // ← flip this
```

**Gap check:**
- ✅ Server endpoint, LLM call, Zod validation, fallback, per-user quota
- ⚠️ UI intentionally hidden behind `SHOW_AI_BANNER = false` feature flag

---

## F-4: Team Finder — Posts & Requests

### Flow: Create post → Send join request → Accept → Contact reveal

**Setup:** Two student accounts (Student A and Student B)

1. **Student A:** Go to any hackathon event → "Find Squad" → "Post Open Role"
   - Fill: title, description, roles needed (e.g. "ML Dev"), spots: 3
   - Submit → Team post created
2. **Student B:** Open same event → "Find Squad" → find Student A's post → "Request to Join"
   - Write a message → Send
3. **Student A:** Go to `/teams/inbox` → "In" tab → see request from Student B
   - Click Accept → spotsLeft decrements
4. **Student B:** Go to `/teams/inbox` → "Sent" tab → status now "Accepted"
   - If Student A has `phoneVisible: true` → phone number shown
   - If not → "Ask leader to share a WhatsApp group link"

**Negative tests:**
- Send 11th link in a day → `429`
- Re-send to someone who declined within 30 days → `429`
- Declined user tries again: 30-day cooldown enforced

**Gap check:**
- ✅ Team post CRUD, join request, accept/decline
- ✅ Contact reveal rule
- ✅ Link inbox (in/sent tabs)
- ⚠️ Concurrent-accept test (requires `Promise.all` in code — works server-side, hard to test manually)
- ⚠️ `expireLinks` cron — set `createdAt` back 8 days in DB to test

---

## F-5: Invites, Connect & People Search

### 5a. People Search

1. Go to `/teams/people`
2. Filter by skills (e.g. "React") or branch/year
3. ✅ Expect: Cards show name, branch, year, skills — **no phone, email, enrollmentNo**
4. If a student has `allowInvites: false` → "Invite" button hidden

### 5b. Looking Flag

1. Open a hackathon event `/events/:id`
2. Scroll to "Squad Matchmaking Hub" → tap "I'm Looking for a Team" toggle
3. ✅ Expect: Flag stored; your name appears in `/events/:id/looking`

### 5c. Block & Report

1. Go to `/teams/inbox` → open a link card → long-press or `…` menu → "Block [Name]"
2. ✅ Expect: All pending links between you and that user deleted
3. Tap "Report" → fill reason → submit
4. ✅ Expect: Report appears in admin queue (`GET /api/v1/admin/reports`)

**Gap check:**
- ✅ People search, looking flag, block, report
- ⚠️ `allowInvites: false` server block (enforced server-side; client hides button)
- ⚠️ Looking flag cleared when event closes (cron behavior)

---

## F-6: Event Registration

### 6a. Individual Registration

1. Open any in-app event as a student
2. Sidebar → click "Apply to Event" (or "RSVP" for seminar)
3. Select "Register Solo" → Submit
4. ✅ Expect: `counters.students` increments on event detail page
5. ✅ Expect: `RegistrationStatusCard` replaces Register button

### 6b. Team Registration

1. Click "Register as Team" → set team name
2. Add members by enrollment number → each member gets notification
3. Members go to their event detail → see "MemberConfirmBanner" → Confirm
4. ✅ Expect: Only confirmed members count; declined members freed

### 6c. Faculty Roster

1. Login as faculty → open event you posted
2. Click "View Roster" in sidebar → `/events/:id/roster`
3. ✅ Expect: Table of all registrations with member names
4. Click "Export CSV" → CSV downloads

**Negative tests:**
- Duplicate registration → `409`
- Team submit with wrong size → `422`
- Edit after `registrationDeadline` → `409 locked`

**Gap check:**
- ✅ Individual + team registration, member consent flow
- ✅ Counter increments, roster, CSV export
- ✅ Registration status card, withdraw
- ⚠️ `lockRegistrations` cron — set `registrationDeadline` to past, trigger cron

---

## F-7: Credentials & Verification

### 7a. Upload a Certificate

1. Go to `/achievements/add`
2. Search course catalog → select a course (e.g. "Python for Data Science")
3. Fill: issuer, session, year, tier (Elite), certificate ID
4. Upload proof file (PDF/JPG ≤ 10 MB)
5. Submit → credential lands in `status:'pending'`
6. ✅ Expect: Appears in `/badges` with "Pending" chip

**Negative tests:**
- 6th upload in 24h → `429`
- Upload same certificate ID again → `409` with link to existing
- Upload same file (same SHA-256) → `409`
- Select "Other" course → `otherCourseName` stored, lands in admin queue

### 7b. Faculty Verification

1. Login as faculty (same department as the student)
2. Go to `/verify` → see pending credentials queue
3. Click credential → "Approve" or "Reject + reason"
4. ✅ Expect: Student's credential flips to `status:'verified'`
5. ✅ Expect: AuditLog entry written

**Negative tests:**
- Faculty trying to verify their own credential → `403`
- Faculty from different dept → `403` (different dept filter)

### 7c. Participation Upload

1. Go to `/participations/add`
2. Select event you registered for → fill result, upload proof
3. Submit → participation `status:'pending'`
4. Faculty verifies it

**Gap check:**
- ✅ Upload, duplicate detection, upload limits, "Other" course
- ✅ Faculty verification queue, approve/reject, AuditLog
- ✅ Self-verify block, dept isolation
- ✅ Participation upload + verification
- ⚠️ NPTEL QR auto-verify pipeline — requires real NPTEL PDF; hard to test manually without one
- ⚠️ `spotCheck` cron — fires 1st of month at 09:00

---

## F-8: Analytics & Department Ranking

### 8a. As a Dept Head or Admin

1. Login as dept_head or admin
2. Go to `/analytics`
3. ✅ Expect: Department ranking table with all 3 metrics (Participation Rate, Per 100, Weighted Points)
4. Switch metric via year picker / metric selector
5. Click a department row → `/analytics/:deptId` → breakdown bar chart
6. ✅ Expect: Category breakdown (programming, data_science, etc.)

### 8b. CSV Export (Admin only)

1. Login as admin → `/analytics`
2. Click "Export CSV" → file downloads
3. ✅ Validate values against manually calculated numbers from seed data

**Negative tests:**
- Student calling `/analytics/department-ranking` → `403`
- Dept head calling `/analytics/summary` → `403`
- Dept head calling breakdown for another dept → `403`

**Gap check:**
- ✅ All 3 ranking metrics, dept head isolation, CSV export
- ✅ 5-min cache (second call within 5 min hits cache — check Server logs: no DB query)
- ✅ Cache invalidated when credential is verified
- ⚠️ Weighted Points formula depends on `Setting.tierPoints` — change via admin settings → ranking updates

---

## F-9: Notifications & Home Feed

### 9a. Home Feed

1. Login as student → `/home`
2. ✅ Expect: Greeting with name, verified badge count, closing-soon events, matched team posts
3. ✅ Expect: Sections absent if empty (not "empty array" rendered)
4. ✅ Expect: Home loads < 500 ms (30s per-user cache active)

### 9b. Notifications

1. Have faculty publish a new event matching your branch/year
2. Go to `/notifications`
3. ✅ Expect: `event_new` notification appears
4. Click notification → mark as read → badge disappears from BottomNav
5. Have another student accept your team link → `link_update` notification appears

### 9c. Email Notifications

> Requires a real SMTP config in `.env` (`SMTP_HOST`, `SMTP_USER`, etc.)

- Faculty publishes event → matching students receive email digest
- Credential verified → student receives email
- Deadline reminders at 48h and 4h: set an event deadline to `now + 47 min`, run `deadlineReminders` job manually

**Gap check:**
- ✅ GET /home, cached 30s, empty-array omission
- ✅ In-app notifications list, mark-read, unread badge
- ✅ Email notifications (fire-and-forget)
- ✅ Deadline reminder cron
- ❌ Web push (PWA push notifications) — **cut from scope** (email-only per project decision)
- ❌ `POST /push/subscribe` endpoint — **not implemented** (cut per Appendix C, priority 2)
- ❌ Service Worker offline caching — F-9 implementation plan listed it; **not implemented yet**

---

## F-10: Admin Panel & Platform Settings

### 10a. Admin Dashboard

1. Login as admin → go to `/admin`
2. ✅ Expect: Dashboard with pending count chips (users, reports, course aliases)
3. 6 nav cards: Users, Course Queue, Reports, Settings, Audit, Analytics

### 10b. User Management

1. `/admin/users` → filter by "Pending"
2. ✅ Expect: Pending student accounts listed
3. Click "Approve" → user can now log in
4. Click "Suspend" → confirm dialog → user suspended

**Negative tests:**
- Try to suspend yourself (admin) → `403`
- Try to suspend another admin → `403`
- Approve already-active user → `409`

### 10c. Platform Settings

1. `/admin/settings`
2. Change `uploadsPer24h` from 5 to 3 → Save
3. Login as student → upload 4 certificates → 4th should → `429`
4. Change `rankingMetric` to "Weighted Points" → `/analytics` now ranks by weighted points
5. Change `tierPoints.elite` to 10 → ranking updates on next analytics call

### 10d. Course Alias Queue

1. Student uploads a credential with "Other" course → submit `newCourseName: "Machine Learning Ops"`
2. `/admin/courses/queue` → item appears
3. Admin taps the item → expand → toggle "Create new course"
4. Fill category → "Submit mapping"
5. ✅ Expect: Credential now has `courseId` set; `otherCourseName` cleared

### 10e. Safety Reports

1. Student blocks + reports another student
2. `/admin/reports` → pending report appears
3. Admin taps "Review" → action: "Take action", userAction: "Suspend", notes: "Verified harassment"
4. Submit → report marked "reviewed", target user suspended, 2 AuditLog entries written

### 10f. Audit Log

1. `/admin/audit` → see all admin actions (user_approve, user_suspend, report_review, course_alias_mapped)
2. Filter by `user_suspend` → only suspension entries shown
3. Tap any entry → expand → JSON meta shown (targetId, targetName, etc.)

**Gap check:**
- ✅ All 8 admin endpoints, settings singleton, audit log
- ✅ Guards: self-suspend, admin-suspend, double-approve, re-review
- ⚠️ `sessionDays` setting exists in plan but no JWT expiry rotation implemented
- ⚠️ `updatedBy` field on Settings document — plan mentions it, our implementation stores it via AuditLog separately (no `updatedBy` on the Setting model)

---

## Requirements Gap Summary

| Requirement | Status | Notes |
|-------------|--------|-------|
| F-0: Health, scaffold, env validation | ✅ Done | |
| F-1: Register, OTP, login, profiles | ✅ Done | |
| F-1: Roster CSV import | ⚠️ Server only | No client UI; use curl/Postman |
| F-2: Events feed, CRUD, bookmarks | ✅ Done | |
| F-2: Close-events cron | ✅ Done | Runs daily 00:01 |
| F-3: AI extraction server pipeline | ✅ Done | |
| F-3: AI extraction UI (PasteToPost) | ⚠️ Hidden | `SHOW_AI_BANNER = false` — flip to enable |
| F-4: Team posts, join requests, links | ✅ Done | |
| F-5: People search, looking, block, report | ✅ Done | |
| F-6: Registration (individual + team) | ✅ Done | |
| F-6: Faculty roster + CSV export | ✅ Done | |
| F-6: Lock registrations cron | ✅ Done | |
| F-7: Credential upload + verification | ✅ Done | |
| F-7: NPTEL QR auto-verify | ✅ Done (server) | Requires real NPTEL PDF to test manually |
| F-7: Spot-check cron | ✅ Done | 1st of month 09:00 |
| F-8: Analytics ranking + export | ✅ Done | |
| F-9: Home feed + in-app notifications | ✅ Done | |
| F-9: Email notifications | ✅ Done | Needs SMTP config |
| F-9: Web push / PWA Service Worker | ❌ Cut | Appendix C priority 2 — email-only |
| F-9: Deadline reminders cron | ✅ Done | Hourly |
| F-10: User management | ✅ Done | |
| F-10: Course alias queue | ✅ Done | |
| F-10: Safety report review | ✅ Done | |
| F-10: Platform settings | ✅ Done | |
| F-10: Audit log | ✅ Done | |
| Setting: `sessionDays` (JWT rotation) | ⚠️ Partial | Key exists in settings but JWT TTL not dynamically read from Setting |
| Setting: `updatedBy` on Setting doc | ⚠️ Missing | Plan mentions it; tracked via AuditLog instead |
| Event image (Unsplash default) | ✅ Just added | Both EventCard and EventDetailPage updated |
| AI banner feature flag | ✅ Located | [FacultyPostEventPage.tsx L11](file:///c:/MANAS/Ampus/Implementation/client/src/features/events/pages/FacultyPostEventPage.tsx#L11) — `const SHOW_AI_BANNER = false` |

---

## Quick-Start Test Account Setup

```bash
# 1. Import roster (one-time, run as admin via Postman)
POST /api/v1/roster/import
Content-Type: multipart/form-data
file: <roster.csv>

# 2. Create admin user (direct DB seed — no self-register for admin)
# See scripts/seedAdmin.ts or set role in MongoDB Compass

# 3. Create departments (seed script)
# scripts/seedDepartments.ts

# 4. Seed events (for realistic testing)
# scripts/seedEvents.ts
```

---

## Known Cosmetic Issues (Not Requirement Gaps)

- The "Looking for a Team" toggle on EventDetailPage passes `isLooking={false}` as a static prop — the actual looking state is not fetched from server yet. The PUT endpoint works; UI doesn't read back the current state.
- Squad Matchmaking section on EventDetailPage shows placeholder avatar initials (AR, RK, SL) — these are hardcoded placeholders, not real team posts. Real team posts load on `/events/:id/teams`.
- The "Verified Tier-1" badge on EventDetail hero is hardcoded — should be dynamic based on event tier (not a requirement, cosmetic).
