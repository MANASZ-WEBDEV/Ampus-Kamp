# Campus Innovation Platform – Product and Technical Requirement Analysis

*Event discovery, team formation and innovation analytics for colleges (based on SIH1643). Prepared October 2026. Timeline: 8 weeks.*

# Part A – Product Requirement Analysis

## 1. Product Overview

Campus Innovation Platform is a Progressive Web App (PWA) that brings a college's events, teams and achievements into one place. Faculty paste event details once and the system turns them into a structured event card. Students are notified, find teammates, and record results with proof. Verified records automatically produce department-wise dashboards, rankings and reports, as required by SIH1643 (Innovation Excellence Analytics Portal).

## 2. Problem Statement

1. Event details arrive as long, unstructured messages. Deadlines, eligibility and links get lost.
2. Solo students cannot easily find teammates for hackathons and contests.
3. Achievements such as NPTEL certificates, hackathon results and awards are tracked manually in scattered files.
4. The institution has no single, verified view of innovation performance by department.

## 3. Goals and Non-Goals

**Goals**

- One searchable, structured feed of all college events and contests.
- Reduce faculty effort to a paste-and-confirm step.
- Let solo students form teams quickly and safely.
- Capture achievements with proof and verification.
- Generate fair department rankings automatically from verified data.
- Measure extraction accuracy for a short research evaluation.

**Non-goals (for this release)**

- Training any machine-learning model.
- A built-in chat system (teams connect over WhatsApp).
- Native Android/iOS apps.
- Long-term forecasting, collaboration graphs, certificate OCR.
- Integration with the college ERP.

## 4. Users and Roles

| Role | Description | Main needs |
| --- | --- | --- |
| Student | Any enrolled student | Discover events, find a team, record achievements, see own profile |
| Faculty / coordinator | Posts events and verifies results | Fast posting, minimal retyping, simple verification queue |
| Department head | Views own department | Department dashboard and ranking |
| Admin | Runs the platform | User approval, course catalog, ranking settings, institute-wide analytics |

## 5. Key User Stories

- As a student, I get notified before a hackathon deadline so I don't miss it.
- As a solo student, I post "need 2 teammates, one frontend, one ML" and receive requests.
- As a student, I upload my NPTEL Elite Java certificate and see its verification status.
- As faculty, I paste an organizer's email text and get a ready event card to confirm.
- As faculty, I approve or reject uploaded proofs.
- As a department head, I see how my department ranks and why.
- As admin, I add new courses to the catalog and adjust ranking weights.

## 6. Functional Requirements

Priority key: **M** = must have, **S** = should have, **C** = could have if time remains.

### 6.1 Authentication and Profiles

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Sign up with a valid enrollment number checked against a pre-loaded student list | M |
| FR-2 | Verify identity by email OTP, or admin approval if no college email exists | M |
| FR-3 | Profile with name, branch, year and skills | M |
| FR-4 | Role-based access (student, faculty, department, admin) | M |
| FR-5 | Phone number visibility setting, hidden by default | M |

### 6.2 Events

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-6 | Event feed with filters by type, deadline, branch and year | M |
| FR-7 | Event types: hackathon, competition, sports, workshop, seminar, other | M |
| FR-8 | Paste-to-post: faculty paste raw text, system extracts structured fields | M |
| FR-9 | Faculty review and confirm the extracted card before publishing | M |
| FR-10 | Bookmark events and receive deadline reminders | S |

### 6.3 Team Finder

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-11 | Create a team post for an event: roles needed, number of spots | M |
| FR-12 | Send a join request with a short message | M |
| FR-13 | Owner accepts or rejects requests | M |
| FR-14 | On acceptance, reveal the WhatsApp link or number to the team | M |
| FR-15 | Close the post when spots are full or the event deadline passes | S |

### 6.4 Credentials, Participation and Verification

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-16 | Course catalog (issuer, name, category) maintained by admin | M |
| FR-17 | Upload a credential by choosing a course from a searchable list, with session, year, tier and proof | M |
| FR-18 | Reject duplicates using the certificate ID | M |
| FR-19 | "Other" course goes to an admin queue to be mapped to an existing course or created | M |
| FR-20 | Status flow: pending, verified, rejected, with verifier and time recorded | M |
| FR-21 | Record event participation and results with proof | M |
| FR-22 | Only verified records count in analytics | M |

