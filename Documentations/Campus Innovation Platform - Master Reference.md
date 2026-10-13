# Campus Innovation Platform — Master Reference Document

*Consolidated product spec, technical design, app flows, data model, and implementation guide. All suggestions and improvements are marked with callouts. October 2026.*

---

# Part 1 — Product Overview

## 1.1 Abstract

Colleges produce a large amount of innovation activity every year: hackathons, competitions, sports, workshops, research papers, patents, grants and awards. This information is scattered across WhatsApp messages, emails and spreadsheets. Students miss opportunities because event details arrive as long, unstructured messages, and solo students struggle to find teammates. Administrators, in turn, cannot easily answer questions such as "which department is performing best in innovation?".

This project proposes a single web platform (Progressive Web App) that:

1. Converts faculty announcements into structured event cards and notifies students.
2. Lets students find and join teams.
3. Records and verifies participation and achievements.
4. Automatically turns that verified data into department-wise dashboards, rankings and reports, as required by SIH1643.

An AI-based extraction module reads raw announcement text and fills in event fields, which also forms the research component of the project.

## 1.2 Working-Backwards Summary

**Press release (draft).** The platform launches at the college as one place where every hackathon, contest and sports event is posted once, students find teammates in minutes, and every verified achievement counts toward a fair department ranking. Faculty paste the announcement they received and publish in under a minute. Students see what is closing soon, join or invite teammates, and add proof after the event. Departments see verified, size-adjusted rankings without anyone building a spreadsheet.

| Question | Answer |
| --- | --- |
| Why not WhatsApp or Unstop? | Not college-specific, no verification, no department analytics, no internal team finder |
| What if the AI extracts a field wrongly? | Faculty confirm every card, uncertain fields are highlighted, raw text is kept |
| How are fake certificates stopped? | Proof upload, duplicate certificate-ID check, faculty verification before anything counts |
| Is the ranking fair to large departments? | Yes, the headline metric is a rate per student, not a raw count |
| Can strangers contact me? | Only logged-in college students, with no contact details shared until I accept |

## 1.3 Problem Statement

1. **Information overload:** faculty send long messages for every hackathon or contest; important details (deadline, eligibility, team size, link) get lost.
2. **Team formation difficulty:** solo students do not know who else is interested or what skills are available.
3. **Scattered records:** achievements are tracked manually in separate files, so reports take time and are error-prone.
4. **No unified innovation view:** the institution has no single, verified picture of its innovation performance (SIH1643 asks for patents, papers, grants, startups, competitions, awards, department-wise dashboards, rankings and reports).

## 1.4 Existing System and Its Limitations

| Current practice | Limitation |
| --- | --- |
| WhatsApp group announcements | Long messages, no filters, no reminders, buried by newer messages |
| Third-party platforms (hackathon/event portals) | Not specific to the college, no internal team finder, no institute analytics |
| Excel sheets for achievements | Manual entry, no verification, no real-time dashboards |
| Word-of-mouth team formation | Limited to a student's own circle |

## 1.5 Core Loop

```
Faculty pastes text -> extracted card -> faculty confirms -> published
-> student notified -> opens event -> decides
-> needs a team? post / request / invite / connect -> accepted -> WhatsApp
-> event happens -> student uploads proof -> faculty verifies
-> counted in analytics -> department rank updates
```

Each step feeds the next, so a slow step anywhere stalls the loop.

---

# Part 2 — Goals, Users and Stories

## 2.1 Goals

- One searchable, structured feed of all college events and contests.
- Reduce faculty effort to a paste-and-confirm step.
- Let solo students form teams quickly and safely.
- Capture achievements with proof and verification.
- Generate fair department rankings automatically from verified data.
- Measure extraction accuracy for a short research evaluation.

## 2.2 Non-Goals (for this release)

- Training any machine-learning model.
- A built-in chat system (teams connect over WhatsApp).
- Native Android/iOS apps.
- Long-term forecasting, collaboration graphs, certificate OCR.
- Integration with the college ERP.

## 2.3 Users and Roles

| Role | Description | Main needs |
| --- | --- | --- |
| Student | Any enrolled student | Discover events, find a team, record achievements, see own profile |
| Faculty / coordinator | Posts events and verifies results | Fast posting, minimal retyping, simple verification queue |
| Department head | Views own department | Department dashboard and ranking |
| Admin | Runs the platform | User approval, course catalog, ranking settings, institute-wide analytics |

## 2.4 Customers and Promises

| Customer | Promise | Success signal |
| --- | --- | --- |
| Student | Never miss an opportunity, never be alone on a team | Event-to-team time under 1 day |
| Faculty | Post an event in under 60 seconds | Cards confirmed without edits |
| Verifier (faculty) | Decide on a proof in one screen | Decision within 3 days |
| Admin / department head | A trustworthy ranking in one click | Report exported without manual fixes |

## 2.5 Key User Stories

- As a student, I get notified before a hackathon deadline so I don't miss it.
- As a solo student, I post "need 2 teammates, one frontend, one ML" and receive requests.
- As a student, I upload my NPTEL Elite Java certificate and see its verification status.
- As faculty, I paste an organizer's email text and get a ready event card to confirm.
- As faculty, I approve or reject uploaded proofs.
- As a department head, I see how my department ranks and why.
- As admin, I add new courses to the catalog and adjust ranking weights.

---

# Part 3 — Functional Requirements

Priority key: **M** = must have, **S** = should have, **C** = could have if time remains.

## 3.1 Authentication and Profiles

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Sign up with a valid enrollment number checked against a pre-loaded student list | M |
| FR-2 | Verify identity by email OTP, or admin approval if no college email exists | M |
| FR-3 | Profile with name, branch, year and skills | M |
| FR-4 | Role-based access (student, faculty, department, admin) | M |
| FR-5 | Phone number visibility setting, hidden by default | M |

## 3.2 Events

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-6 | Event feed with filters by type, deadline, branch and year | M |
| FR-7 | Event types: hackathon, competition, sports, workshop, seminar, other | M |
| FR-8 | Paste-to-post: faculty paste raw text, system extracts structured fields | M |
| FR-9 | Faculty review and confirm the extracted card before publishing | M |
| FR-10 | Bookmark events and receive deadline reminders | S |

> [!TIP]
> **[SUGGESTION] FR-S1: Event calendar view.** Add an optional calendar-grid view of events alongside the feed. The feed is urgency-sorted (by deadline), which is great for action. But students also want a spatial "what's happening this month" view. This is a simple UI addition over the same data. Priority: S.

## 3.3 Team Finder

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-11 | Create a team post for an event: roles needed, number of spots | M |
| FR-12 | Send a join request with a short message | M |
| FR-13 | Owner accepts or rejects requests | M |
| FR-14 | On acceptance, reveal the WhatsApp link or number to the team | M |
| FR-15 | Close the post when spots are full or the event deadline passes | S |

> [!TIP]
> **[SUGGESTION] FR-S2: "My Team" consolidated view.** Once a student is on a team (via TeamLink acceptance or Registration confirmation), there is no single place to see "my team for Event X" — who's in, status, and the WhatsApp link. Add a consolidated team view per event. Priority: S.

## 3.4 Credentials, Participation and Verification

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-16 | Course catalog (issuer, name, category) maintained by admin | M |
| FR-17 | Upload a credential by choosing a course from a searchable list, with session, year, tier and proof | M |
| FR-18 | Reject duplicates using the certificate ID | M |
| FR-19 | "Other" course goes to an admin queue to be mapped to an existing course or created | M |
| FR-20 | Status flow: pending, verified, rejected, with verifier and time recorded | M |
| FR-21 | Record event participation and results with proof | M |
| FR-22 | Only verified records count in analytics | M |

## 3.5 Analytics and Ranking

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-23 | Counts by department, category, issuer, event type and year | M |
| FR-24 | Department ranking using a chosen fair metric (see Business Rules) | M |
| FR-25 | Ranking breakdown showing how each indicator contributed | S |
| FR-26 | Admin-editable point weights per tier and credential type | S |
| FR-27 | Student and department profile pages | S |
| FR-28 | Downloadable annual report (PDF) | C |

## 3.6 Notifications

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-29 | Email notification for new events and request updates | M |
| FR-30 | Web push notifications (PWA) | S |
| FR-31 | Telegram bot | C |

## 3.7 Team Invites, Home Screen and Safety

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-32 | Team leader can invite a student from their profile or people search, choosing the team or event | M |
| FR-33 | Any student can send a connect request to a student who has not posted, with an optional event and a 200-character message | S |
| FR-34 | Student can mark 'I'm looking for a team' on an event, and leaders can invite from that list | S |
| FR-35 | People search by skills, branch and year, showing name, branch, year and skills only | M |
| FR-36 | Setting to allow or block invites and connect requests, on by default | M |
| FR-37 | Block and report on every incoming request, invite or connect | M |
| FR-38 | Limits: 10 invites and connects per user per day, one pending item per pair per event, 7-day expiry, 30-day cool-down after a decline | M |
| FR-39 | Home screen served from one endpoint with closing-soon events, matched team posts and pending requests; empty sections hidden | M |
| FR-40 | Every screen defines a next action and empty, loading and error states | M |
| FR-41 | Contact details revealed only after acceptance and only if the person's visibility setting allows it | M |

