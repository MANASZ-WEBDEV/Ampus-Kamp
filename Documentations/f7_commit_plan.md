# F-7: Credentials & Verification — Git Commit Plan

> **Branch:** `main`  
> **Format:** Conventional Commits  
> **`tsc --noEmit` → 0 errors** on both server and client confirmed before push.

---

## Commit 1 — Data models (3 files)

```
feat(server/models): add Course, Credential, Participation models

Course:
  - Fields: issuer, name, code?, category, language?, aliases[], verificationMethod, active.
  - Compound unique index on { issuer, name }.
  - Text index on { name, aliases } — powers catalog search.

Credential:
  - Fields: studentId, department (always from req.user), courseId?, otherCourseName?,
    issuer, session, year, tier, certificateId, proofUrl, proofHash, qr?, verification{}.
  - Partial unique index on { issuer, certificateId }
      partialFilterExpression: { 'verification.status': { $in: ['pending','verified'] } }
      Rejected certs can be re-uploaded after correction.
  - Hard unique index on { proofHash }
      Absolute deduplication — same file cannot exist twice, even cross-student.
      Prevents credential laundering.
  - Compound indexes: { department, year, 'verification.status' } — faculty queue.
                      { studentId, createdAt:-1 } — my achievements.
                      { 'verification.status', createdAt:1 } — spotCheck cron.

Participation:
  - Fields: studentId, eventId, registrationId?, teamName?, members[], result,
    resultNote?, proofUrl, proofHash, verification{}.
  - Unique index on { studentId, eventId }.
  - Indexes: { eventId, 'verification.status' }, { studentId, createdAt:-1 }.

Refs: FR-16–22, FR-52–56
```

**Git commands:**
```bash
git add Implementation/server/src/models/course.model.ts
git add Implementation/server/src/models/credential.model.ts
git add Implementation/server/src/models/participation.model.ts
git commit -m "feat(server/models): add Course, Credential, Participation models"
```

---

## Commit 2 — Shared utilities (upload + hash)

```
feat(server/shared): add multer upload middleware and SHA-256 hash helper

shared/upload.ts:
  - diskStorage: timestamp + random suffix filenames (collision-proof).
  - MIME allowlist: application/pdf, image/jpeg, image/png only.
  - fileFilter rejects other types → 422 INVALID_FILE_TYPE.
  - Max size: 10 MB (10 * 1024 * 1024 bytes).
  - singleProofUpload: proofUpload.single('proof') — named export for routes.
  - getProofUrl(filename): returns /uploads/<filename> for storage.

shared/utils/hash.ts:
  - sha256(buffer: Buffer): string — crypto.createHash('sha256').
  - Server-computed only — never accepted from client body.
  - Used by both credential.service and participation.service.

Design: SHA-256 of raw file buffer prevents proofHash spoofing
  regardless of what filename or Content-Type the client sends.

Refs: FR-16 (proof upload), FR-S7 (deduplication)
```

**Git commands:**
```bash
git add Implementation/server/src/shared/upload.ts
git add Implementation/server/src/shared/utils/hash.ts
git commit -m "feat(server/shared): add multer upload middleware and SHA-256 hash helper"
```

---

## Commit 3 — QR auto-verify pipeline

