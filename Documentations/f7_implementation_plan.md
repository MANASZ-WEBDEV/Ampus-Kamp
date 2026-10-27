# F-7: Credentials & Verification — Implementation Plan

## Overview

Students upload course certificates from a searchable catalog. The system:
- Deduplicates on **`certificateId` + `proofHash`** (both DB-unique-indexed).
- Optionally **auto-verifies NPTEL certs via QR** (SSRF-hardened pipeline).
- Falls through to the **faculty department queue** on QR failure.
- Tracks every verification action in **AuditLog**.
- Enforces upload quotas from `Setting` (5/24h, 15 pending max).
- Students also upload **Participation proof** for events they competed in.
- A monthly **spotCheck cron** samples 10% of verified items for admin review.

**Requirements:** FR-16–22, FR-52–56, FR-S7

---

## Data Model

### Course
```ts
{
  issuer:             string;   // 'NPTEL' | 'Coursera' | 'Udemy' | …
  name:               string;   // canonical name
  code?:              string;   // e.g. 'CS101'
  category:           string;   // 'programming' | 'data_science' | 'design' | …
  language?:          string;
  aliases:            string[]; // alternate spellings for fuzzy search
  verificationMethod: 'issuer_qr' | 'faculty' | 'manual';
  active:             boolean;
}
// Unique: (issuer, name)
// Text index: (name, aliases) for catalog search
```

### Credential
```ts
{
  studentId:      ObjectId;     // ref → User (set from req.user — never body)
  department:     ObjectId;     // ref → Dept (from req.user.department — never body)
  courseId?:      ObjectId;     // null if "Other" course
  otherCourseName?: string;     // if "Other"
  issuer:         string;
  session:        string;       // e.g. 'Jan–Apr 2026'
  year:           number;       // academic year (for analytics F-8)
  tier:           'pass' | 'elite' | 'elite_silver' | 'elite_gold';
  certificateId:  string;       // as printed on cert
  proofUrl:       string;       // stored file path/URL
  proofHash:      string;       // SHA-256 of uploaded file — server-computed ONLY
  qr?: {
    url:  string;               // URL extracted from QR
    host: string;               // hostname of QR URL
  };
  verification: {
    status:      'pending' | 'verified' | 'rejected';
    method:      'issuer_qr' | 'faculty' | 'admin';
    verifiedBy?: ObjectId;      // ref → User (faculty/admin)
    verifiedAt?: Date;
    reason?:     string;        // rejection reason
    evidence?:   string;        // QR fetch HTML snippet (truncated)
  };
}
// Unique partial:  { issuer, certificateId } where status='pending'|'verified'
//   (allows re-upload of rejected certs)
// Unique:          { proofHash }
//   (absolute deduplicate on file content — even cross-student)
// Indexes:
//   { department, year, 'verification.status' }   — faculty queue
//   { studentId, createdAt: -1 }                  — my achievements
//   { 'verification.status', createdAt: 1 }       — spotCheck cron
```

### Participation
```ts
{
  studentId:       ObjectId;    // ref → User (from req.user)
  eventId:         ObjectId;    // ref → Event
  registrationId?: ObjectId;    // ref → Registration
  teamName?:       string;
  members:         Array<{ userId: ObjectId; department: ObjectId }>;
  result:          'winner' | 'runner_up' | 'participant' | 'finisher';
  resultNote?:     string;      // e.g. '2nd place out of 45 teams'
  proofUrl:        string;      // certificate / screenshot
  proofHash:       string;      // SHA-256 server-computed
  verification: {               // same sub-doc as Credential
    status:      'pending' | 'verified' | 'rejected';
    method:      'faculty' | 'admin';
    verifiedBy?: ObjectId;
    verifiedAt?: Date;
    reason?:     string;
  };
}
// Unique: { studentId, eventId }
// Indexes: { eventId, 'verification.status' }, { studentId, createdAt:-1 }
```

---

## QR Auto-Verify Pipeline