## 3.8 Event Registration and Upload Limits

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-42 | Each event is either 'register in app' (college events) or 'external' (registered on the organizer's site) | M |
| FR-43 | Register individually for solo events, or as a team within the event's minimum and maximum team size | M |
| FR-44 | A team leader creates a team registration: team name, members chosen from accepted teammates or added by enrollment number | M |
| FR-45 | Each added member must confirm before submission; nobody is added without consent | M |
| FR-46 | One active registration per student per event; leader can edit or withdraw until the deadline, then it locks | M |
| FR-47 | Event cards and detail pages show the number of students registered and the number of teams registered | M |
| FR-48 | Faculty see a roster per event (teams, members, branch, year) and can export it as CSV | M |
| FR-49 | For external events, a student can mark 'I registered' with an optional registration ID, counted as tracking | S |
| FR-50 | After the event, registered students are prompted to add a result and proof, with a pre-filled participation record | S |
| FR-51 | Certificate uploads limited to 5 per 24 hours and 15 pending at once, as admin settings | M |

## 3.9 Auto-Verification of QR Certificates

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-52 | Decode the QR code from an uploaded certificate (PDF or image) | S |
| FR-53 | Accept only QR links on the issuer's allowed domain over https | S |
| FR-54 | Fetch the official record and compare name, course, roll number and session with the uploaded fields and the student's profile name | S |
| FR-55 | Full match: mark verified with method 'issuer-qr' and store the evidence (link, time, match result). Mismatch: reject with a reason. Page cannot be fetched or read: send to the faculty queue | S |
| FR-56 | Auto-verified items stay in the monthly spot-check sample | S |

These are should-have because they depend on a feasibility test with a real NPTEL certificate in week 1. If the official page cannot be read automatically, the faculty 'Verify on issuer site' button remains the method.

## 3.10 Suggested Additional Requirements

> [!TIP]
> The following requirements are suggested additions based on gaps identified during review.

| ID | Requirement | Priority | Rationale |
| --- | --- | --- | --- |
| FR-S1 | Event calendar view (month grid alongside the feed) | S | Students want "what's happening this month", not just urgency-sorted |
| FR-S2 | "My Team" consolidated view per event (members, status, WhatsApp link) | S | No current screen shows a student's formed team for a specific event |
| FR-S3 | Offline event feed caching via service worker | S | PWA targeting low-end phones should work when connectivity drops |
| FR-S4 | API versioning with `/api/v1/` prefix on all routes | M | Protects against breaking changes during pilot iteration |
| FR-S5 | Soft-delete on events, credentials, and users (a `deleted` status or `deletedAt` field) | S | Enables undo for accidental publishes and compliance |
| FR-S6 | LLM extraction prompt versioning (store `promptVersion` on each event) | M | When prompts are tuned, you need to know which version produced which extraction |
| FR-S7 | Per-user quota on `/events/extract` (e.g. 20 extractions per faculty per day) | M | Prevents a single user from burning through the free-tier LLM API quota |
| FR-S8 | Clarify the "Badges" tab in bottom navigation (achievements? gamification?) | M | Currently referenced in screen map but never defined |

---

# Part 4 — Business Rules

## 4.1 Counting NPTEL and Similar Credentials

- A credential is counted once, under the student's department at the time of submission.
- Category (Programming, AI/ML, Cloud and so on) comes from the course catalog, not from the student.
- Only verified credentials count.
- Duplicate certificate IDs are rejected.

## 4.2 Fair Ranking

Raw counts favour large departments, so the ranking uses one or more of:

- **Certificates per 100 students.**
- **Participation rate:** percentage of students with at least one verified credential.
- **Weighted points:** for example Pass 1, Elite 2, Elite + Silver 3, Elite + Gold 4, with weights editable by admin.

Counting unique students (participation rate) prevents a few very active students from inflating a department's rank.

**Decision:** Participation rate is the headline rank, shown beside certificates per 100 students and points per 100 students. Admin can switch between them, the report explains the choice, and the guide can confirm the preferred default.

## 4.3 Privacy

- Only logged-in college users can see events and profiles.
- Phone numbers are shown only after a join request is accepted and the student has allowed it.

## 4.4 Verification and Fraud Controls

- Proof upload is required, certificate IDs are unique, and the same proof file cannot be reused for two records.
- Nobody can verify their own record, and every decision stores the verifier and the time.
- Editing a verified record sends it back to pending.
- Uploads are limited to 5 per 24 hours and 15 pending at once (admin settings), and unusual activity, such as repeated rejected uploads, is flagged for review.
- Verifiers use the issuer's QR code or verification link when one exists.
- The admin spot-checks about 10 percent of verified items each month.
- Faculty verify items from their own department. For now only department faculty verify; the admin handles disputes.

---

# Part 5 — Non-Functional Requirements

| Area | Requirement |
| --- | --- |
| Usability | Mobile-first, installable PWA, usable on low-end phones |
| Performance | Feed loads in under 3 seconds on a normal mobile connection; dashboards under 5 seconds for around 1,000 students |
| Availability | Hosted on a free or low-cost platform, targeting around 99 percent uptime during the demo and pilot |
| Security | Hashed passwords, JWT with expiry, input validation, file-type and size limits, role checks on every route |
| Privacy | Minimal personal data; contact details hidden by default |
| Maintainability | Modular code, environment-based configuration, basic documentation |
| Compatibility | Latest Chrome, Edge and Safari; Android and iOS browsers |

> [!TIP]
> **[SUGGESTION] Additional NFRs to consider:**
>
> | Area | Requirement |
> | --- | --- |
> | Caching | Hot-path endpoints (`/home`, event feed, analytics) should use server-side caching (Redis or in-memory) with a short TTL (30–60 seconds) to reduce DB load when ~1,000 students hit the app simultaneously |
> | Offline | The PWA service worker should cache the event feed and the student's own profile/credentials for offline access on low-end phones |
> | API Stability | All routes prefixed with `/api/v1/` to allow non-breaking iteration during the pilot |
> | Observability | Structured JSON logging with request IDs for traceability; basic health-check endpoint already planned |

---

# Part 6 — System Architecture

## 6.1 Overview

```
React PWA (student, faculty, department, admin views)
        |
   REST API (Node.js + Express, JWT)
        |
  ---------------------------------------------------
  | Auth | Events | Teams | Credentials | Analytics |
  ---------------------------------------------------
        |                    |                |
    MongoDB        LLM API (extraction)   File storage
                   Email / Web push
```

A single backend serves all roles. The extraction and notification services are separate modules so they can be replaced without touching the rest of the code.

> [!TIP]
> **[SUGGESTION] Caching layer.** Add a caching layer between the API and MongoDB for hot-path queries:
>
> ```
> React PWA
>     |
> REST API (Node.js + Express, JWT)
>     |
> ┌───────────────────────────────────────────────┐
> | Auth | Events | Teams | Credentials | Analytics|
> └───────────────────────────────────────────────┘
>     |              |              |          |
>   MongoDB    Cache (Redis     LLM API    File storage
>              or in-memory)
>              Email / Web push
> ```
>
> For the MVP pilot, **in-memory caching** (e.g., `node-cache` with a 60-second TTL) is sufficient and adds zero infrastructure cost. Move to Redis only if the pilot grows beyond a few hundred concurrent users. Cache the following:
> - `/home` response per user (30s TTL)
> - Event feed queries (60s TTL, invalidated on new event publish)
> - Analytics/ranking aggregations (5-minute TTL)

## 6.2 Technology Stack

| Layer | Choice | Reason |
| --- | --- | --- |
| Frontend | React with Vite, PWA plugin, charting library | Familiar to the team, fast builds, installable |
| Backend | Node.js with Express, TypeScript (strict) | One language across the stack, type safety |
| Database | MongoDB (Atlas free tier) | Flexible records and aggregation pipelines for dashboards |
| Validation | Zod | Runtime validation on both server and client, type inference |
| Auth | JWT, bcrypt, email OTP | Simple and stateless |
| Files | Cloudinary or similar object storage | Certificate and proof uploads |
| AI extraction | Hosted LLM API with a free tier, JSON output | No training needed |
| Email | Transactional email service free tier or SMTP | OTP and notifications |
| Push | Web Push with service worker | PWA-native notifications |
| Testing | Vitest, Supertest, React Testing Library | Fast, modern test runner |
| Hosting | Frontend on a static host, backend on a free Node host | Low cost for a pilot |

**Why a web app (PWA) instead of a native app:** one codebase for Android, iOS and laptops; no store installation barrier; instant updates; and faculty can use the desktop view for posting. A known limitation is that web push on iPhone requires adding the app to the home screen, so email and Telegram are provided as fallback channels.

> [!TIP]
> **[SUGGESTION] Scheduled jobs runner.** The docs mention "scheduled jobs" for link expiry, registration locking, team post auto-close, and spot-check sampling but don't specify the runner. Options:
> - **`node-cron`** (MVP recommended): runs in-process, zero extra infrastructure, fine for a single-instance pilot. Risk: jobs don't survive process restarts.
> - **BullMQ + Redis**: reliable, persistent, retries. Overkill for pilot but needed if the platform scales.
>
> Recommendation: use `node-cron` for the pilot and document it as a known limitation.

---

# Part 7 — Data Model

## 7.1 Collections at a Glance

| Group | Collection | Purpose |
| --- | --- | --- |
| Identity | StudentRoster | Pre-loaded valid students (enrollment number, college ID, branch, year) |
| Identity | User | Accounts for students, faculty, department heads and admins |
| Identity | Otp | Short-lived email OTP codes (auto-deleted) |
| Identity | Department | Departments and student strength for fair ranking |
| Credentials | Course | Catalog of issuer courses with category and verification method |
| Credentials | Credential | A student's uploaded certificate and its verification |
| Events | Event | Events and contests, with registration settings and counters |
| Events | Registration | Individual, team and external-tracking registrations |
| Events | Participation | Results and proof after an event |
| Teams | TeamPost | A leader's call for teammates |
| Teams | TeamLink | Requests, invites and connects between users |
| Teams | LookingFlag | 'I'm looking for a team' marker on an event |
| Teams | Block, Report | Safety tools |
| Platform | Setting | Admin-editable limits and ranking weights |
| Platform | Notification, PushSubscription | In-app notifications and web push endpoints |
| Platform | AuditLog | Who did what and when |

## 7.2 Conventions

- All schemas use `timestamps: true` (`createdAt`, `updatedAt`) unless noted.
- References are `ObjectId` with a `ref`. Status fields use string enums.
- Sensitive fields (`passwordHash`, `phone`) use `select: false` so they never leave the database by accident.
- Department on a credential or participation is copied from the user record on the server, never from the request.
- Limits and weights live in `Setting`, not in code.
- Counters on `Event` are denormalized for fast event cards and are updated in the same operation as the registration change.

```js
const { Schema, model } = require('mongoose');
const oid = (ref) => ({ type: Schema.Types.ObjectId, ref });
```

## 7.3 Schemas

### 7.3.1 Identity

```js
const StudentRoster = new Schema({
  enrollmentNo: { type: String, required: true, unique: true, uppercase: true, trim: true },
  collegeId:    { type: String, required: true, unique: true, trim: true },
  name:         { type: String, required: true },
  department:   oid('Department'),
  year:         { type: Number, min: 1, max: 4 },
  email:        { type: String, lowercase: true },   // official email, if the roster has one
  claimedBy:    oid('User')                          // set when the student registers
}, { timestamps: true });

const User = new Schema({
  enrollmentNo: { type: String, unique: true, sparse: true, uppercase: true },
  collegeId:    String,
  name:         { type: String, required: true },
  email:        { type: String, unique: true, sparse: true, lowercase: true },
  passwordHash: { type: String, required: true, select: false },
  role:         { type: String, enum: ['student', 'faculty', 'dept_head', 'admin'], default: 'student', index: true },
  department:   { ...oid('Department'), index: true },
  year:         { type: Number, min: 1, max: 4 },
  skills:       [{ type: String, lowercase: true, trim: true }],
  phone:        { type: String, select: false },
  phoneVisible: { type: Boolean, default: false },   // hidden by default
  allowInvites: { type: Boolean, default: true },    // controls Invite and Connect buttons
  status:       { type: String, enum: ['pending', 'active', 'suspended'], default: 'pending' },
  emailVerified:{ type: Boolean, default: false },
  lastLoginAt:  Date,
  firstOpenedAt: Date,                               // first-minute metric
  firstEventOpenedAt: Date
}, { timestamps: true });
User.index({ department: 1, year: 1 });
User.index({ skills: 1 });

const Otp = new Schema({
  userId:   oid('User'),
  purpose:  { type: String, enum: ['signup', 'reset'] },
  codeHash: String,
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, index: { expires: 0 } }   // TTL: removed at expiresAt
});

const Department = new Schema({
  code:            { type: String, unique: true, uppercase: true },  // CSE, ECE
  name:            String,
  studentStrength: { type: Number, default: 0 },
  headId:          oid('User')
}, { timestamps: true });
```

### 7.3.2 Catalog and Credentials

```js
const Course = new Schema({
  issuer:   { type: String, required: true, index: true },      // NPTEL, AWS
  name:     { type: String, required: true },
  code:     String,
  category: { type: String, required: true, index: true },      // Programming, AI/ML, Cloud
  language: String,
  aliases:  [String],                                           // typed names mapped by admin
  verificationMethod: { type: String, enum: ['issuer_qr', 'faculty'], default: 'faculty' },
  active:   { type: Boolean, default: true }
}, { timestamps: true });
Course.index({ issuer: 1, name: 1 }, { unique: true });
Course.index({ name: 'text', aliases: 'text' });

// Shared by Credential and Participation
const Verification = new Schema({
  status:     { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending', index: true },
  method:     { type: String, enum: ['issuer_qr', 'faculty', 'admin'] },
  verifiedBy: oid('User'),
  verifiedAt: Date,
  reason:     String,                                            // required when rejected
  evidence:   { url: String, fetchedAt: Date, matchScore: Number, matched: Schema.Types.Mixed }
}, { _id: false });

const Credential = new Schema({
  studentId:  { ...oid('User'), required: true, index: true },
  department: { ...oid('Department'), required: true },         // copied from the user
  courseId:   oid('Course'),
  otherCourseName: String,                                       // set when 'Other' was chosen
  issuer:     { type: String, required: true },
  session:    String,                                            // e.g. Jan-Mar 2025
  year:       { type: Number, required: true, index: true },
  tier:       { type: String, enum: ['pass', 'elite', 'elite_silver', 'elite_gold', 'other'] },
  certificateId: { type: String, uppercase: true, trim: true },  // NPTEL roll number
  proofUrl:   { type: String, required: true },
  proofHash:  { type: String, required: true },                  // SHA-256 of the file
  qr:         { url: String, host: String },
  verification: { type: Verification, default: () => ({}) }
}, { timestamps: true });
Credential.index({ issuer: 1, certificateId: 1 },
  { unique: true, partialFilterExpression: { certificateId: { $type: 'string' } } });
Credential.index({ proofHash: 1 }, { unique: true });
Credential.index({ department: 1, year: 1, 'verification.status': 1 });
Credential.index({ studentId: 1, createdAt: -1 });
```

> [!TIP]
> **[SUGGESTION] Clarify `Credential.year`.** This field is ambiguous — is it the academic year when the credential was earned, or the student's current year at time of submission? If a 2nd-year student earns a cert and then becomes a 3rd-year, which year does analytics count? Recommendation: rename to `submissionYear` and document that it captures a snapshot of the student's year at submission time, not a mutable reference.

### 7.3.3 Events, Registrations and Participation

```js
const Event = new Schema({
  title:     { type: String, required: true },
  type:      { type: String, enum: ['hackathon', 'competition', 'sports', 'workshop', 'seminar', 'other'], index: true },
  organizer: String,
  deadline:  Date,
  eventDate: Date,
  eligibility: { branches: [String], years: [Number], notes: String },
  teamSize:  { min: { type: Number, default: 1 }, max: { type: Number, default: 1 } },
  fee:       String,
  link:      String,
  summary:   String,
  registrationMode:     { type: String, enum: ['in_app', 'external'], default: 'external' },
  registrationDeadline: Date,
  counters:  { students: { type: Number, default: 0 }, teams: { type: Number, default: 0 }, tracking: { type: Number, default: 0 } },
  rawMessage: String,                                            // original pasted text
  extraction: { model: String, promptVersion: String, editedFields: [String], usedFallback: Boolean },
  postedBy:  oid('User'),
  status:    { type: String, enum: ['draft', 'published', 'closed', 'archived'], default: 'draft', index: true }
}, { timestamps: true });
Event.index({ status: 1, deadline: 1 });
Event.index({ type: 1, deadline: 1 });

const Registration = new Schema({
  eventId:  { ...oid('Event'), required: true, index: true },
  type:     { type: String, enum: ['individual', 'team', 'tracking'], required: true },
  teamName: String,
  leaderId: oid('User'),
  members:  [{ _id: false, userId: oid('User'),
               status: { type: String, enum: ['invited', 'confirmed'], default: 'invited' } }],
  externalRegId: String,                                         // for tracking records
  status:   { type: String, enum: ['draft', 'submitted', 'withdrawn', 'locked'], default: 'draft' },
  submittedAt: Date
}, { timestamps: true });
// one active registration per student per event (leader is also in members)
Registration.index({ eventId: 1, 'members.userId': 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['draft', 'submitted', 'locked'] } } });

const Participation = new Schema({
  eventId:        { ...oid('Event'), required: true, index: true },
  registrationId: oid('Registration'),
  teamName:       String,
  members:        [{ _id: false, userId: oid('User'), department: oid('Department') }],
  result:         { type: String, enum: ['participated', 'finalist', 'runner_up', 'winner', 'other'] },
  resultNote:     String,
  proofUrl:       String,
  proofHash:      String,
  verification:   { type: Verification, default: () => ({}) }
}, { timestamps: true });
Participation.index({ 'members.userId': 1, 'verification.status': 1 });
Participation.index({ 'members.department': 1, 'verification.status': 1 });
```

> [!TIP]
> **[SUGGESTION] `promptVersion` added to `Event.extraction`.** When the LLM prompt is tuned (and it will be, many times), you need to know which prompt version produced which extraction. This field is included in the schema above. Track prompt versions as simple incrementing strings (e.g., `"v1"`, `"v2"`) or date-based identifiers.

### 7.3.4 Teams and Safety

```js
const TeamPost = new Schema({
  eventId:     { ...oid('Event'), required: true },
  ownerId:     { ...oid('User'), required: true, index: true },
  title:       String,
  description: String,
  rolesNeeded: [String],
  spotsTotal:  Number,
  spotsLeft:   Number,
  status:      { type: String, enum: ['open', 'full', 'closed', 'expired'], default: 'open' },
  expiresAt:   Date                                              // event deadline
}, { timestamps: true });
TeamPost.index({ eventId: 1, status: 1 });

const TeamLink = new Schema({
  direction:  { type: String, enum: ['request', 'invite', 'connect'], required: true },
  fromUserId: { ...oid('User'), required: true },
  toUserId:   { ...oid('User'), required: true },               // for a request: the post owner
  eventId:    oid('Event'),
  teamPostId: oid('TeamPost'),
  message:    { type: String, maxlength: 200 },
  status:     { type: String, enum: ['pending', 'accepted', 'declined', 'withdrawn', 'expired'], default: 'pending' },
  expiresAt:  Date,                                              // created + 7 days
  respondedAt: Date
}, { timestamps: true });
TeamLink.index({ toUserId: 1, status: 1, createdAt: -1 });     // inbox
TeamLink.index({ fromUserId: 1, status: 1, createdAt: -1 });   // sent
TeamLink.index({ fromUserId: 1, toUserId: 1, eventId: 1 },     // one pending per pair per event
  { unique: true, partialFilterExpression: { status: 'pending' } });
TeamLink.index({ expiresAt: 1 }, { partialFilterExpression: { status: 'pending' } });

const LookingFlag = new Schema({
  userId:  { ...oid('User'), required: true },
  eventId: { ...oid('Event'), required: true },
  note:    { type: String, maxlength: 120 }
}, { timestamps: true });
LookingFlag.index({ userId: 1, eventId: 1 }, { unique: true });
LookingFlag.index({ eventId: 1 });

const Block = new Schema({
  userId:        { ...oid('User'), required: true },
  blockedUserId: { ...oid('User'), required: true }
}, { timestamps: true });
Block.index({ userId: 1, blockedUserId: 1 }, { unique: true });

const Report = new Schema({
  reporterId: { ...oid('User'), required: true },
  targetUserId: oid('User'),
  linkId:    oid('TeamLink'),
  reason:    { type: String, maxlength: 500 },
  status:    { type: String, enum: ['open', 'reviewed', 'actioned'], default: 'open' }
}, { timestamps: true });
```

### 7.3.5 Platform

```js
const Setting = new Schema({
  key:   { type: String, unique: true },
  value: Schema.Types.Mixed,
  updatedBy: oid('User')
}, { timestamps: true });

const Notification = new Schema({
  userId:  { ...oid('User'), required: true },
  type:    { type: String, enum: ['event_new', 'deadline', 'link_received', 'link_update', 'credential_update', 'link_expiring'] },
  payload: Schema.Types.Mixed,
  readAt:  Date
}, { timestamps: true });
Notification.index({ userId: 1, readAt: 1, createdAt: -1 });

const PushSubscription = new Schema({
  userId:   { ...oid('User'), required: true, index: true },
  endpoint: { type: String, unique: true },
  keys:     { p256dh: String, auth: String }
}, { timestamps: true });

const AuditLog = new Schema({
  actorId:    oid('User'),
  action:     String,                                            // credential.verify, link.accept
  entityType: String,
  entityId:   Schema.Types.ObjectId,
  meta:       Schema.Types.Mixed
}, { timestamps: { createdAt: 'at', updatedAt: false } });
AuditLog.index({ entityType: 1, entityId: 1, at: -1 });
```

> [!TIP]
> **[SUGGESTION] Consider a typed `Setting` document instead of key-value.** The current `{ key: String, value: Mixed }` pattern means no type safety at read time. Since all settings are known upfront, consider a single document with typed fields:
>
> ```js
> const Setting = new Schema({
>   _id:                  { type: String, default: 'global' },  // singleton
>   uploadsPer24h:        { type: Number, default: 5 },
>   pendingCap:           { type: Number, default: 15 },
>   linksPerDay:          { type: Number, default: 10 },
>   linkExpiryDays:       { type: Number, default: 7 },
>   declineCooldownDays:  { type: Number, default: 30 },
>   sessionDays:          { type: Number, default: 30 },
>   spotCheckPercent:     { type: Number, default: 10 },
>   rankingMetric:        { type: String, enum: ['participation_rate', 'per_hundred', 'weighted_points'], default: 'participation_rate' },
>   tierPoints:           { pass: { type: Number, default: 1 }, elite: { type: Number, default: 2 }, elite_silver: { type: Number, default: 3 }, elite_gold: { type: Number, default: 4 } },
>   updatedBy:            oid('User')
> }, { timestamps: true });
> ```
>
> This gives you Zod validation at the API layer, TypeScript autocompletion, and no need to assemble settings from multiple documents. Use the key-value pattern only if you expect truly dynamic, unknown settings.

**Default Settings (current key-value format)**

| Key | Default | Meaning |
| --- | --- | --- |
| uploadsPer24h | 5 | Certificate uploads per student per 24 hours |
| pendingCap | 15 | Pending credentials per student at once |
| linksPerDay | 10 | Invites plus connects per user per day |
| linkExpiryDays | 7 | Days before a pending link expires |
| declineCooldownDays | 30 | Wait before resending to the same person for the same event |
| sessionDays | 30 | Login token lifetime |
| spotCheckPercent | 10 | Share of verified items re-checked each month |
| rankingMetric | participation_rate | Headline department rank |
| tierPoints | pass 1, elite 2, elite_silver 3, elite_gold 4 | Points per NPTEL tier |

## 7.4 Relationships

```
Department 1---* User 1---* Credential *---1 Course
User 1---* TeamPost *---1 Event 1---* Registration (members -> User)
User 1---* TeamLink (from and to), LookingFlag, Block, Report
Event 1---* Participation (members -> User, Department)
Credential and Participation share the Verification sub-document
```

## 7.5 Key Indexes and Constraints

| Rule | Where |
| --- | --- |
| One account per enrollment number | `User.enrollmentNo` unique |
| No duplicate certificate | `Credential` unique on (issuer, certificateId) and on `proofHash` |
| One active registration per student per event | `Registration` unique on (eventId, members.userId), partial on active status |
| One pending link per pair per event | `TeamLink` unique on (fromUserId, toUserId, eventId), partial on pending |
| One looking flag per student per event | `LookingFlag` unique on (userId, eventId) |
| OTP expiry | `Otp.expiresAt` TTL index |

## 7.6 Ranking Query (participation rate and certificates per 100 students)

```js
Credential.aggregate([
  { $match: { 'verification.status': 'verified', year: 2026, issuer: 'NPTEL' } },
  { $group: { _id: { dept: '$department', student: '$studentId' }, n: { $sum: 1 } } },
  { $group: { _id: '$_id.dept', students: { $sum: 1 }, certificates: { $sum: '$n' } } },
  { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'd' } },
  { $unwind: '$d' },
  { $match: { 'd.studentStrength': { $gt: 0 } } },
  { $project: {
      code: '$d.code', students: 1, certificates: 1,
      participationRate: { $multiply: [{ $divide: ['$students', '$d.studentStrength'] }, 100] },
      perHundred: { $multiply: [{ $divide: ['$certificates', '$d.studentStrength'] }, 100] } } },
  { $sort: { participationRate: -1 } }
])
```

For weighted points, join each credential to `tierPoints` from `Setting` before grouping. Show student count beside each score so very small departments are read with care.

## 7.7 Rules the Server Must Enforce in Code

- Check the enrollment number and college ID against `StudentRoster` before creating a `User`, and set `claimedBy`.
- Copy `department` from the user into every credential and participation member; ignore any value sent by the client.
- Enforce `uploadsPer24h`, `pendingCap` and `linksPerDay` using counts of recent documents and the `Setting` values.
- Reject the 30-day resend by checking for a declined `TeamLink` between the same pair for the same event.
- Never return `phone` unless a `TeamLink` or `Registration` between the two users is accepted or confirmed and `phoneVisible` is true.
- Verification: a user cannot verify their own record, editing a verified record resets it to pending, and every decision writes an `AuditLog` entry.
- Registration: when a member declines, remove them from `members` so they are free to join another team. Update `Event.counters` on submit and withdraw inside one transaction.
- Scheduled jobs: expire pending links past `expiresAt`, close team posts at the event deadline, lock registrations at `registrationDeadline`, and pick the monthly spot-check sample.
- Only verified credentials and participations feed analytics.

---

# Part 8 — API Endpoints

## 8.1 Core Endpoints

| Area | Endpoints |
| --- | --- |
| Auth | POST /auth/register, POST /auth/verify-otp, POST /auth/login |
| Users | GET/PUT /users/me, GET /users/:id |
| Events | GET /events, POST /events/extract, POST /events, PUT /events/:id |
| Teams | POST /teams, GET /teams?eventId=, POST /links, PATCH /links/:id |
| Courses | GET /courses?search=, POST /courses (admin), PATCH /courses/:id/aliases |
| Credentials | POST /credentials, GET /credentials/me, GET /credentials/pending, PATCH /credentials/:id/verify |
| Participation | POST /participations, PATCH /participations/:id/verify |
| Analytics | GET /analytics/department-ranking, GET /analytics/breakdown, GET /analytics/summary |
| Settings | GET/PUT /settings (admin) |

## 8.2 Additional Endpoints

| Endpoint | Purpose |
| --- | --- |
| GET /home | Student summary, stats, closing-soon events, matched team posts, pending requests |
| GET /people?skills=&branch=&year=&eventId= | Search discoverable students |
| POST /links | Create a request, invite or connect |
| PATCH /links/:id | Accept, decline, withdraw |
| GET /links?box=in or out | Inbox and sent items |
| PUT/DELETE /events/:id/looking | Toggle the looking flag |
| GET /events/:id/looking | List students looking for a team |
| POST /blocks, POST /reports | Safety actions |

## 8.3 Registration Endpoints

| Endpoint | Purpose |
| --- | --- |
| POST /events/:id/registrations | Create a registration (individual, team, or tracking) |
| PATCH /registrations/:id | Edit, submit, or withdraw |
| PATCH /registrations/:id/members/:userId | Confirm or decline membership |
| GET /events/:id/registrations | Faculty roster |
| GET /events/:id/registrations/export | CSV export |
| POST /events/:id/tracking | External event tracking |

> [!TIP]
> **[SUGGESTION] API versioning.** All routes should be prefixed with `/api/v1/`. When response shapes inevitably change during the pilot, this prevents breaking existing clients. Example: `POST /api/v1/auth/register` instead of `POST /auth/register`.

---

# Part 9 — Key Technical Designs

## 9.1 Extraction Pipeline

1. Faculty submit raw text to `POST /events/extract`.
2. The backend sends it to the LLM with a fixed schema and the instruction to return only JSON, with null for missing fields.
3. The response is validated: required fields, date parsing, URL format. Invalid or missing fields are left blank for the faculty to fill.
4. The confirmed card is saved together with the raw text and a record of which fields the faculty edited.
5. A regex baseline (dates, links, "last date" patterns) runs alongside for comparison and as a fallback when the API is unavailable.
6. Retry with backoff on rate-limit errors.

The saved raw-text and confirmed-card pairs become the labeled dataset for the evaluation.

> [!TIP]
> **[SUGGESTION] Extraction pipeline improvements:**
>
> 1. **Prompt versioning.** Store `extraction.promptVersion` on each event (already added to the schema above). When you tune the LLM prompt, you need traceability.
>
> 2. **Per-user quota on `/events/extract`.** Each call hits an external LLM API. A single curious faculty member could exhaust the free-tier quota. Rate-limit per-user (not just per-IP) — e.g., 20 extractions per faculty per day. Store this limit in `Setting`.
>
> 3. **Regex fallback expectations.** Indian college announcements are wildly inconsistent — Hindi/English mixed, WhatsApp forwarding artifacts (stars, tildes), multiple events in one message. The regex baseline will likely have very low recall. This is fine for the research comparison, but the real fallback should be a **partially empty form with the raw text beside it**, not the regex output alone.
>
> 4. **Never send student personal data to the LLM.** Already documented — but enforce it architecturally: the extraction service should accept only the raw message string, with no user context passed in.

## 9.2 Credential Counting and Ranking

An aggregation matches verified credentials, joins them with the course catalog, and groups by department and course or category. Ranking divides by department strength or counts unique students, depending on the selected metric. Weights come from the `Setting` document so changing them does not need a code change.

## 9.3 Team Finder Safety

Contact details are never returned in team or request responses until the owner accepts the request and the student's visibility setting allows it. The WhatsApp link is generated server-side at that point.

Three paths feed the same `TeamLink` records: a request to join a team post, an invite from a leader's view of a profile, and a direct connect to a student who has not posted. The server enforces the daily limit, one pending item per pair per event, 7-day expiry by a scheduled job, the 30-day cool-down after a decline, and the blocklist.

## 9.4 Notifications

Email is sent through a queue-like background function so slow sending does not block API responses. Web push subscriptions are stored per user, with a fallback to email on iOS devices that have not installed the app.

| Trigger | Channel | Goal |
| --- | --- | --- |
| New event matching branch and year | Push, email digest | Discovery |
| 48 hours and 4 hours before a deadline | Push | Action |
| Request, invite or connect received | Push, email | Keep teams moving |
| Item accepted or declined | Push | Close the loop |
| Credential verified or rejected | Push, email | Close the loop |
| Item expiring tomorrow | Push | Reduce stale items |

Keep to these six. Add a per-type mute in settings and a daily cap on non-urgent notifications.

## 9.5 Home Endpoint and Screen States

GET /home returns the student summary, stats, closing-soon events, matched team posts, the pending request count and an unread flag in one response, so the home screen loads quickly. Team posts match on skills, and a new student with no skills falls back to branch and year. The client hides any empty block and shows a clear message with a next action when nothing is available. Every screen implements four states: next action, empty, loading (placeholder cards) and error (message with a retry button).

## 9.6 Event Registration

**Two kinds of events**

| Kind | Example | What the app does |
| --- | --- | --- |
| Register in app | College hackathon, sports, workshop | Full registration in the app, with roster and counts |
| External | SIH, other colleges' contests | The student registers on the organizer's site, then taps 'I registered' with an optional registration ID. Counted as tracking, not as a registration |

**Team registration flow**

1. The leader taps Register team on the event. Solo events show Register instead.
2. The leader enters a team name and adds members, either from accepted teammates (team finder) or by enrollment number.
3. Each added member gets a notification and must Confirm. Nobody is added without consent. This reuses the same inbox as requests and invites.
4. When the confirmed team size is within the event's limits, the leader taps Submit.
5. Faculty see the roster. The leader can edit or withdraw until the deadline, and registrations lock at the deadline.

**Rules**

- One active registration per student per event, so nobody can be on two teams for the same event. A student already registered sees a clear message.
- A member who declines frees the spot.
- Event cards and detail pages show 'N students, M teams registered' (for external events, 'N tracking'). Only counts are public; names are visible to teammates and faculty.
- After the event date, registered students are prompted to add a result and proof, with a pre-filled participation record.
- Faculty can export the roster as CSV.

**States**

```
Registration: draft -> submitted -> withdrawn | locked (deadline)
Member:       invited -> confirmed | declined
```

## 9.7 QR Auto-Verification Pipeline

No language model decides authenticity; the issuer's own record does. A free language model is only used, if at all, to read the uploaded certificate and pre-fill fields.

1. **Decode:** render the first page of a PDF to an image, then decode the QR with a library (for example jsQR in the browser, or a server-side decoder such as zbar or OpenCV).
2. **Check the link:** accept only https links whose host exactly matches an allowlist (for NPTEL, an nptel.ac.in host). Reject look-alike domains.
3. **Fetch safely:** server-side request with a short timeout, a size limit, no redirects to other hosts, and only to allowlisted hosts, to avoid server-side request forgery.
4. **Compare:** normalize and compare name, course, roll number and session between the official record and the uploaded fields, and compare the name with the student's profile. Use deterministic string matching with a fuzzy threshold, not a language model.
5. **Decide:** full match gives verified with method `issuer-qr` and saved evidence (link, fetched time, match result); mismatch gives rejected with a reason; fetch or parse failure falls back to the faculty queue.
6. **Guard against reuse:** reject a roll number already attached to another account.

A copied QR on a forged certificate is caught because the comparison uses the official record, not the uploaded image. Run a half-day feasibility test in week 1: scan one real certificate, fetch the link, and see whether the page can be read automatically. Also check the issuer's terms before automating requests, and keep request volume to one fetch per upload.

> [!TIP]
> **[SUGGESTION] SSRF hardening for QR fetch.** The documented mitigations (allowlisted hosts, no redirects, size limits) are good. Additionally:
> - **Resolve the hostname before making the request** and reject private/internal IPs (127.0.0.1, 10.x.x.x, 172.16.x.x, 192.168.x.x) to prevent DNS rebinding attacks.
> - Validate the resolved IP is not a loopback or link-local address.
> - Set a hard timeout of 5 seconds and a response body size limit of 1 MB.

---

# Part 10 — App Flows and Persona Journeys

## 10.1 Student, First Session (value in under 60 seconds)

1. Open the link, log in with enrollment number, college ID and password.
2. Land on the feed sorted by closing soon, filtered to own branch and year.
3. Open an event: deadline, eligibility, fee, team size, link.
4. Choose Apply (external link) or Find teammates.
5. After the event date, a prompt appears: 'Did you take part? Add your result.'

## 10.2 Faculty Posts an Event (under 60 seconds)

1. Tap Post event and paste the organizer's text.
2. The system returns a card; uncertain fields are highlighted.
3. Fix highlighted fields, then Publish.
4. Students matching branch and year are notified.

## 10.3 Verifier Reviews a Credential

1. Open the verification queue, oldest first.
2. See the proof beside the submitted fields (course, session, tier, certificate ID).
3. Approve, or reject with a reason chosen from a short list.

**Verification method by credential type**

| Credential | Checked by | How |
| --- | --- | --- |
| NPTEL and other issuers with a QR code or link | Faculty of the student's department | A 'Verify on issuer site' button opens the certificate link, then the verifier approves |
| College events, sports, internal certificates | Faculty of the student's department | Checks the proof against the event record |
| Disputed or unusual items | Admin | Final decision |

Each course or event type has a `verificationMethod` field so a record goes to the right queue. Automatic reading of issuer pages is not built; the button gives most of the benefit with little risk.

**Auto-verification of QR certificates (NPTEL first, subject to a feasibility test)**

See Section 9.7 for the full pipeline.

## 10.4 Admin or Department Head

1. Open the dashboard with the current year preselected.
2. See the rank under the headline metric, with the option to switch metric.
3. Open 'why this rank' for the breakdown, then export the report.

---

# Part 11 — Team Formation Flows

Teams can form in three ways, so a student never needs to have posted anything to be reachable.

| Path | Who starts | Entry point | Needs a team post? |
| --- | --- | --- | --- |
| A. Request to join | Student looking for a team | A team post on the event page | Yes, the leader's post |
| B. Invite from profile | Team leader | A student's profile or the people search | No, the leader needs a team and an event |
| C. Direct connect | Any student | Profile of a student who has not posted anything | No |

## 11.1 Path A: Request to Join

1. Student opens a team post and taps Request to join, with an optional message.
2. Leader gets a notification, opens the requester's profile, then accepts or declines.
3. On accept, the spot count drops and the contact reveal runs (section 11.4).

## 11.2 Path B: Leader Invites Someone from Their Profile

1. Leader opens a student's profile from search (filter by skills, branch, year) or from the event's looking-for-team list.
2. Leader taps Invite to team and picks which of their teams or events the invite is for, with a short message.
3. Student gets a notification with the team, event and message, and can Accept, Decline or Not now.
4. On accept, the leader's spot count drops and the contact reveal runs.

## 11.3 Path C: Direct Connect (the Mohit Case)

1. Priya finds Mohit through search or the event's looking-for-team list.
2. On his profile she sees Invite to team if she leads a team, otherwise Connect. Connect takes an optional event and a message of up to 200 characters.
3. Mohit is notified and can Accept, Decline, Not now or Block.
4. On accept, contact is revealed according to Mohit's phone-visibility setting. If he keeps his number hidden, Priya shares a WhatsApp group link and he sees it after accepting.
5. Nothing is revealed to Priya, and no chat is opened, before he accepts.

**Lightweight signal.** To make cold contact rare, a student can tap I'm looking for a team on any event in one tap, with no post needed. They then appear in that event's looking-for-team list, which leaders can invite from.

## 11.4 Contact Reveal (same for all paths)

- Shown only after acceptance, and only if the person's phone-visibility setting allows it.
- Otherwise the team owner posts a WhatsApp group link, shown to accepted members only.
- Contact details are generated server-side at that moment and never appear in earlier responses.

## 11.5 Rules and Guardrails

| Rule | Value |
| --- | --- |
| Who can be found | Logged-in college users, showing name, branch, year and skills only |
| Opt-out | Setting 'Allow invites and connect requests', default on; off removes the Invite and Connect buttons |
| Daily limit | 10 invites plus connects per user per day |
| Duplicates | One pending item per pair per event |
| Expiry | Pending items expire after 7 days |
| Declines | The same sender cannot resend for the same event for 30 days |
| Safety | Block and Report on every incoming item; admin can suspend users |
| Message | Plain text only, 200 characters, links blocked |

---

# Part 12 — Object State Machines

```
Event:          draft -> published -> closed (deadline passed) -> archived
TeamPost:       open -> full | closed | expired
TeamLink:       pending -> accepted | declined | withdrawn | expired
                (direction = request | invite | connect)
Credential:     pending -> verified | rejected(reason) -> resubmitted -> pending
Participation:  pending -> verified | rejected(reason)
Registration:   draft -> submitted -> withdrawn | locked (deadline)
  Member:       invited -> confirmed | declined
```

Rules: only verified items count in analytics. A closed event accepts no new team posts. A rejected credential always shows its reason and a resubmit button. Accepting a link on a full team is refused with a clear message.

> [!TIP]
> **[SUGGESTION] Soft-delete states.** Consider adding a `deleted` status to Event, Credential, and User state machines. Currently, if a faculty member accidentally publishes an event, the only path is `published → closed → archived`. A `deleted` state (or `deletedAt` timestamp) allows recovery and provides an audit trail. For credentials, this covers the case where a student wants to permanently remove an old/incorrect record rather than just having it rejected.

---

# Part 13 — Screen Map and Permissions

## 13.1 Screen Map

| Role | Screens |
| --- | --- |
| All | Login, notifications, settings |
| Student | Home, Events feed, Event detail, Team posts, Looking-for-team list, People search, Profile (own and others), Requests and invites inbox, Add achievement, My achievements |
| Faculty | Post event (paste, review), My events, Verification queue |
| Department head | Department dashboard, ranking breakdown |
| Admin | Institute dashboard, user approval, course catalog and aliases queue, ranking settings, reports |

Student bottom navigation: Events, Teams (with People search and the requests and invites inbox), a + button for posting, Badges, Profile.

> [!TIP]
> **[SUGGESTION] Define the "Badges" tab.** The bottom nav includes "Badges" but this term is never defined in the documentation. Options:
> - **Credentials/Achievements:** rename to "Achievements" and show the student's uploaded and verified credentials. This is the most natural fit.
> - **Gamification badges:** earned for milestones (first event, first team, 5 verified certs). Adds engagement but increases scope.
>
> Recommendation: rename to "Achievements" and use it as the entry point to the student's credential list. Gamification can be future scope.

## 13.2 Permissions Matrix

| Action | Student | Faculty | Dept head | Admin |
| --- | --- | --- | --- | --- |
| View events | Yes | Yes | Yes | Yes |
| Post and edit events | No | Yes | Yes | Yes |
| Create team post, invite, connect | Yes | No | No | No |
| Upload credential or participation | Yes | Yes | No | No |
| Verify credentials | No | Yes (assigned scope) | Yes (own department) | Yes |
| View own department dashboard | Summary | Summary | Full | Full |
| Manage catalog, weights, users | No | No | No | Yes |

---

# Part 14 — First-Minute Experience and Home Screen

'Value' means the first moment the app is useful to a student: seeing a real event or team post that matters to them, not logging in or filling a profile. The target is under 60 seconds from opening the link to opening a first event.

## 14.1 First-Session Rules

1. After the enrollment number is entered, pre-fill name, branch and year from the student list. The student only sets a password.
2. Show the feed straight after login, filtered to their branch and year.
3. Ask for skills later, the first time they tap Request to join or 'I'm looking for a team'.
4. No tutorial screens. Real, seeded events are the onboarding.
5. Keep sessions for about 30 days so a return visit takes seconds.
6. Measure the time from first open to first event opened.

## 14.2 Home Screen Blocks

| Block | Rule |
| --- | --- |
| Greeting and stats | Name, branch, year, verified badge count. Show points only if they come from verified records under the same rules as the ranking |
| Pending requests banner | Shown only when something needs review |
| Closing soon | Ongoing events by nearest deadline. Hide the block if there are none |
| Teammates needed | Matched on skills. A new student with no skills falls back to branch and year |
| Post request card | Shortcut to the same action as the + menu |
| Empty state | Say there are no events and offer an action: turn on notifications, or tap 'I'm looking for a team' |

Design decisions:

- The chat icon on team cards opens the poster's profile with a short note field. There is no in-app chat, and contact stays hidden until acceptance.
- The + button opens a menu: Post team request, I'm looking for a team, Add achievement.
- People search and the requests and invites inbox live under the Teams tab.
- The checkmark beside a name means the identity matched the student list.
- Replace sample college names and projects with real data before the demo.
- The home screen loads from one endpoint, GET /home.

## 14.3 Four States for Every Screen

| State | Question | Example on the Team posts screen |
| --- | --- | --- |
| Next action | What should the user do from here? | Buttons: Create team post, Request to join |
| Empty | What shows when there is nothing yet? | 'No team posts for this event yet. Be the first.' with a button |
| Loading | What shows while data loads? | Grey placeholder cards |
| Error | What if it fails? | 'Couldn't load posts. Tap to retry' |

## 14.4 No Dead Ends

| Situation | Exit |
| --- | --- |
| Request or invite nobody answers | Expires after 7 days; the sender can withdraw it |
| Rejected certificate | Reason shown and a Resubmit button |
| Team post stays open | Closes at the event deadline; the owner can close it earlier |
| Account waiting for approval | Status screen, email confirmation, admin reminded after 3 days |
| Wrong course on a pending credential | Student can edit it or withdraw it |

---

# Part 15 — Failure Paths

| Situation | What the user sees |
| --- | --- |
| LLM call fails or is rate limited | Falls back to the regex baseline, or an empty form beside the pasted text |
| Date or deadline is uncertain | Field highlighted, never silently guessed |
| Duplicate certificate ID | Clear message with a link to the existing record |
| Course not in catalog | 'Other' goes to an admin queue; student sees 'under review' |
| Team full or event closed | Buttons disabled with the reason shown |
| Student keeps phone hidden | Group link shared by the owner after acceptance |
| Invite expires with no reply | Sender is told it expired and can resend after the cool-down |
| Push blocked, or iPhone without install | Falls back to email |
| Verifier is slow | Item flagged after 3 days and shown to admin |

---

# Part 16 — Security

## 16.1 Core Security Requirements

- Passwords hashed with bcrypt; JWTs with short expiry.
- Role-based middleware on every protected route.
- Rate limiting on login, OTP and extraction endpoints.
- File uploads limited by type (PDF, JPG, PNG) and size, with storage URLs not guessable.
- Server-side validation of all inputs; no trust in client-provided roles or departments.
- The department on a credential is copied from the user record on the server, never from the request.
- Secrets in environment variables, never in the repository.
- Do not send student personal data to the LLM; send only the pasted event text.

## 16.2 Fraud and Abuse Controls

- Store a hash of each uploaded proof file and reject reuse across records.
- Reject verification by the record's own owner, and keep an audit log of every decision.
- Reset a verified record to pending when its fields change.
- Rate limit invites and connects, and flag unusual upload volume.
- Run a scheduled job to expire pending links and to close team posts at the event deadline.

## 16.3 Security Suggestions

> [!TIP]
> **[SUGGESTION] Authentication token storage.** The implementation plan notes this as an open decision. Recommendation: **httpOnly cookie with SameSite=Strict** for the pilot.
>
> | Option | Pros | Cons |
> | --- | --- | --- |
> | localStorage | Simple to implement, works with any API host | Vulnerable to XSS token theft |
> | httpOnly cookie + SameSite=Strict | Immune to XSS token theft, automatically sent | Needs CSRF token for non-GET requests, same-origin or proxy required |
>
> Since the platform handles real student data (enrollment numbers, phone numbers, certificates), the cookie approach is worth the extra setup. A CSRF token in a header (double-submit cookie pattern) is straightforward to implement.

> [!TIP]
> **[SUGGESTION] QR fetch SSRF prevention.** In addition to the documented mitigations:
> - Resolve hostnames before making requests and reject private/internal IPs (127.0.0.1, 10.x.x.x, 172.16.x.x, 192.168.x.x).
> - Reject loopback and link-local addresses to prevent DNS rebinding.
> - Hard timeout of 5 seconds, response body limit of 1 MB.

> [!TIP]
> **[SUGGESTION] Per-user extraction quota.** Rate-limit `/events/extract` per-user (not just per-IP). A single faculty member could exhaust the free-tier LLM quota in minutes. Suggested: 20 extractions per faculty per day, stored in `Setting`.

---

# Part 17 — Metrics and Success Criteria

## 17.1 Success Metrics

- At least one batch or department actively using the app during the pilot.
- At least 20 real events posted and 10 team posts created.
- Faculty posting time under 2 minutes per event.
- Extraction accuracy measured on 100 or more labeled messages (field-level precision, recall and F1).
- Share of extracted cards confirmed without any edit.
- Credentials verified within a set turnaround, for example 3 days.

## 17.2 Operational Metrics

| Stage | Metric |
| --- | --- |
| Discovery | Weekly active students; share who open an event |
| Action | Viewed events leading to an apply or team action |
| Teams | Acceptance rate and time to first response for each path |
| Faculty | Time to post; cards confirmed without edits |
| Verification | Hours from upload to decision |
| Safety | Reports and blocks per 100 links |

**The single number to watch:** students who joined a team through the platform each month.

---

# Part 18 — Research Component

## 18.1 Primary Research Question

How accurately can an LLM-based pipeline extract structured event details from unstructured college announcements, compared with rule-based extraction?

- **Dataset:** 150–300 real announcement messages collected from the college (with permission), labeled by hand.
- **Methods compared:** rule/regex baseline vs. LLM-based extraction.
- **Metrics:** field-level precision, recall and F1; fraction of cards confirmed without edits; time saved per post.

## 18.2 Secondary Question

How stable are department rankings when the index weights change? Method: sensitivity analysis and rank-correlation across several weighting schemes.

## 18.3 Optional

Whether skill-based teammate suggestions increase accepted join requests compared with a plain list, tested in a small pilot with one batch.

*Note:* long-term forecasting is deliberately excluded because a single college has too few yearly data points for reliable prediction.

---

# Part 19 — Testing and Evaluation

| Type | Plan |
| --- | --- |
| Unit tests | Validation, ranking calculation, duplicate detection |
| API tests | Auth, role access, request flow, verification flow |
| Manual UAT | Faculty and a small student group using real events |
| Extraction evaluation | 100 to 150 hand-labeled messages; compare regex and LLM by field-level precision, recall and F1; record percentage of cards confirmed without edits |
| Ranking check | Compare ranking under two or three metrics to show how the choice affects order |

---

# Part 20 — Deployment and Operations

- Separate environments for development and production using environment variables.
- Automatic deployment from the main branch.
- Daily database backup export during the pilot.
- Basic error logging and a simple health-check endpoint.

> [!TIP]
> **[SUGGESTION] Deployment additions:**
> - **Structured JSON logging** with request IDs for traceability across the request lifecycle.
> - **Graceful shutdown** handling: drain in-flight requests and close DB connections on SIGTERM.
> - **Environment parity:** use the same `.env` schema (validated by Zod in `config/env.ts`) for dev and prod, with different values.

---

# Part 21 — Folder Structure and Conventions

## 21.1 Folder Structure (Feature-Wise)

Everything about one feature lives together. A feature folder holds its model, schema, service, controller, routes and tests.

```
server/
  src/
    app.ts                    # builds the Express app
    server.ts                 # starts it
    routes.ts                 # mounts every module's router under /api/v1
    config/
      env.ts                  # reads and validates environment variables with Zod
      db.ts                   # MongoDB connection
    shared/
      middleware/             # auth.ts, requireRole.ts, validate.ts, rateLimit.ts, errorHandler.ts
      utils/                  # asyncHandler.ts, hash.ts, pagination.ts
      errors.ts               # AppError classes
      types.ts                # shared types such as AuthUser
    modules/
      auth/                   # auth.routes.ts, auth.controller.ts, auth.service.ts, auth.schema.ts, auth.test.ts
      users/                  # user.model.ts, user.schema.ts, user.service.ts, user.controller.ts, user.routes.ts, user.test.ts
      roster/                 # roster.model.ts, roster.service.ts, import script
      departments/
      courses/
      credentials/            # also qr-verify.service.ts, upload handling
      events/                 # also extraction/ (llm.service.ts, regex.service.ts)
      registrations/
      teams/                  # team posts
      links/                  # requests, invites, connects
      looking/                # I'm looking for a team
      safety/                 # blocks and reports
      participations/
      analytics/
      notifications/          # in-app, email, web push
      settings/
      audit/
    jobs/                     # expireLinks.ts, lockRegistrations.ts, spotCheck.ts
  tests/                      # integration tests that cross modules
  scripts/                    # seed.ts, importRoster.ts, evaluateExtraction.ts

client/
  src/
    app/                      # App.tsx, router.tsx, providers.tsx
    features/
      auth/                   # api/auth.api.ts, components/, hooks/useAuth.ts, pages/LoginPage.tsx, schemas/auth.schema.ts, types.ts, index.ts
      events/
      teams/
      registrations/
      credentials/
      profile/
      analytics/
      admin/
      notifications/
    components/ui/            # Button, Card, Badge, Modal, EmptyState, Skeleton
    lib/                      # apiClient.ts, queryClient.ts, utils.ts
    hooks/                    # shared hooks
    types/                    # shared types
```

## 21.2 File Responsibilities (Server)

| File | Responsibility |
| --- | --- |
| `x.model.ts` | Mongoose schema and model, indexes |
| `x.schema.ts` | Zod schemas for request bodies, queries and params, plus inferred types |
| `x.service.ts` | Business logic. The only layer that touches models |
| `x.controller.ts` | Thin: reads the request, calls the service, sends the response |
| `x.routes.ts` | URL paths, middleware (auth, role, validate) and controller wiring |
| `x.test.ts` | Tests for that module |

## 21.3 Rules

- Direction of calls: routes → controller → service → model. Never skip a layer.
- A module can use another module only through its service, not its model.
- On the client, a feature exposes what others may use through its `index.ts`. Do not import deep files from another feature.
- Use a path alias such as `@/` instead of long relative paths.
- API responses use one shape, for example `{ data }` on success and `{ error: { code, message } }` on failure.

## 21.4 Naming Conventions

- Files: `user.model.ts`, `user.routes.ts` (lowercase, dot-separated). React components: `EventCard.tsx` (PascalCase).
- Zod schemas end with `Schema` (`createEventSchema`). Types come from `z.infer`.
- TypeScript strict mode. No `any`. Every function that crosses a layer has typed inputs and outputs.
- Async route handlers go through `asyncHandler` so errors reach the error middleware.
- Environment variables are read once in `config/env.ts` and validated.

---

# Part 22 — Agent Rules File

Paste into the repo root as `AGENT_RULES.md` or equivalent:

```
PROJECT: Campus Innovation Platform (events, teams, registrations, verified achievements, department analytics).
STACK: Server: Node, Express, TypeScript, Mongoose, Zod, JWT, bcrypt, Vitest, Supertest.
       Client: React, Vite, TypeScript, React Router, TanStack Query, React Hook Form, Zod, Tailwind.
STRUCTURE: server/src/modules/<feature>/ with <feature>.model.ts, .schema.ts, .service.ts, .controller.ts, .routes.ts, .test.ts.
           client/src/features/<feature>/ with api/, components/, hooks/, pages/, schemas/, types.ts, index.ts.
RULES:
- TypeScript strict. No any. Explain any type assertion.
- Validate every request body, query and params with Zod in the route.
- Controllers are thin. Business logic is in services. Only services touch models.
- Every protected route uses auth and role middleware. Never trust role, department or userId from the client.
- Secrets come only from env. Never log secrets or personal data.
- Never return passwordHash or phone unless the rules allow it.
- Every screen handles loading, empty and error states.
- Touch only the files listed in the task. Ask before adding dependencies.
- Before coding, write a short plan and wait for my approval.
- After coding, list the files changed, how to run and test, and anything you were unsure about.
- All API routes prefixed with /api/v1/.
- Use one consistent response shape: { data } on success, { error: { code, message } } on failure.
```

---

# Part 23 — Review Checklists

## 23.1 Backend (check every diff)

- Zod validation on body, query and params for every route.
- Auth and role middleware on every protected route; ownership checks (this record belongs to this user).
- Role, department and userId come from the token or database, never from the request body.
- No `any`, no unexplained type assertions.
- Controllers are thin; logic is in services; only services call models.
- Indexes exist for the queries and the uniqueness rules in the schema doc.
- Limits come from Setting, not hard-coded.
- Secrets only from env; no personal data in logs; passwordHash and phone are never returned by default.
- Errors use the shared shape and never leak stack traces.
- At least one test for success and one for a failure or a forbidden case.

## 23.2 Frontend (check every diff)

- Props and API responses are typed; no `any`.
- Server data uses TanStack Query, not scattered `useEffect` fetches.
- Loading, empty and error states exist on every screen.
- Forms use React Hook Form with a Zod schema; error messages are visible.
- Business rules stay on the server; the client only displays and sends.
- Buttons are disabled with a reason when an action is not allowed.
- Tap targets are large enough, contrast is readable, status is not shown by color alone.
- A feature imports from another feature only through its `index.ts`.

---

# Part 24 — Risks and Mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Low adoption (empty app) | Empty app, weak demo | Seed real events, pilot with one batch, keep posting simple |
| Wrong AI extraction | Incorrect event details | Faculty confirm every card, validate JSON, store raw text |
| Fake achievements | Unfair rankings | Proof upload plus verification before counting |
| Free API limits change | Extraction stops | Single swappable function and a regex fallback |
| Short timeline | Unfinished features | Strict MVP scope, early deployment, weekly review |
| Student data privacy | Trust and compliance issues | Hidden contacts, college-only access, permission for any data used in the paper |

> [!TIP]
> **[SUGGESTION] Additional risks to consider:**
>
> | Risk | Impact | Mitigation |
> | --- | --- | --- |
> | LLM quota exhaustion by a few users | Extraction unavailable for everyone | Per-user extraction quota (20/day), monitoring, alerting |
> | Scheduled jobs fail silently | Stale links, unlocked registrations, missed spot-checks | Health-check endpoint that reports job last-run times; alert if a job hasn't run in 2x its interval |
> | MongoDB Atlas free-tier limits (512 MB storage) | Data growth during pilot hits ceiling | Monitor storage usage; the pilot with ~1,000 students and a few hundred credentials should be well under 512 MB, but file uploads go to Cloudinary, not MongoDB |
> | No real-time updates for team spots | Two students accept simultaneously, one gets a confusing error | Atomic `$inc` with a condition (`spotsLeft > 0`) already planned; ensure the error message is clear |

---

# Part 25 — Future Scope

- Automatic reading of certificates and papers (OCR plus extraction).
- Topic analysis of research output; collaboration graphs between faculty.
- Teammate recommendation using skills and past participation.
- Integration with college ERP and other institutions.
- WebSocket layer for real-time inbox and team post updates.
- Gamification badges (milestones: first event, first team formed, 5 verified certs).
- Event calendar view with month/week grid.
- Native mobile wrapper (Capacitor or similar) if PWA limitations become a barrier.

---

# Part 26 — Seed Data Strategy

> [!TIP]
> **[SUGGESTION] Define the seed script output explicitly.** The docs mention "seed real events" multiple times but don't specify what the seed script produces. A rich seed makes the demo convincing and testing realistic.

**The seed script should create:**

| Entity | Count | Details |
| --- | --- | --- |
| Departments | 5 | CSE (strength: 120), ECE (80), ME (100), EE (60), IT (90) — realistic sizes |
| Students | 30–50 | Distributed across departments and years, varied skills (frontend, backend, ML, design, etc.) |
| Faculty | 5 | One per department, with department assignment |
| Events | 10–15 | Mix of types (hackathon, competition, sports, workshop); some expired, some closing within 48 hours, some upcoming; both in-app and external |
| Team posts | 5–8 | On upcoming events, varied roles needed and spots left |
| Credentials | 10–15 | NPTEL certs in various states: pending, verified, rejected; different tiers and departments |
| Courses | 15–20 | NPTEL course catalog with categories (Programming, AI/ML, Cloud, Data Science, etc.) |

**All sample data should use realistic names and values from Indian college context** (not "John Doe" or "Test Event"). Replace with real data before the demo.

---

# Part 27 — Decisions and Open Items

## 27.1 Decided

- **Login:** students have a college ID and a unique enrollment number. Check both against the pre-loaded list and require a password. Add admin approval or an OTP to a verified email or phone if the list has one.
- **Student list:** yes, the team can get enrollment numbers, branches and department strength. Import them as the pre-loaded list and the Department collection.
- **Pilot faculty:** a small set of faculty post events occasionally, with no single owner. Give each their own account, record who posted each event, and ask 2 to 3 of them to pilot the flow.
- **Ranking metric:** participation rate is the headline rank, shown beside certificates per 100 students and points per 100 students. Admin can switch between them, the report explains the choice, and the guide can confirm the preferred default.
- **Discoverability:** on by default for logged-in college students, showing name, branch, year and skills only, asked once at first login.
- **Limits (admin settings):** 10 invites and connects per user per day, and 5 certificate uploads per 24 hours with at most 15 pending at once.
- **Verification:** faculty for their own department. For now only department faculty verify; the admin handles disputes, and a department faculty member does the monthly spot check.
- **Consent:** no direct contact before the other person accepts.
- **First-minute target:** a new student opens a first event in under 60 seconds.

## 27.2 Still Open

- Mentor's view on the decisions above, if they have one.
- The default ranking metric the department prefers.
- Other issuers: check whether they print a QR code or link (NPTEL does).
- Spot check owner: a department faculty member for now.
- JWT storage: httpOnly cookie vs localStorage (recommendation: httpOnly cookie, see Section 16.3).
- The "Badges" tab definition (recommendation: rename to "Achievements", see Section 13.1).
- Scheduled job runner: node-cron vs BullMQ (recommendation: node-cron for pilot, see Section 6.2).

---

# Part 28 — Task Prompt Template

When giving tasks to the AI coding agent, use this structure:

```
TASK: <one sentence>
CONTEXT: <feature, related collection from the Backend Schemas doc, requirement IDs>
FILES TO CREATE OR CHANGE: <list>
ACCEPTANCE CRITERIA:
1. ...
2. ...
OUT OF SCOPE: <what not to build>
HOW I WILL TEST: <curl commands or test cases>
Write a plan first and wait for my approval.
```

**Example prompt:**

```
TASK: Add the User model and register and login endpoints.
CONTEXT: Auth and users modules. See User and StudentRoster in the Backend Schemas doc. Requirements FR-1 to FR-5.
FILES TO CREATE: modules/users/user.model.ts, user.schema.ts, user.service.ts; modules/auth/auth.schema.ts, auth.service.ts, auth.controller.ts, auth.routes.ts, auth.test.ts
ACCEPTANCE CRITERIA:
1. POST /api/v1/auth/register accepts enrollmentNo, collegeId, password; both IDs must match one StudentRoster row that is not claimed.
2. Name, department and year are copied from the roster, never from the request.
3. Password is hashed with bcrypt; passwordHash is never returned.
4. POST /api/v1/auth/login returns a signed JWT for active users only.
5. All inputs validated with Zod; errors use the shared error shape.
OUT OF SCOPE: OTP, roles, client code.
HOW I WILL TEST: Supertest cases for success, unknown enrollment, wrong college ID, already claimed, wrong password.
Write a plan first and wait for my approval.
```

---

# Part 29 — Cut Order and Demo Checklist

## 29.1 If Time Runs Short, Cut in This Order

1. Connect requests and the looking flag.
2. Web push (keep email and in-app).
3. PDF annual report.
4. QR auto-verify (keep the faculty button).
5. External event tracking.
6. Weighted points (keep participation rate and certificates per 100 students).

## 29.2 Never Cut

Authentication with roster check, events and feed, paste-to-post extraction with the evaluation, team request and accept, credentials with faculty verification, and the department ranking.

## 29.3 Demo Checklist

- [ ] A faculty member pastes a real message and publishes an event.
- [ ] A student sees it, forms a team and registers, and the card counts update.
- [ ] A student uploads an NPTEL certificate and it is verified.
- [ ] The department ranking changes and the breakdown explains why.
- [ ] The extraction accuracy numbers are ready on one slide.

---

# Appendix A — Consolidated Suggestions Summary

All suggestions made in this document, collected for quick reference:

| ID | Category | Suggestion | Section |
| --- | --- | --- | --- |
| S1 | Architecture | Add server-side caching (in-memory for MVP) for `/home`, event feed, and analytics | 6.1 |
| S2 | Architecture | Use `node-cron` for scheduled jobs in pilot; document as known limitation | 6.2 |
| S3 | Architecture | Consider WebSocket layer for real-time inbox/team spot updates (future scope) | Future Scope |
| S4 | Data Model | Rename `Credential.year` to `submissionYear` for clarity | 7.3.2 |
| S5 | Data Model | Use typed singleton `Setting` document instead of key-value bag | 7.3.5 |
| S6 | Data Model | Add soft-delete (`deletedAt`) to Event, Credential, User | 12 |
| S7 | Data Model | Add `promptVersion` to `Event.extraction` | 7.3.3 |
| S8 | API | Prefix all routes with `/api/v1/` | 8.3 |
| S9 | Extraction | Per-user extraction quota (20/day) to protect free-tier LLM quota | 9.1, 16.3 |
| S10 | Extraction | Real fallback is an empty form beside raw text, not regex output alone | 9.1 |
| S11 | Security | Use httpOnly cookie with SameSite=Strict for JWT storage | 16.3 |
| S12 | Security | SSRF hardening: resolve hostnames, reject private IPs, DNS rebinding prevention | 9.7, 16.3 |
| S13 | UX | Add event calendar view (FR-S1) | 3.2 |
| S14 | UX | Add "My Team" consolidated view per event (FR-S2) | 3.3 |
| S15 | UX | Define "Badges" tab → rename to "Achievements" | 13.1 |
| S16 | UX | Offline PWA caching for event feed and profile | 5 |
| S17 | Operations | Structured JSON logging with request IDs | 20 |
| S18 | Operations | Define seed data script output explicitly | 26 |
| S19 | Operations | Monitor scheduled job health via last-run-time checks | 24 |
| S20 | Process | Fix folder name typo: `Implementaion` → `Implementation` | — |