```
feat(server/credentials): add SSRF-hardened QR auto-verify pipeline

qr-verify.service.ts — full pipeline:

  extractQrUrlFromPdf(filePath):
    - Reads raw PDF bytes via createReadStream.
    - Regex scan for embedded NPTEL verification URLs.
    - Returns first valid URL or null (no crash on corrupt PDFs).

  SSRF hardening (4 layers):
    1. Host allowlist: QR_ALLOWLIST = Set(['nptel.ac.in'])
       → non-allowlisted host → 'pending' (faculty queue), never error.
    2. DNS resolve → dns.resolve4(host) → check each IP against
       PRIVATE_RANGES (RFC-1918, loopback, link-local, CGNAT).
       Private IP → 'pending'. Never make requests to internal infra.
    3. Fetch: native fetch + AbortController 5s timeout.
       Reads up to 1 MB only — cancels reader beyond MAX_BYTES.
    4. Evidence: only first 500 chars stored — never full HTML.

  buildRange(cidr): uses parts[0] ?? '0.0.0.0' and parts[1] ?? '32'
    Guards against undefined from split('/') (strict TS).

  scorePageContent(html, expected): Dice coefficient bigram comparison.
    Fields: studentName, courseName, roll?, session?.
    Average across all present fields.
    Threshold 0.8 → 'verified'; < 0.8 → 'rejected'; fetch fail → 'pending'.

  QrPipelineOutcome discriminated union:
    | { verdict: 'verified'; evidence; qrUrl; qrHost }
    | { verdict: 'rejected'; reason }
    | { verdict: 'pending' }

  Fail-safe principle: ANY infrastructure failure (DNS, timeout, parse)
  → 'pending', NOT 'rejected'. Only a confirmed content mismatch → 'rejected'.
  NPTEL downtime never blocks students.

Refs: FR-S7 (QR verification), FR-16 (upload)
```

**Git commands:**
```bash
git add Implementation/server/src/modules/credentials/qr-verify.service.ts
git commit -m "feat(server/credentials): add SSRF-hardened QR auto-verify pipeline"
```

---

## Commit 4 — Courses module

```
feat(server/courses): add course catalog module (search, create, aliases)

course.schema.ts:
  - searchCoursesSchema: q? (≤100), category? (≤50).
  - createCourseSchema: issuer, name, code?, category, language?, aliases[],
    verificationMethod ('issuer_qr'|'faculty'|'manual'), active (default true).
  - appendAliasesSchema: aliases[] min 1.

course.service.ts:
  - searchCourses(q?, category?, limit=20):
      Text search when q present: { $text: { $search: q } } + textScore sort.
      Fallback when q absent: { issuer:1, name:1 } sort.
      sort cast via `as any` — MongoDB sort shape varies between
      text-score projection and index sort (no type overlap possible).
  - createCourse: Mongo 11000 on (issuer,name) → ConflictError.
  - appendAliases: $addToSet { $each: aliases } — idempotent.

course.controller.ts + course.routes.ts:
  GET  /courses          — student+ (requireAuth only)
  POST /courses          — admin
  PATCH /courses/:id/aliases — admin

Refs: FR-16 (course catalog), FR-22 (admin)
```

**Git commands:**
```bash
git add Implementation/server/src/modules/courses/course.schema.ts
git add Implementation/server/src/modules/courses/course.service.ts
git add Implementation/server/src/modules/courses/course.controller.ts
git add Implementation/server/src/modules/courses/course.routes.ts
git commit -m "feat(server/courses): add course catalog module (search, create, aliases)"
```

---

## Commit 5 — Credentials module

```
feat(server/credentials): add credential upload and faculty verification

credential.schema.ts:
  - createCredentialSchema: courseId?, otherCourseName?, issuer, session,
    year (1900–2100), tier, certificateId (≤100), [file via multer].
  - editCredentialSchema: all optional — session, year, tier, certificateId.
  - verifyCredentialSchema: verdict ('verified'|'rejected'), reason? (≤300).

credential.service.ts:

  createCredential(user, body, file):
    1. SHA-256 of file buffer — never from client.
    2. Quota check 1: max uploads/24h from Setting('credentialUploadPerDay', 5).
    3. Quota check 2: max pending from Setting('credentialMaxPending', 15).
    4. 'Other' course (no courseId) → method='admin'.
    5. QR pipeline for NPTEL when Setting('qrPipelineEnabled', true).
    6. department always from user.department — body ignored.
    7. Mongo 11000 on proofHash → 409 with existing id.
       Mongo 11000 on (issuer,certificateId) → 409 with existing id.

  getMyCredentials: sort createdAt:-1.
  getPendingQueue: dept filter from user.department, sort createdAt:1 (oldest first).

  editCredential(user, id, body):
    - Owner check.
    - Rejected → AppError (re-upload instead).
    - Verified → reset verification to { status:'pending', method:'faculty' }.
    - Partial field update: only truthy fields applied.

  verifyCredential(user, id, body):
    - Self-verify → 403.
    - Cross-dept guard: cred.department must equal user.department.
    - Only 'pending' can be actioned → 409 if already actioned.
    - AuditLog.create for every verify/reject — compliance trail.

credential.controller.ts + credential.routes.ts:
  POST   /credentials           — student, singleProofUpload middleware
  GET    /credentials/me        — student  [BEFORE /:id to avoid collision]
  GET    /credentials/pending   — faculty+
  PATCH  /credentials/:id       — student
  PATCH  /credentials/:id/verify — faculty+

Refs: FR-16–22
```