### 6.5 Analytics and Ranking

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-23 | Counts by department, category, issuer, event type and year | M |
| FR-24 | Department ranking using a chosen fair metric (see section 7) | M |
| FR-25 | Ranking breakdown showing how each indicator contributed | S |
| FR-26 | Admin-editable point weights per tier and credential type | S |
| FR-27 | Student and department profile pages | S |
| FR-28 | Downloadable annual report | C |

### 6.6 Notifications

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-29 | Email notification for new events and request updates | M |
| FR-30 | Web push notifications (PWA) | S |
| FR-31 | Telegram bot | C |

### 6.7 Team Invites, Home Screen and Safety

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

### 6.8 Event Registration and Upload Limits

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

### 6.9 Auto-Verification of QR Certificates

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-52 | Decode the QR code from an uploaded certificate (PDF or image) | S |
| FR-53 | Accept only QR links on the issuer's allowed domain over https | S |
| FR-54 | Fetch the official record and compare name, course, roll number and session with the uploaded fields and the student's profile name | S |
| FR-55 | Full match: mark verified with method 'issuer-qr' and store the evidence (link, time, match result). Mismatch: reject with a reason. Page cannot be fetched or read: send to the faculty queue | S |
| FR-56 | Auto-verified items stay in the monthly spot-check sample | S |

These are should-have because they depend on a feasibility test with a real NPTEL certificate in week 1. If the official page cannot be read automatically, the faculty 'Verify on issuer site' button remains the method.

## 7. Business Rules

**Counting NPTEL and similar credentials**

- A credential is counted once, under the student's department at the time of submission.
- Category (Programming, AI/ML, Cloud and so on) comes from the course catalog, not from the student.
- Only verified credentials count.
- Duplicate certificate IDs are rejected.

**Fair ranking** – raw counts favour large departments, so the ranking uses one or more of:

- Certificates per 100 students.
- Participation rate: percentage of students with at least one verified credential.
- Weighted points, for example Pass 1, Elite 2, Elite + Silver 3, Elite + Gold 4, with weights editable by admin.

Counting unique students (participation rate) prevents a few very active students from inflating a department's rank.

**Privacy**

- Only logged-in college users can see events and profiles.
- Phone numbers are shown only after a join request is accepted and the student has allowed it.

**Verification and fraud controls**

- Proof upload is required, certificate IDs are unique, and the same proof file cannot be reused for two records.
- Nobody can verify their own record, and every decision stores the verifier and the time.
- Editing a verified record sends it back to pending.
- Uploads are limited to 5 per 24 hours and 15 pending at once (admin settings), and unusual activity, such as repeated rejected uploads, is flagged for review.
- Verifiers use the issuer's QR code or verification link when one exists.
- The admin spot-checks about 10 percent of verified items each month.
- Faculty verify items from their own department. For now only department faculty verify; the admin handles disputes.

## 8. Non-Functional Requirements

| Area | Requirement |
| --- | --- |
| Usability | Mobile-first, installable PWA, usable on low-end phones |
| Performance | Feed loads in under 3 seconds on a normal mobile connection; dashboards under 5 seconds for around 1,000 students |
| Availability | Hosted on a free or low-cost platform, targeting around 99 percent uptime during the demo and pilot |
| Security | Hashed passwords, JWT with expiry, input validation, file-type and size limits, role checks on every route |
| Privacy | Minimal personal data; contact details hidden by default |
| Maintainability | Modular code, environment-based configuration, basic documentation |
| Compatibility | Latest Chrome, Edge and Safari; Android and iOS browsers |

## 9. Success Metrics

- At least one batch or department actively using the app during the pilot.
- At least 20 real events posted and 10 team posts created.
- Faculty posting time under 2 minutes per event.
- Extraction accuracy measured on 100 or more labeled messages (field-level precision, recall and F1).
- Share of extracted cards confirmed without any edit.
- Credentials verified within a set turnaround, for example 3 days.

