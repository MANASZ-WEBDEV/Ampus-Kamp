# Dummy Data Audit — Ampus Client

> Scanned: all `.tsx` files under `client/src/`  
> Status: dummy data is **preserved** — this is a read-only audit.  
> Legend: 🔴 Must replace before go-live · 🟡 Needs API when feature ships · 🟢 Config/static — safe to keep hardcoded

---

## Summary

| Page / Feature | Dummy Constants | Real Data Needed | Priority |
|---|---|---|---|
| **HomePage** | `DUMMY_EVENTS`, `DUMMY_SQUADS`, `DUMMY_DEADLINES`, `DUMMY_MENTORS` | Events feed, user squads, closing-soon events, mentor list | 🔴 |
| **ProfilePage** | `CREDENTIALS[]`, `SQUAD_MEMBERSHIPS[]` | User's credentials from DB, user's active squad memberships | 🔴 |
| **TeamFinderPage** | `SQUADS[]`, `FREE_AGENTS[]`, `EVENT_CHIPS[]` | Active team posts, looking-list users, real event list | 🔴 |
| **TeamCommandHubPage** | `APPLICANTS[]`, countdown `47h 42m 19s` | Real applicants from DB, event deadline from event doc | 🔴 |
| **DepartmentDashboardPage** | `TRACK_DATA`, `CHART_POINTS`, `YEAR_COHORTS`, `LEDGER_ROWS`, all KPI numbers | Analytics API — credentials by track, activity points time-series, cohort enrolment, verifications ledger | 🔴 |
| **CollegeLeaderboardPage** | `DEPT_ROWS[]`, all KPI numbers (3420, 1942, 8120, 91.8%) | Department analytics aggregation API, NIRF/NAAC metrics | 🔴 |
| **FacultyVerificationQueuePage** | `WORKLIST[]`, `AUDIT_CHECKS[]`, all KPI numbers | Real pending credentials queue from DB | 🔴 |
| **AddAchievementPage** | `RECENT_VERIFICATIONS[]`, `HONOR_CODE_FAQS[]` | User's recent verification history; FAQs can stay static | 🟡 |
| **FacultyPostEventPage** | `BROADCAST_CHANNELS[]`, `RUBRIC_ROWS[]`, `ROLE_TRACKS[]` | Channels = config; Rubric = config; Role tracks = config | 🟢 |
| **Admin pages** | None — all wired to real API hooks ✅ | — | ✅ |
| **Auth pages** | None ✅ | — | ✅ |
| **Events feed / detail** | None — all wired to real API hooks ✅ | — | ✅ |

---

## Page-by-Page Breakdown

### 🏠 HomePage / StudentHomePage
**File:** `src/features/home/pages/HomePage.tsx` · `src/pages/StudentHomePage.tsx`

| Constant | Current dummy value | Real data needed | API endpoint |
|---|---|---|---|
| `DUMMY_EVENTS` | 4 hardcoded event objects | Published, closing-soon events for the student's eligibility | `GET /api/v1/events?status=published&limit=4` |
| `DUMMY_SQUADS` | 3 hardcoded squad objects | User's active team memberships | `GET /api/v1/teams/my` (not yet built) |
| `DUMMY_DEADLINES` | 3 hardcoded deadline rows | Events the user has bookmarked / registered for, sorted by deadline | `GET /api/v1/events?bookmarked=true&sort=deadline` |
| `DUMMY_MENTORS` | 1 hardcoded mentor | Faculty mentors linked to the student's department | `GET /api/v1/users?role=faculty&dept=:deptId` |

**What to build:** A `useHomeFeed()` hook that fetches all 4 in one request (or 4 parallel queries).

---

### 👤 ProfilePage
**File:** `src/pages/ProfilePage.tsx`

| Constant | Current dummy value | Real data needed | API endpoint |
|---|---|---|---|
| `CREDENTIALS[]` | 5 hardcoded credential objects (NPTEL, AWS, etc.) | User's actual submitted credentials | `GET /api/v1/credentials?userId=me` |
| `SQUAD_MEMBERSHIPS[]` | 2 hardcoded squad rows | User's active team memberships | `GET /api/v1/teams/my` |

**Note:** `profile`, `name`, `skills`, `phone`, `role` are already real (from `useAuth()` + `GET /users/me`). Only credentials and squad memberships are fake.

---

### 🏆 TeamFinderPage
**File:** `src/features/teams/pages/TeamFinderPage.tsx`

| Constant | Current dummy value | Real data needed | API endpoint |
|---|---|---|---|
| `SQUADS[]` | 4 hardcoded team posts | Real team posts from DB | `GET /api/v1/teams/posts` (already exists — hook it up) |
| `FREE_AGENTS[]` | 3 hardcoded "looking" users | Users with `isLooking=true` | `GET /api/v1/users/looking` |
| `EVENT_CHIPS[]` | 4 hardcoded event name chips | Published events (for filter) | `GET /api/v1/events?status=published&limit=20` |
| `ROLE_TRACKS[]` | 5 hardcoded skill strings | Could stay static OR derive from team post tags | 🟢 Config — safe to keep |