**Git commands:**
```bash
git add Implementation/server/src/modules/credentials/credential.schema.ts
git add Implementation/server/src/modules/credentials/credential.service.ts
git add Implementation/server/src/modules/credentials/credential.controller.ts
git add Implementation/server/src/modules/credentials/credential.routes.ts
git commit -m "feat(server/credentials): add credential upload and faculty verification"
```

---

## Commit 6 — Participations module

```
feat(server/participations): add participation proof upload and verification

participation.schema.ts:
  - createParticipationSchema: eventId, registrationId?, teamName?, members[]?,
    result ('winner'|'runner_up'|'participant'|'finisher'), resultNote? (≤120), [file].
  - verifyParticipationSchema: verdict, reason?.

participation.service.ts:
  - createParticipation(user, body, file):
      SHA-256 of file. studentId always from req.user.
      Unique index on { studentId, eventId } → 11000 → 409.
      Verification defaults: { status:'pending', method:'faculty' }.
  - verifyParticipation(user, id, body):
      Self-verify blocked. Dept guard.
      AuditLog written — same pattern as credential verification.

participation.controller.ts + participation.routes.ts:
  POST   /participations           — student, singleProofUpload
  PATCH  /participations/:id/verify — faculty+

Refs: FR-52–56
```

**Git commands:**
```bash
git add Implementation/server/src/modules/participations/participation.schema.ts
git add Implementation/server/src/modules/participations/participation.service.ts
git add Implementation/server/src/modules/participations/participation.controller.ts
git add Implementation/server/src/modules/participations/participation.routes.ts
git commit -m "feat(server/participations): add participation proof upload and verification"
```

---

## Commit 7 — spotCheck cron

```
feat(server/jobs): add monthly spotCheck cron (10% random sample)

jobs/spotCheck.ts:
  - Schedule: '0 3 1 * *' — 03:00 on the 1st of every month.
  - $sample stage: Math.ceil(0.1 * totalVerified) docs chosen randomly.
    MongoDB native $sample — no app-level shuffle, no sort, O(1) memory.
  - Flags sampled credentials by setting verification.spotCheck = true
    (schema-level field so admin UI can filter the queue).
  - Two separate passes: Credential then Participation.
  - Total count cached to avoid double-aggregate on low-volume months.
  - Error isolated: cron failure never crashes server process.
  - Idempotent: running twice in same month only re-samples (no data loss).

Design decision: $sample at DB layer is more reliable than shuffle in JS
  for large collections — avoids loading IDs into memory.

Refs: FR-S7 (spot-check audit)
```

**Git commands:**
```bash
git add Implementation/server/src/jobs/spotCheck.ts
git commit -m "feat(server/jobs): add monthly spotCheck cron (10% random sample)"
```

---

## Commit 8 — Server wiring