## 10. Scope for 8 Weeks

**In scope (MVP):** FR-1 to FR-9, FR-11 to FR-14, FR-16 to FR-24, FR-29.

**Add if time allows:** FR-10, FR-15, FR-25 to FR-27, FR-30.

**Out of scope:** FR-28, FR-31, forecasting, OCR, collaboration graphs.

**Added after the app flow review:** FR-32 and FR-35 to FR-41 join the MVP; FR-33 and FR-34 are should-have. FR-42 to FR-48 and FR-51 join the MVP; FR-49 and FR-50 are should-have.

## 11. Assumptions and Dependencies

- The college can provide, or the team can compile, a list of valid enrollment numbers and branches.
- Faculty agree to try posting through the platform during the pilot.
- A free-tier LLM API is available. If it is not, a rule-based fallback is used.
- A free hosting plan is sufficient for a pilot of a few hundred users.

## 12. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Low adoption | Empty app, weak demo | Seed real events, pilot with one batch, keep posting simple |
| Wrong extraction | Incorrect event details | Faculty confirm every card, validate JSON, store raw text |
| Fake achievements | Unfair rankings | Proof upload plus verification before counting |
| Free API limits change | Extraction stops | Single swappable function and a regex fallback |
| Short timeline | Unfinished features | Strict MVP scope, early deployment, weekly review |
| Student data privacy | Trust and compliance issues | Hidden contacts, college-only access, permission for any data used in the paper |

# Part B – Technical Requirement Analysis

## 1. Architecture Overview

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

## 2. Technology Stack

| Layer | Choice | Reason |
| --- | --- | --- |
| Frontend | React with Vite, PWA plugin, charting library | Familiar to the team, fast builds, installable |
| Backend | Node.js with Express | One language across the stack |
| Database | MongoDB (Atlas free tier) | Flexible records and aggregation pipelines for dashboards |
| Auth | JWT, bcrypt, email OTP | Simple and stateless |
| Files | Cloudinary or similar object storage | Certificate and proof uploads |
| AI extraction | Hosted LLM API with a free tier, JSON output | No training needed |
| Email | Transactional email service free tier or SMTP | OTP and notifications |
| Push | Web Push with service worker | PWA-native notifications |
| Hosting | Frontend on a static host, backend on a free Node host | Low cost for a pilot |

## 3. Data Model

```js
User        { enrollmentNo, name, email, branch, year, role, skills[], phoneVisible, status }
Department  { code, name, studentStrength }
Course      { issuer, name, code, category, language, aliases[] }
Credential  { studentId, department, courseId, issuer, session, year, tier,
              certificateId (unique), proofUrl,
              verification: { status, verifiedBy, verifiedAt, reason } }
Event       { title, type, organizer, deadline, eventDate, eligibility, teamSize,
              fee, link, summary, rawMessage, extractionMeta, postedBy, status }
TeamPost    { eventId, ownerId, rolesNeeded[], spotsLeft, description, status }
TeamLink    { direction, fromUserId, toUserId, eventId, teamPostId, message, status, expiresAt }
Participation { eventId, userIds[], teamName, result, proofUrl,
                verification: { status, verifiedBy, verifiedAt } }
Setting     { rankingMetric, tierPoints{}, typePoints{} }
```

**Indexes:** unique on `enrollmentNo`, unique on `Credential.certificateId`, and compound indexes on (`status`, `department`, `year`) and (`type`, `deadline`).

**Revision:** `JoinRequest` is replaced by one `TeamLink` collection with a `direction` of request, invite or connect, so all three team paths share one inbox and one accept flow. Added: `LookingFlag { userId, eventId, createdAt }`, `Block { userId, blockedUserId }`, and `proofHash` on `Credential`. Extra indexes: unique pending (`fromUserId`, `toUserId`, `eventId`) and (`toUserId`, `status`) on `TeamLink`.

## 4. Main API Endpoints

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

**Added endpoints:** GET /home, GET /people, POST /links, PATCH /links/:id, GET /links, PUT and DELETE /events/:id/looking, GET /events/:id/looking, POST /blocks, POST /reports.