```
Upload PDF → multer → SHA-256 hash → check proofHash unique (→ 409 if dup)
  → jsQR / pdf-lib decode QR from PDF pages
    → No QR found → skip QR pipeline → status='pending' → faculty queue
    → QR URL found:
        → parse host → not in allowlist ['nptel.ac.in'] → skip → faculty queue
        → DNS resolve → check IP → private range? → skip → faculty queue
        → axios.get(url, { timeout:5000, maxContentLength:1_000_000 })
            → fetch fail / timeout → status='pending' → faculty queue
            → fetch OK → fuzzy compare (student name, course name, roll, session)
                → score ≥ 0.8 → status='verified', method='issuer_qr', evidence stored
                → score < 0.8 → status='rejected', reason='Cert data mismatch'
```

**SSRF hardening:**
- Host allowlist check (`nptel.ac.in` only initially)
- DNS resolve → check against `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`
- 5s timeout + 1 MB `maxContentLength`
- Never log the full fetched HTML — store only evidence snippet (first 500 chars of relevant section)

---

## API Contract

### Courses
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/courses?q=&category=` | student+ | Search catalog (text index) |
| `POST` | `/api/v1/courses` | admin | Add course to catalog |
| `PATCH` | `/api/v1/courses/:id/aliases` | admin | Append aliases |

### Credentials
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/credentials` | student | Upload (multipart/form-data) |
| `GET` | `/api/v1/credentials/me` | student | Own credentials (newest first) |
| `PATCH` | `/api/v1/credentials/:id` | student | Edit pending credential |
| `GET` | `/api/v1/credentials/pending` | faculty+ | Dept queue (oldest first) |
| `PATCH` | `/api/v1/credentials/:id/verify` | faculty+ | Approve / reject |

### Participations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/participations` | student | Upload participation proof |
| `PATCH` | `/api/v1/participations/:id/verify` | faculty+ | Verify participation |

---

## Business Rules

| Rule | Enforcement |
|------|-------------|
| `department` from `req.user` | Service ignores any `department` in body |
| Upload limits: **5/24h + 15 pending** | `getSetting` → count Credential docs in last 24h; count by status='pending' |
| Duplicate `certificateId` → 409 with existing record `id` | Partial unique index → Mongo 11000 |
| Duplicate `proofHash` → 409 | Unique index → Mongo 11000; message includes existing record id |
| "Other" course → admin queue | `courseId: null`, `otherCourseName` set, `verification.method='admin'` |
| Self-verify blocked | `credential.studentId.equals(req.user.id)` → 403 |
| Edit verified → resets to pending | Service sets `verification: { status:'pending', method:'faculty' }`, clears verifiedBy/At |
| Faculty see only own dept queue | `{ department: req.user.department }` filter |
| Every verify writes AuditLog | `AuditLog.create({ userId, action:'credential_verify', meta:{credentialId, verdict} })` |
| QR SSRF hardening | Allowlist + IP check + timeout (see above) |
| Spot-check: ~10% monthly | `jobs/spotCheck.ts` cron — flags random 10% of verified for admin review |

---

## File Build Plan (dependency order)

### Server (13 files)

```
1.  models/course.model.ts          — Course (text index, unique issuer+name)
2.  models/credential.model.ts      — Credential (partial unique, proofHash unique)
3.  models/participation.model.ts   — Participation (unique studentId+eventId)

4.  shared/upload.ts                — multer config (disk/memory, MIME check, 10 MB)
5.  shared/hash.ts                  — SHA-256 file hash helper (crypto, streams)

6.  modules/credentials/qr-verify.service.ts
      — SSRF-hardened QR pipeline (jsQR + pdf-lib, allowlist, IP check, fuzzy compare)

7.  modules/courses/course.schema.ts
8.  modules/courses/course.service.ts
9.  modules/courses/course.controller.ts
10. modules/courses/course.routes.ts

11. modules/credentials/credential.schema.ts
12. modules/credentials/credential.service.ts
      — createCredential (quota, hash, QR pipeline, upload limit)
      — verifyCredential (self-verify block, dept check, AuditLog)
      — editCredential (pending only or reset verified→pending)
      — getMyCredentials, getPendingQueue
13. modules/credentials/credential.controller.ts
14. modules/credentials/credential.routes.ts

15. modules/participations/participation.schema.ts
16. modules/participations/participation.service.ts
      — createParticipation (hash, quota shared with credentials)
      — verifyParticipation (AuditLog)
17. modules/participations/participation.controller.ts
18. modules/participations/participation.routes.ts

19. jobs/spotCheck.ts               — Monthly 10% sampling cron
20. routes.ts + server.ts           — Wire routers + cron
```