```
feat(server): wire F-7 routes, cron, uploads static, bump version to 1.0.0-F7

routes.ts:
  - Import coursesRouter, credentialsRouter, participationsRouter.
  - app.use('/api/v1/courses',        coursesRouter).
  - app.use('/api/v1/credentials',    credentialsRouter).
  - app.use('/api/v1/participations', participationsRouter).
  - Static file serving for dev:
      app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'))).
  - Root info endpoint updated with courses/credentials/participations entries.
  - Version bumped to '1.0.0-F7'.

server.ts:
  - Import scheduleSpotCheck from jobs/spotCheck.ts.
  - Register after lockRegistrations — maintains cron time ordering:
      00:05 closeEvents → 00:05 closeTeamPosts → 00:10 expireLinks
      → 00:15 lockRegistrations → 03:00 on 1st spotCheck.

Refs: FR-16–22, FR-52–56, FR-S7
```

**Git commands:**
```bash
git add Implementation/server/src/routes.ts
git add Implementation/server/src/server.ts
git commit -m "feat(server): wire F-7 routes, cron, uploads static, bump version to 1.0.0-F7"
```

---

## Commit 9 — Client types + API client

```
feat(client/credentials): add F-7 types and API client

types.ts — 12 exports:
  CredVerifStatus:        'pending' | 'verified' | 'rejected'
  CredVerifMethod:        'issuer_qr' | 'faculty' | 'admin'
  CredTier:               'pass' | 'elite' | 'elite_silver' | 'elite_gold'
  Course:                 full shape including verificationMethod (drives QR tip UI)
  Verification:           shared sub-doc for both Credential + Participation
  Credential:             all fields; proofHash present (used for dedup UX)
  Participation:          all fields including members[]
  ParticipationResult:    'winner' | 'runner_up' | 'participant' | 'finisher'
  CreateCredentialInput:  proof: File (triggers multipart)
  EditCredentialInput:    all optional
  VerifyCredentialInput:  verdict + reason?
  CreateParticipationInput: proof: File
  VerifyParticipationInput: verdict + reason?

credentials.api.ts — 7 functions:
  searchCourses(q?, category?)     → Course[]
  createCredential(input)          → Credential  [FormData — multipart]
  getMyCredentials()               → Credential[]
  getPendingCredentials()          → Credential[]
  editCredential(id, input)        → Credential
  verifyCredential(id, input)      → Credential
  createParticipation(input)       → Participation [FormData — multipart]
  verifyParticipation(id, input)   → Participation

FormData construction: members[] JSON.stringified before append
  (multipart can only send strings/blobs — arrays require serialisation).

Refs: FR-16–22, FR-52–56
```

**Git commands:**
```bash
git add Implementation/client/src/features/credentials/types.ts
git add Implementation/client/src/features/credentials/api/credentials.api.ts
git commit -m "feat(client/credentials): add F-7 types and API client"
```

---

## Commit 10 — TanStack Query hooks

```
feat(client/credentials): add useCredentials hooks (8 hooks)

credentialKeys:
  courses(q?, category?)  — staleTime 60s (catalog changes rarely)
  mine()                  — staleTime 15s
  pending()               — staleTime 10s, refetchInterval 30s (live queue)
  participations()

useCourseSearch(q?, category?):
  - Always enabled (q='' returns all/top results for initial dropdown state).
  - 60s staleTime — no reason to re-fetch on every keystroke.

useMyCredentials():
  - Student's own achievements list.

usePendingCredentials():
  - Faculty queue. refetchInterval:30_000 — auto-refreshes without user action.

useCreateCredential():
  - On success: invalidates credentialKeys.mine().

useEditCredential(credentialId):
  - credentialId bound at hook instantiation (stable per edit session).
  - On success: invalidates mine().

useVerifyCredential():
  - mutationFn: ({ id, input }) — id passed at call time for shared modal.
  - On success: invalidates pending().

useCreateParticipation():
  - On success: invalidates participations().

useVerifyParticipation():
  - Same pattern as useVerifyCredential.
  - On success: invalidates pending() (shared faculty queue).

Refs: FR-16–22, FR-52–56
```

**Git commands:**
```bash
git add Implementation/client/src/features/credentials/hooks/useCredentials.ts
git commit -m "feat(client/credentials): add useCredentials hooks (8 hooks)"
```