## 5. Key Technical Designs

### 5.1 Extraction pipeline

1. Faculty submit raw text to `POST /events/extract`.
2. The backend sends it to the LLM with a fixed schema and the instruction to return only JSON, with null for missing fields.
3. The response is validated: required fields, date parsing, URL format. Invalid or missing fields are left blank for the faculty to fill.
4. The confirmed card is saved together with the raw text and a record of which fields the faculty edited.
5. A regex baseline (dates, links, "last date" patterns) runs alongside for comparison and as a fallback when the API is unavailable.
6. Retry with backoff on rate-limit errors.

The saved raw-text and confirmed-card pairs become the labeled dataset for the evaluation.

### 5.2 Credential counting and ranking

An aggregation matches verified credentials, joins them with the course catalog, and groups by department and course or category. Ranking divides by department strength or counts unique students, depending on the selected metric. Weights come from the `Setting` document so changing them does not need a code change.

### 5.3 Team finder safety

Contact details are never returned in team or request responses until the owner accepts the request and the student's visibility setting allows it. The WhatsApp link is generated server-side at that point.

Three paths feed the same `TeamLink` records: a request to join a team post, an invite from a leader's view of a profile, and a direct connect to a student who has not posted. The server enforces the daily limit, one pending item per pair per event, 7-day expiry by a scheduled job, the 30-day cool-down after a decline, and the blocklist.

### 5.4 Notifications

Email is sent through a queue-like background function so slow sending does not block API responses. Web push subscriptions are stored per user, with a fallback to email on iOS devices that have not installed the app.

### 5.5 Home Endpoint and Screen States

GET /home returns the student summary, stats, closing-soon events, matched team posts, the pending request count and an unread flag in one response, so the home screen loads quickly. Team posts match on skills, and a new student with no skills falls back to branch and year. The client hides any empty block and shows a clear message with a next action when nothing is available. Every screen implements four states: next action, empty, loading (placeholder cards) and error (message with a retry button).

### 5.6 Event Registration

```js
Registration { eventId, type: 'individual'|'team', teamName, leaderId,
               members: [{ userId, status }], status, submittedAt }
Event        { ..., registrationMode, minTeamSize, maxTeamSize,
               registrationDeadline, registeredStudents, registeredTeams, trackingCount }
```

States: registration is draft, then submitted, then withdrawn or locked at the deadline; each member is invited, then confirmed or declined. Member confirmations reuse the `TeamLink` inbox. A unique rule allows one active registration per (`eventId`, `userId`), and the event counters update when a registration is submitted or withdrawn. External events only store a tracking record, since the app cannot register a student on another site.

Endpoints: POST /events/:id/registrations, PATCH /registrations/:id (edit, submit, withdraw), PATCH /registrations/:id/members/:userId (confirm or decline), GET /events/:id/registrations (faculty roster), GET /events/:id/registrations/export (CSV), POST /events/:id/tracking. Counts are public on event cards; member names are visible only to teammates and faculty.

### 5.7 QR Auto-Verification Pipeline

No language model decides authenticity; the issuer's own record does. A free language model is only used, if at all, to read the uploaded certificate and pre-fill fields.

1. **Decode:** render the first page of a PDF to an image, then decode the QR with a library (for example jsQR in the browser, or a server-side decoder such as zbar or OpenCV).
2. **Check the link:** accept only https links whose host exactly matches an allowlist (for NPTEL, an nptel.ac.in host). Reject look-alike domains.
3. **Fetch safely:** server-side request with a short timeout, a size limit, no redirects to other hosts, and only to allowlisted hosts, to avoid server-side request forgery.
4. **Compare:** normalize and compare name, course, roll number and session between the official record and the uploaded fields, and compare the name with the student's profile. Use deterministic string matching with a fuzzy threshold, not a language model.
5. **Decide:** full match gives verified with method `issuer-qr` and saved evidence (link, fetched time, match result); mismatch gives rejected with a reason; fetch or parse failure falls back to the faculty queue.
6. **Guard against reuse:** reject a roll number already attached to another account.