---

### 📋 TeamCommandHubPage
**File:** `src/features/teams/pages/TeamCommandHubPage.tsx`

| Constant | Current dummy value | Real data needed | API endpoint |
|---|---|---|---|
| `APPLICANTS[]` | 3 hardcoded applicant objects | Real applicants who requested to join the user's squad | `GET /api/v1/teams/:teamId/applications` |
| `countdown 47h 42m 19s` | Hardcoded seconds | Derive from `event.deadline - now` | Use event data from `GET /api/v1/events/:id` |
| `tabs` | Static tab labels | Labels are static — counts must come from API | `GET /api/v1/teams/:id/applications?status=pending` for badge count |

---

### 📊 DepartmentDashboardPage
**File:** `src/features/analytics/pages/DepartmentDashboardPage.tsx`  
> **This page is almost entirely dummy data.** Every number needs a real API.

| Constant | Current dummy value | Real data needed |
|---|---|---|
| `SIDENAV_ITEMS` badges (14, 3) | Hardcoded | `GET /api/v1/credentials/pending/count`, `GET /api/v1/events/pending/count` |
| KPI: **482** verified certs | Hardcoded | `GET /api/v1/analytics/dept/:id/summary` → `verifiedCerts` |
| KPI: **74.6%** participation | Hardcoded | Same summary → `participationRate` |
| KPI: **86** live competitions | Hardcoded | Same summary → `activeEvents` |
| KPI: **1,840** activity points | Hardcoded | Same summary → `totalActivityPoints` |
| `TRACK_DATA` (5 rows) | Hardcoded participation by track | `GET /api/v1/analytics/dept/:id/by-track` |
| `CHART_POINTS` (7 months) | `[30,45,60,80,65,85,110]` | `GET /api/v1/analytics/dept/:id/monthly-points` |
| `YEAR_COHORTS` (3 rows) | Hardcoded SE/TE/BE enrolment | `GET /api/v1/analytics/dept/:id/cohorts` |
| `LEDGER_ROWS` (4 rows) | Hardcoded names / creds | `GET /api/v1/credentials?dept=:id&status=verified&limit=5` |
| HoD name "Dr. Ranganathan" | Hardcoded string | From `GET /users/me` (dept_head's own profile) |
| NAAC coordinator "Dr. Priya K." | Hardcoded | Department settings / user with `naacCoordinator=true` flag |
| NIRF Target Q2 "88%" | Hardcoded | `GET /api/v1/analytics/dept/:id/nirf-target` |

---

### 🏅 CollegeLeaderboardPage
**File:** `src/features/analytics/pages/CollegeLeaderboardPage.tsx`  
> **Almost entirely dummy data.** Admin-level aggregation API needed.

| Constant | Current dummy value | Real data needed |
|---|---|---|
| KPI: **3,420** enrolled | Hardcoded | `GET /api/v1/analytics/college/summary` → `totalEnrolled` |
| KPI: **1,942** verified creds | Hardcoded | Same → `totalVerifiedCreds` |
| KPI: **8,120** activity pts | Hardcoded | Same → `totalActivityPoints` |
| KPI: **91.8%** accreditation | Hardcoded | Same → `accreditationReadiness` |
| `DEPT_ROWS[]` (6 departments) | Full hardcoded leaderboard | `GET /api/v1/analytics/college/leaderboard` |
| `ALGO_WEIGHTS[]` (4 weight cards) | Static formula weights | 🟢 Config — safe to keep (or move to DB if weights are tunable) |
| Bottom 3 panels (NIRF 28.4/30, SLA 34 items, SSR 3.78/4.00) | All hardcoded | `GET /api/v1/analytics/college/nirf`, `GET /api/v1/credentials/pending/count`, `GET /api/v1/analytics/college/naac-projection` |
| VC name "Dr. Aris Thorne" | Hardcoded | From `GET /users/me` (admin's own profile) |

---

### ✅ FacultyVerificationQueuePage
**File:** `src/features/credentials/pages/FacultyVerificationQueuePage.tsx`

| Constant | Current dummy value | Real data needed |
|---|---|---|
| `WORKLIST[]` (3 entries) | 3 hardcoded worklist items | `GET /api/v1/credentials?status=pending&assignedTo=me` — **partially wired** (credential queue hook exists but fallback to worklist static for the priority inspector panel) |
| `AUDIT_CHECKS[]` (4 checks) | "100% MATCH CONFIDENCE" etc. | These are computed server-side per credential — `GET /api/v1/credentials/:id/audit` |
| KPI: **17 queue**, **11 verified**, **4 deferred**, **92.4% SLA** | Hardcoded numbers | `GET /api/v1/credentials/faculty-stats` |
| Cycle cutoff timer "4d 18h 22m" | Hardcoded | From institutional settings or active accreditation cycle doc |
| Faculty name "Dr. Aris Thorne" | Hardcoded in navbar | From `GET /users/me` |

---

### 🎯 AddAchievementPage
**File:** `src/features/credentials/pages/AddAchievementPage.tsx`

| Constant | Real data status |
|---|---|
| `TIERS[]` | 🟢 Static config — keep |
| `CATEGORY_TRACKS[]` | 🟢 Static config — keep |
| `LEDGER_CRED_TYPES[]` | 🟢 Static config — keep |
| `RUBRIC_ROWS[]` | 🟢 Static config — keep |
| `RECENT_VERIFICATIONS[]` | 🟡 Should be real — `GET /api/v1/credentials?status=verified&userId=me&limit=3` |
| `HONOR_CODE_FAQS[]` | 🟢 Static content — keep |

---

## What's Already Fully Real (No Dummy Data)

| Feature | Status |
|---|---|
| Event Feed (`/events`) | ✅ Real — `useEventFeed()` with paginated API |
| Event Detail (`/events/:id`) | ✅ Real — `useEventDetail()` |
| Event Registration (Apply/bookmark) | ✅ Real |
| Team Posts (`/events/:id/teams`) | ✅ Real — `useTeamPosts()` |
| Link Inbox (`/teams/inbox`) | ✅ Real — `useLinkRequests()` |
| Looking List (`/events/:id/looking`) | ✅ Real — `useLookingList()` |
| People Search (`/teams/people`) | ✅ Real — `usePeopleSearch()` |
| Faculty Roster (`/events/:id/roster`) | ✅ Real — `useFacultyRoster()` |
| Admin: User Management | ✅ Real |
| Admin: Audit Log | ✅ Real |
| Admin: Safety Reports | ✅ Real |
| Admin: Course Alias Queue | ✅ Real |
| Admin: Settings | ✅ Real |
| Auth (Login / Register / OTP) | ✅ Real |
| Department Ranking (`/analytics`) | ✅ Real — `useDepartmentRankings()` |
| Breakdown (`/analytics/:deptId`) | ✅ Real — `useBreakdown()` |
| My Achievements (`/badges`) | ✅ Real — `useMyCredentials()` |
| Credential Submit / Edit | ✅ Real |
| Paste-to-Post (`/events/paste`) | ✅ Real |

---

## APIs You Need to Build

These endpoints don't exist yet and are blocking real data:

| Endpoint | Feeds | Priority |
|---|---|---|
| `GET /api/v1/analytics/dept/:id/summary` | DeptDashboard KPIs | 🔴 High |
| `GET /api/v1/analytics/dept/:id/by-track` | DeptDashboard track chart | 🔴 High |
| `GET /api/v1/analytics/dept/:id/monthly-points` | DeptDashboard sparkline | 🔴 High |
| `GET /api/v1/analytics/dept/:id/cohorts` | DeptDashboard year cohorts | 🔴 High |
| `GET /api/v1/analytics/college/summary` | Leaderboard KPIs | 🔴 High |
| `GET /api/v1/analytics/college/leaderboard` | Leaderboard table | 🔴 High |
| `GET /api/v1/credentials/faculty-stats` | Verification Queue KPIs | 🔴 High |
| `GET /api/v1/credentials/:id/audit` | Anti-tamper checks | 🟡 Medium |
| `GET /api/v1/teams/my` | Profile squads, HomePage squads | 🟡 Medium |
| `GET /api/v1/teams/:id/applications` | TeamCommandHub applicants | 🟡 Medium |
| `GET /api/v1/credentials?userId=me&status=verified&limit=3` | Profile credentials, AddAchievement recent | 🟡 Medium |
| `GET /api/v1/users/looking` | TeamFinder free agents | 🟡 Medium |
| `GET /api/v1/analytics/college/nirf` | Leaderboard NIRF panel | 🟡 Medium |
| `GET /api/v1/analytics/college/naac-projection` | Leaderboard NAAC panel | 🟡 Medium |

---

## Safe-to-Keep Static Config (Never needs real data)

These are truly static UI config — not data:

- `EVENT_TYPES[]` — hackathon/competition/workshop etc.
- `BRANCH_OPTIONS[]` — CSE/IT/ECE etc.
- `YEAR_OPTIONS[]` — 1st–4th year
- `BROADCAST_CHANNELS[]` — push/pin/calendar toggle labels
- `RUBRIC_ROWS[]` — point allocation table in AddAchievement
- `ALGO_WEIGHTS[]` — NIRF formula weights in Leaderboard
- `HONOR_CODE_FAQS[]` — static FAQ text
- `TIERS[]`, `CATEGORY_TRACKS[]`, `LEDGER_CRED_TYPES[]` — credential metadata
- `CATEGORY_COLORS`, `TIER_COLORS` — chart colour maps
- `STATUS_COLOR`, `ROLE_STYLE`, `STATUS_STYLE` — UI style maps in Admin pages