---

## Commit 11 — UI components (3 files)

```
feat(client/credentials): add CourseSearchInput, CredentialCard, VerifyModal

CourseSearchInput:
  - 300 ms debounce on query before firing useCourseSearch.
  - Keyboard navigation: ↑ ↓ Enter Escape (WCAG 2.1 combobox pattern).
  - "Other / Not listed" always at dropdown bottom → onSelect(null).
  - Clear button → onSelect(undefined) signals unselected (distinct from null=Other).
  - Props: value: Course | null | undefined; onSelect: same union.
    undefined = nothing selected; null = "Other" selected.
  - Selected chip shows issuer + name; "Other" chip shows admin-queue notice.
  - QR badge on results where verificationMethod='issuer_qr'.
  - useEffect syncs query display when parent changes value externally.

CredentialCard:
  - TIER_CONFIG and STATUS_CONFIG maps drive badge colour + icon — no conditional chains.
  - 3-px top accent bar: primary (verified) / error (rejected) / tertiary/40 (pending).
  - Tier chip (top-right): pass / elite / elite_silver / elite_gold with distinct colours.
  - Status chip: Under Review / Verified / Rejected.
  - Proof link: truncated filename (>20 chars), opens in new tab.
  - Rejection reason panel: bg-error-container, shown only when status=rejected + reason present.
  - QR auto-verified note: shown when method='issuer_qr'.
  - Action buttons: Edit (pending) / Resubmit (rejected) — only rendered when callbacks passed.

VerifyModal:
  - Bottom-sheet (fixed inset-x-0 bottom-0) with drag-handle aesthetic.
  - Shared between credentials and participations via type prop + onVerify? override.
    Credentials: uses useVerifyCredential internally.
    Participations: caller injects onVerify callback.
  - REJECTION_REASONS: 7 preset strings as const — no free-text default,
    forces faculty to pick a reason (except "Other" which unlocks textarea).
  - QR Evidence collapsible: <details> element — faculty can inspect raw scan output.
  - canSubmit guard: verdict selected + (if rejected) finalReason.length > 0.
  - Submit button text adapts: "✓ Approve Certificate" / "✗ Reject Certificate".

Refs: FR-17 (search), FR-19 (verify), FR-20 (reject + reason)
```

**Git commands:**
```bash
git add Implementation/client/src/features/credentials/components/CourseSearchInput.tsx
git add Implementation/client/src/features/credentials/components/CredentialCard.tsx
git add Implementation/client/src/features/credentials/components/VerifyModal.tsx
git commit -m "feat(client/credentials): add CourseSearchInput, CredentialCard, VerifyModal"
```

---

## Commit 12 — Student pages (AddAchievementPage + MyAchievementsPage)