### Client (8 files)

```
21. features/credentials/types.ts
22. features/credentials/api/credentials.api.ts
23. features/credentials/hooks/useCredentials.ts

24. features/credentials/components/CourseSearchInput.tsx
      — text search, debounce 300ms, "Other" escape hatch
25. features/credentials/components/CredentialCard.tsx
      — status chip, proof link, resubmit (rejected), edit (pending)
26. features/credentials/components/VerifyModal.tsx
      — approve / reject + reason dropdown (faculty)
27. features/credentials/pages/AddAchievementPage.tsx
      — file upload + CourseSearchInput + metadata form
28. features/credentials/pages/MyAchievementsPage.tsx
29. features/credentials/pages/FacultyVerificationQueuePage.tsx
30. features/credentials/pages/AddParticipationPage.tsx

+ router.tsx + BottomNav "Badges" tab wiring
```

---

## Key SDE3 Decisions

| Decision | Rationale |
|----------|-----------|
| `proofHash` unique — not partial | An identical file can only exist once in the system, even across students. Prevents credential laundering. |
| `certificateId` unique partial (pending+verified only) | Rejected certs can be re-uploaded after correction. Withdrawn records don't count. |
| Upload quota from `Setting`, not env | Admin can tune limits without redeploy. `getSetting('credentialUploadPerDay', 5)` |
| SHA-256 streamed with `crypto.createHash` | Never loads entire file into memory — safe for 10 MB PDFs |
| QR pipeline: fail-safe to faculty queue | NPTEL downtime should not block students from getting verified |
| `department` from `req.user` always | Prevents cross-department data poisoning even if body is tampered |
| AuditLog on every verify | Compliance + admin spot-check audit trail |
| spotCheck cron uses `$sample` | MongoDB native random sample — no app-level sorting/shuffling |
| Fuzzy compare using string-similarity | edit-distance based; threshold 0.8 prevents typo-based mismatch rejections |

---

## Security Checklist

- [ ] File MIME check (PDF/JPG/PNG only), max 10 MB enforced at multer level
- [ ] `proofHash` computed server-side with `crypto`, never accepted from client
- [ ] `department` always from `req.user.department`
- [ ] Self-verify blocked: `credential.studentId.equals(req.user.id)` → 403
- [ ] QR: allowlist check → DNS resolve → private IP rejection → 5s timeout → 1 MB limit
- [ ] Upload quota from `Setting` (not hard-coded)
- [ ] AuditLog on every `verify` / `reject` action
- [ ] Faculty can only see their own department's queue

---

## Acceptance Criteria (matching spec)

- [ ] Upload NPTEL cert → lands in faculty department queue
- [ ] 6th upload in 24h → 429
- [ ] Duplicate `certificateId` → 409 with existing record id in error body
- [ ] Duplicate `proofHash` → 409
- [ ] Faculty approve → AuditLog written; `verification.status` → `verified`
- [ ] Self-verify → 403
- [ ] Edit verified credential → resets to `pending`
- [ ] "Other" course → admin queue; student sees status = 'pending'
- [ ] QR match → auto-verified; mismatch → rejected; fetch fail → faculty queue
- [ ] Spot-check cron flags ~10% of verified items monthly

> [!NOTE]
> **QR pipeline is gated behind week-0 spike success.** If `jsQR` + `pdf-lib` QR decode proves unreliable on non-NPTEL PDFs, the pipeline is disabled via `Setting.qrPipelineEnabled = false` and all credentials go directly to the faculty queue. This is a feature flag, not a code path removal.

> [!IMPORTANT]
> **Out of scope:** Analytics aggregation (F-8). `department` and `year` fields on `Credential` are intentionally stored now so F-8 can run its aggregation pipeline without a backfill migration.