A copied QR on a forged certificate is caught because the comparison uses the official record, not the uploaded image. Run a half-day feasibility test in week 1: scan one real certificate, fetch the link, and see whether the page can be read automatically. Also check the issuer's terms before automating requests, and keep request volume to one fetch per upload.

## 6. Security Requirements

- Passwords hashed with bcrypt; JWTs with short expiry.
- Role-based middleware on every protected route.
- Rate limiting on login, OTP and extraction endpoints.
- File uploads limited by type (PDF, JPG, PNG) and size, with storage URLs not guessable.
- Server-side validation of all inputs; no trust in client-provided roles or departments.
- The department on a credential is copied from the user record on the server, never from the request.
- Secrets in environment variables, never in the repository.
- Do not send student personal data to the LLM; send only the pasted event text.

**Fraud and abuse controls**

- Store a hash of each uploaded proof file and reject reuse across records.
- Reject verification by the record's own owner, and keep an audit log of every decision.
- Reset a verified record to pending when its fields change.
- Rate limit invites and connects, and flag unusual upload volume.
- Run a scheduled job to expire pending links and to close team posts at the event deadline.

## 7. Testing and Evaluation

| Type | Plan |
| --- | --- |
| Unit tests | Validation, ranking calculation, duplicate detection |
| API tests | Auth, role access, request flow, verification flow |
| Manual UAT | Faculty and a small student group using real events |
| Extraction evaluation | 100 to 150 hand-labeled messages; compare regex and LLM by field-level precision, recall and F1; record percentage of cards confirmed without edits |
| Ranking check | Compare ranking under two or three metrics to show how the choice affects order |

## 8. Deployment and Operations

- Separate environments for development and production using environment variables.
- Automatic deployment from the main branch.
- Daily database backup export during the pilot.
- Basic error logging and a simple health-check endpoint.

## 9. Suggested Folder Structure

```
server/  src/{config,models,routes,controllers,middleware,services/{extraction,notify,analytics},utils}
client/  src/{features/{auth,events,teams,credentials,analytics,admin},components,hooks,api,pwa}
```

## 10. 8-Week Plan and Team Split

| Weeks | Track A: auth and events | Track B: extraction and data | Track C: teams and analytics |
| --- | --- | --- | --- |
| 1-2 | Auth, profiles, roles, event CRUD and feed, deploy | Collect and label 100+ messages, set up LLM call and regex baseline | Data models, course catalog import, wireframes |
| 3-4 | Filters, email notifications, confirmation screen | Extraction endpoint, validation, fallback, accuracy script | Team posts, join requests, accept flow |
| 5-6 | Admin user approval, settings | Tune prompts, run first evaluation | Credential upload, duplicate check, verification queue |
| 7 | Testing, bug fixes, seed real events | Final evaluation and charts | Dashboards and department ranking |
| 8 | Pilot, demo preparation | Write results section | Report and presentation |

## 11. Decisions

- Login: students have a college ID and a unique enrollment number. Check both against the pre-loaded list and require a password. Add admin approval or an OTP to a verified email or phone if the list has one.
- Student list: yes, the team can get enrollment numbers, branches and department strength. Import them as the pre-loaded list and the Department collection.
- Pilot faculty: a small set of faculty post events occasionally, with no single owner. Give each their own account, record who posted each event, and ask 2 to 3 of them to pilot the flow.
- Ranking metric: participation rate is the headline rank, shown beside certificates per 100 students and points per 100 students. Admin can switch between them, the report explains the choice, and the guide can confirm the preferred default.

**Decisions**

- Discoverability: on by default for logged-in college students, showing name, branch, year and skills only, asked once at first login.
- Limits (admin settings): 10 invites and connects per user per day, and 5 certificate uploads per 24 hours with at most 15 pending at once.
- Verification: faculty for their own department. For now only department faculty verify items; the admin handles disputes, and a department faculty member does the monthly spot check.
- Consent: no direct contact before the other person accepts.
- First-minute target: a new student opens a first event in under 60 seconds.

**Still open**

- Mentor's view on the decisions above, if they have one.
- The default ranking metric the department prefers.
- Other issuers: check whether they print a QR code or link (NPTEL does).
- Spot check owner: a department faculty member for now.