```
feat(client/credentials): add AddAchievementPage and MyAchievementsPage

AddAchievementPage (/achievements/add):
  4-step wizard with step indicator (pill dots):

  Step 1 — Course:
    - CourseSearchInput (debounced, keyboard-nav).
    - 'Other' → otherName text input appears below.
    - Continue disabled until course selected or other name filled.

  Step 2 — Metadata:
    - Issuer input (auto-hidden for catalog courses — taken from course.issuer).
    - Session string (e.g. "Jan–Apr 2026").
    - Year selector (current year −4 via YEARS array).
    - Tier grid: 2×2 button grid (pass/elite/elite_silver/elite_gold).
    - Certificate ID: monospace input.
    - Continue disabled until session + certificateId + (issuer if Other) filled.

  Step 3 — Proof:
    - Hidden <input type="file"> triggered by styled drop zone button.
    - Image preview via FileReader (JPG/PNG); PDF shows icon (no preview).
    - "Skip (keep existing proof)" available on edit flow (no file required).
    - NPTEL QR tip banner shown when selectedCourse.verificationMethod='issuer_qr'.

  Step 4 — Confirm:
    - Summary card with all entered data.
    - Queue notice adapts: Other→admin, NPTEL→QR first, else→faculty.
    - Submit spinner with border animation.

  Edit/resubmit flow:
    - location.state.edit or .resubmit from MyAchievementsPage.
    - Pre-fills metadata fields from existing Credential.
    - Edit without new file calls useEditCredential (PATCH).
    - Resubmit/new always calls useCreateCredential (POST).

  Success screen: fullscreen with task_alt icon + "View My Achievements" CTA.

MyAchievementsPage (/badges):
  - Hero header: gradient bg, credential count, 3-col stats (Verified/Pending/Rejected).
  - Tab bar: All / Verified / Pending / Rejected with count badges.
  - Filter: credentials.filter(c => c.verification.status === activeTab).
  - Loading: 3 skeleton pulse cards.
  - Empty: illustration + "Upload Certificate" CTA button (All tab only).
  - List: CredentialCard with onEdit (→ edit flow) and onResubmit (→ add with state).
  - Edit bottom sheet: confirmation before navigating to edit flow
    (warns verified→pending reset).
  - FAB (fixed bottom-right): navigates to /achievements/add.

Refs: FR-16 (upload), FR-17 (catalog), FR-18 (my credentials)
```

**Git commands:**
```bash
git add Implementation/client/src/features/credentials/pages/AddAchievementPage.tsx
git add Implementation/client/src/features/credentials/pages/MyAchievementsPage.tsx
git commit -m "feat(client/credentials): add AddAchievementPage and MyAchievementsPage"
```

---

## Commit 13 — Faculty + Participation pages

```
feat(client/credentials): add FacultyVerificationQueuePage and AddParticipationPage

FacultyVerificationQueuePage (/verify):
  - Gradient secondary header: item count + refresh button.
  - Info banner: "You can only see credentials from your department."
  - usePendingCredentials: refetchInterval 30s — live queue without manual refresh.
  - Queue cards: oldest-first, matching server sort.
  - Age calculation: ms → "Xm ago" / "Xh ago" / "Xd ago".
  - Urgency stripe: 3px top border — bg-error if >48h pending, bg-tertiary/50 otherwise.
    Visually surfaces stale items for faculty attention.
  - QR note: "QR scan attempted — check evidence below" if method='issuer_qr'.
  - Review button: opens VerifyModal with correct type + onVerify override
    for participations.
  - Discriminated union QueueItem narrowed with typed intermediate variable
    (avoids TS2345 on setSelected).

AddParticipationPage (/participations/add):
  3-step wizard (info → proof → confirm):

  Step 1 — Event & Result:
    - Event ID text input (monospace) — pre-filled from ?eventId= query param
      (EventDetailPage can link here after event date).
    - Team name (optional).
    - Result grid: 2×2 with winner/runner_up/participant/finisher.
      Each has distinct icon (emoji_events, military_tech, person, flag).
    - Result note (optional, ≤120 chars).

  Step 2 — Proof: same drop-zone pattern as AddAchievementPage.
  Step 3 — Confirm: summary card + submit spinner.
  Success screen: emoji_events icon + "View Achievements" CTA.

  Tertiary colour scheme (distinct from credentials primary) — visual
  differentiation between "courses" and "events" achievements.

Refs: FR-52–56 (participations), FR-19 (faculty verify)
```

**Git commands:**
```bash
git add Implementation/client/src/features/credentials/pages/FacultyVerificationQueuePage.tsx
git add Implementation/client/src/features/credentials/pages/AddParticipationPage.tsx
git commit -m "feat(client/credentials): add FacultyVerificationQueuePage and AddParticipationPage"
```

---

## Commit 14 — Router + BottomNav wiring

```
feat(client): wire F-7 routes and BottomNav quick actions

router.tsx:
  - Lazy imports (4 pages):
      MyAchievementsPage            → /badges          (student+)
      AddAchievementPage            → /achievements/add (student+)
      AddParticipationPage          → /participations/add (student only)
      FacultyVerificationQueuePage  → /verify (faculty+, dept_head+, admin)
  - /badges route is the BottomNav "Badges" tab — no role restriction
    (faculty can also view badges).

BottomNav.tsx:
  FACULTY_QUICK_ACTIONS (+1 item):
    { id:'qa-verify-queue', label:'Verify Queue', icon:'verified_user',
      to:'/verify', color:'bg-secondary', textColor:'text-on-secondary' }

  STUDENT_QUICK_ACTIONS (+1 item, promoted to top):
    { id:'qa-add-achievement', label:'Add Certificate', icon:'add_task',
      to:'/achievements/add', color:'bg-primary', textColor:'text-on-primary' }

  Design intent: "Add Certificate" is the primary student action in F-7,
  so it leads the FAB menu above "Saved Events" and "Browse All".
  Faculty get one-tap access to their verification queue from anywhere.

Also fixed pre-existing bug in FacultyPostEventPage.tsx:
  - (form as Record<string,unknown>) → (form as unknown as Record<string,unknown>)
  - TS2352 — CreateEventInput doesn't overlap with Record<string,unknown>.

Refs: FR-16–22, FR-52–56
```

**Git commands:**
```bash
git add Implementation/client/src/app/router.tsx
git add Implementation/client/src/components/layout/BottomNav.tsx
git add Implementation/client/src/features/events/pages/FacultyPostEventPage.tsx
git commit -m "feat(client): wire F-7 routes and BottomNav quick actions"
```

---

## After all commits — push

```bash
git push
```

---

## PR Description

```markdown
## F-7: Credentials & Verification

### Summary
Students upload course certificates from a searchable catalog. Duplicate
detection on both `certificateId` (partial unique — pending+verified only)
and `proofHash` (hard unique — absolute cross-student deduplication).
NPTEL certs are auto-verified via a SSRF-hardened QR pipeline. All others
go to the faculty department queue. A monthly cron spot-checks 10% of
verified records. Students also upload participation proof for events.

### Changes
- **8 new server files** (3 models, 2 shared utils, QR pipeline, cron, +
  course/credential/participation modules = 12 module files across 3 dirs)
- **2 modified server files** (routes.ts, server.ts)
- **9 new client files** (types, API, hooks, 3 components, 4 pages)
- **3 modified client files** (router.tsx, BottomNav.tsx, FacultyPostEventPage.tsx)
- **1 bug fix** (pre-existing TS2352 in FacultyPostEventPage)

### Key Design Decisions (SDE3)

| Decision | Rationale |
|----------|-----------|
| `proofHash` hard unique (not partial) | Same file cannot exist twice, even cross-student. Prevents credential laundering via shared PDF. |
| `certificateId` partial unique (pending+verified) | Rejected certs can be re-uploaded after correction without clearing the index. |
| `department` always from `req.user` | Body-supplied department would allow cross-dept data poisoning even with valid JWT. |
| SHA-256 streamed at server — never from client | Client-supplied hash is trivially spoofable; server recomputes from raw bytes. |
| QR pipeline fail-safe to 'pending' | NPTEL downtime ≠ student blocked. Only confirmed mismatch (score < 0.8) → rejected. |
| SSRF: 4-layer defence (allowlist + DNS + IP check + timeout) | Allowlist alone insufficient — TOCTOU between DNS and connect. IP check after resolve closes that window. |
| Quota from `Setting`, not env | Admin can tune upload limits (5/24h, 15 pending) without redeploy. |
| AuditLog on every verify | Compliance + spot-check audit trail. Required by spec. |
| `$sample` in spotCheck cron | MongoDB native random — O(1) memory, no app-level shuffle, safe for large collections. |
| Dice coefficient fuzzy compare | Edit-distance based; threshold 0.8 forgives minor typos in student name / session without accepting clearly wrong certs. |

### Security Checklist
- [x] File MIME check (PDF/JPG/PNG only) at multer layer, max 10 MB
- [x] `proofHash` computed server-side with `crypto` — never from body
- [x] `department` always from `req.user.department` — body ignored
- [x] Self-verify blocked: `credential.studentId.equals(req.user.id)` → 403
- [x] Faculty see only their department's queue (`department: user.department` filter)
- [x] QR: host allowlist → DNS resolve → private IP check → 5s timeout → 1 MB limit
- [x] Upload quota from `Setting` (not hard-coded env)
- [x] AuditLog written on every verify / reject action
- [x] Evidence stored as 500-char snippet only (no full HTML leakage)

### Testing Checklist
- [ ] Upload NPTEL PDF with valid QR → status='verified', method='issuer_qr'
- [ ] Upload NPTEL PDF with mismatched QR data → status='rejected' + reason
- [ ] Upload NPTEL PDF with no QR → status='pending' (faculty queue)
- [ ] 6th upload in 24h → 429
- [ ] 16th pending credential → 429
- [ ] Duplicate certificateId (same issuer) → 409 with existing record id in body
- [ ] Duplicate proofHash (same file re-uploaded) → 409
- [ ] Faculty approve → AuditLog written; verification.status='verified'
- [ ] Faculty reject + reason → reason stored; status='rejected'
- [ ] Student self-verify → 403
- [ ] Faculty from Dept A cannot see Dept B queue
- [ ] Edit pending credential → field updated; status remains 'pending'
- [ ] Edit verified credential → status resets to 'pending'; verifiedBy cleared
- [ ] 'Other' course upload → courseId=null; otherCourseName set; method='admin'
- [ ] GET /courses?q=python → text-search results, textScore sorted
- [ ] Participation upload → unique (studentId, eventId) enforced → 409 on duplicate
- [ ] spotCheck cron: set 10 verified creds → run cron → ~1 flagged
- [ ] /badges page: tabs filter correctly; FAB navigates to add form
- [ ] /verify page: urgency stripe red after 48h; VerifyModal approve/reject flow

### Refs
FR-16, FR-17, FR-18, FR-19, FR-20, FR-21, FR-22,
FR-52, FR-53, FR-54, FR-55, FR-56, FR-S7
```

---

## Commit order summary

| # | Commit subject | Key files |
|---|---------------|-----------|
| 1 | `feat(server/models)` — 3 models | `course.model.ts`, `credential.model.ts`, `participation.model.ts` |
| 2 | `feat(server/shared)` — utils | `upload.ts`, `hash.ts` |
| 3 | `feat(server/credentials)` — QR pipeline | `qr-verify.service.ts` |
| 4 | `feat(server/courses)` — catalog module | `course.schema.ts`, `.service.ts`, `.controller.ts`, `.routes.ts` |
| 5 | `feat(server/credentials)` — upload + verify | `credential.schema.ts`, `.service.ts`, `.controller.ts`, `.routes.ts` |
| 6 | `feat(server/participations)` — participation | `participation.schema.ts`, `.service.ts`, `.controller.ts`, `.routes.ts` |
| 7 | `feat(server/jobs)` — spotCheck cron | `spotCheck.ts` |
| 8 | `feat(server)` — wiring | `routes.ts`, `server.ts` |
| 9 | `feat(client/credentials)` — types + API | `types.ts`, `credentials.api.ts` |
| 10 | `feat(client/credentials)` — hooks | `useCredentials.ts` |
| 11 | `feat(client/credentials)` — components | `CourseSearchInput.tsx`, `CredentialCard.tsx`, `VerifyModal.tsx` |
| 12 | `feat(client/credentials)` — student pages | `AddAchievementPage.tsx`, `MyAchievementsPage.tsx` |
| 13 | `feat(client/credentials)` — faculty + participation | `FacultyVerificationQueuePage.tsx`, `AddParticipationPage.tsx` |
| 14 | `feat(client)` — wiring + bug fix | `router.tsx`, `BottomNav.tsx`, `FacultyPostEventPage.tsx` |
