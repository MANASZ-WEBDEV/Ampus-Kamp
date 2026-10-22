# F-3: Paste-to-Post AI Extraction — Git Commit Plan

> **Format:** [Conventional Commits](https://www.conventionalcommits.org/) — `type(scope): subject`
> **Branch:** `feat/f3-paste-to-post`
> **Target:** merge → `main` via PR after all commits are in

---

## Commit 1 — Data models (AuditLog + Setting)

```
feat(server/models): add AuditLog and Setting models for F-3 quota system

- AuditLog: tracks per-user extraction calls with TTL index (90 days)
  for per-day quota enforcement; used by extraction.controller to count
  today's calls against the configurable daily limit.
- Setting: key-value document store with typed default fallback; ships
  with extractionsPerDay: 20 as the initial default.

Both models are consumed exclusively server-side and contain no PII.

Refs: FR-S6, FR-S7
```

**Files to stage:**
```
server/src/models/auditLog.model.ts
server/src/models/setting.model.ts
```

---

## Commit 2 — Extraction Zod schemas

```
feat(server/extraction): add Zod schemas for extraction request and LLM response

- extractRequestSchema: validates POST /events/extract body
  (rawMessage, 10–10 000 chars).
- llmResponseSchema: validates raw Gemini output; every field uses
  .catch(null) so a malformed LLM response is never a 500.
- ExtractedEventFields and ExtractionResult interfaces exported for
  use by controller and client type-mirroring.
- ALL_EXTRACTABLE_FIELDS constant used to populate uncertainFields
  on total LLM failure.

Refs: FR-8, FR-9
```

**Files to stage:**
```
server/src/modules/events/extraction/extraction.schema.ts
```

---

## Commit 3 — Regex baseline extractor

```
feat(server/extraction): add deterministic regex baseline extractor

Implements regexExtract() covering all 10 extractable fields:
  title, type, deadline, eventDate, fee, link, teamSize,
  eligibility.branches, eligibility.years, summary.

Design decisions:
- Never throws — top-level try/catch returns {} on any error.
- Runs in parallel with the LLM call; result attached as
  regexExtracted on ExtractionResult for research evaluation.
- DATE_PAT lastIndex reset before each reuse (shared /g flag safety).
- Null result for a field means "not found" (open-to-all for
  eligibility → converted to [] = no restriction by controller).

Refs: FR-8 (fallback path)
```

**Files to stage:**
```
server/src/modules/events/extraction/regex.service.ts
```

---

## Commit 4 — Gemini LLM service

```
feat(server/extraction): add Gemini LLM service with retry and timeout

- Calls google/generative-ai (Gemini 1.5 Flash) with 10 s
  AbortController timeout per attempt.
- Exponential back-off retry: 3 attempts at 1 s → 2 s → 4 s on
  429 / timeout / network errors.
- buildPrompt() (PROMPT_VERSION = 'v2') instructs Gemini to read the
  full announcement (500–1 500 words) before responding, enforces
  ISO 8601 dates, branch code normalisation, and ≤100-word summary.
- mapLLMToResult() maps the validated Gemini response to
  ExtractedEventFields + uncertainFields[].
  Eligibility null → { branches: [], years: [] } (open to all);
  only fields absent from the LLM output are flagged as uncertain.
- llmExtract() is the public API — never throws to the caller;
  any failure returns usedFallback: true.
- LLM_API_KEY never logged, never returned in any response.

Refs: FR-8, FR-9, FR-S6, Security checklist item 1
```

**Files to stage:**
```
server/src/modules/events/extraction/llm.service.ts
```

---

## Commit 5 — Extraction controller + route

```
feat(server/extraction): add extraction controller and wire POST /events/extract

extraction.controller.ts:
- Reads per-user daily quota from Setting (default 20).
- Counts today's AuditLog entries; returns 429 if limit reached.
- Runs llmExtract() and regexExtract() in parallel (Promise.all).
- Primary result: LLM if successful; regex fallback otherwise.
- Writes AuditLog entry after every successful extraction.

event.routes.ts:
- Mounts POST /extract before /:id to avoid param capture.
- Requires isAuthenticated + requireRole('faculty', 'dept_head', 'admin').

Refs: FR-8, FR-9, FR-S7
```

**Files to stage:**
```
server/src/modules/events/extraction/extraction.controller.ts
server/src/modules/events/event.routes.ts
```

---

## Commit 6 — Persist F-3 metadata on event creation

```
feat(server/events): store rawMessage and extraction metadata on event create

createEventSchema now accepts optional rawMessage (≤10 000 chars) and
extraction { model, promptVersion, editedFields[], usedFallback } fields.

createEvent() in event.service persists these when present so that
the Paste-to-Post confirm step is a single atomic POST /events call —
no two-step create-then-patch required.

rawMessage is projected out of all student-facing responses; it is
visible only to the owning faculty and admins (via GET /events/:id).

routes.ts: version bumped to 1.0.0-F3; extraction endpoint listed
in the root info response.

Refs: FR-9 (confirm + store)
```

**Files to stage:**
```
server/src/modules/events/event.schema.ts
server/src/modules/events/event.service.ts
server/src/routes.ts
```

---

## Commit 7 — Research evaluation CLI script

```
chore(server/scripts): add extraction evaluation script (precision/recall/F1)

scripts/evaluateExtraction.ts compares LLM vs regex output against a
labeled CSV dataset and prints per-field precision, recall, and F1.

Usage:
  npx ts-node scripts/evaluateExtraction.ts --csv data/labeled.csv

Intended for offline research; not part of the production request path.

Refs: FR-9 (evaluation criterion)
```

**Files to stage:**
```
server/scripts/evaluateExtraction.ts
```

---

## Commit 8 — Client types, API client, and hook

```
feat(client/events): add F-3 extraction types, API function, and hook

types.ts:
- ExtractedFields: mirrors server ExtractedEventFields.
- ExtractionResult: returned by POST /events/extract.
- CreateEventInput extended with optional rawMessage and extraction
  fields so the confirm form can send everything in one POST /events.

events.api.ts:
- extractEvent(rawMessage): calls POST /api/v1/events/extract.

useExtraction.ts:
- TanStack Query useMutation wrapper for extractEvent with typed
  result, error, and isPending state.

index.ts: barrel exports updated for all new types, API, and hook.

Refs: FR-8
```

**Files to stage:**
```
client/src/features/events/types.ts
client/src/features/events/api/events.api.ts
client/src/features/events/hooks/useExtraction.ts
client/src/features/events/index.ts
```

---

## Commit 9 — UI components: UncertainBadge + ExtractionConfirmForm

```
feat(client/events): add UncertainBadge and ExtractionConfirmForm components

UncertainBadge:
- Amber chip with warning icon; role="status" for accessibility.
- Rendered next to any field label where the AI was not confident.

ExtractionConfirmForm:
- Pre-fills all 10 event fields from the LLM extraction result.
- Uncertainty highlighting: amber ring on fields in uncertainFields[].
- Edited-field tracking: blue "edited" chip appears when faculty
  changes an AI-filled value (tracked via editedFields Set).
- Eligibility defaults:
    eligibility.branches = [] (open to all) → all 7 branch pills
    pre-selected; eligibility.years = [] → all 4 year buttons active.
    Normalised back to [] before submit (data model convention).
- Collapsible "Original Announcement" panel shows rawMessage.
- handleSubmit: normalises dates to ISO 8601; sends rawMessage,
  editedFields, usedFallback, promptVersion in a single POST /events.
- Stats bar: fields extracted / fields needing review / fields edited.
- Fallback banner when regex was used instead of LLM.

Refs: FR-9
```

**Files to stage:**
```
client/src/features/events/components/UncertainBadge.tsx
client/src/features/events/components/ExtractionConfirmForm.tsx
```

---

## Commit 10 — PasteToPostPage and router

```
feat(client/events): add PasteToPostPage at /events/paste (faculty+)

Three-state workflow:
  1. INPUT — large textarea (16 rows, resizable, 10 000 char limit)
     with a realistic multi-paragraph placeholder showing an example
     SIH announcement. Char counter + over-limit error shown inline.
     Tip banner: "500–1 500 words works best".
  2. LOADING — animated AI extraction indicator with progress steps
     (sending · reading · extracting · structuring).
  3. REVIEW — ExtractionConfirmForm with pre-filled fields; faculty
     edits, then clicks "Confirm & Save Draft".

router.tsx:
- Lazy-loaded PasteToPostPage added at /events/paste.
- Mounted before /:id to avoid param capture.
- Protected by requireRole('faculty', 'dept_head', 'admin').

Refs: FR-8, FR-9
```

**Files to stage:**
```
client/src/features/events/pages/PasteToPostPage.tsx
client/src/app/router.tsx
```

---

## Commit 11 — Discoverability: entry points on create and my-events pages

```
feat(client/events): add AI Paste entry points to FacultyPostEventPage and MyEventsPage

FacultyPostEventPage (/events/new):
- Gradient banner "Have an announcement? Let AI fill this form" placed
  above the manual step indicator with an → arrow and subtitle
  "Paste a 500–1 500 word notice → Gemini AI extracts all fields →
  you review & confirm".
- "or fill manually" divider below the banner preserves the existing
  manual two-step form unchanged.
- Gives faculty the AI option at the natural moment of intent (when
  they navigate to create an event).

MyEventsPage (/events/my):
- "AI Paste" secondary button added next to "Post New" in the page
  header for quick access from the faculty dashboard.

Refs: FR-8 (discoverability)
```

**Files to stage:**
```
client/src/features/events/pages/FacultyPostEventPage.tsx
client/src/features/events/pages/MyEventsPage.tsx
```

---

## PR Description (copy into GitHub PR body)

```markdown
## F-3: Paste-to-Post AI Extraction

### Summary
Faculty can paste a 500–1 500 word campus announcement and have Gemini
AI extract all 10 event fields automatically. They then review a
pre-filled form, edit any incorrect values, and confirm — creating the
event draft in a single atomic request.

### Changes
- **11 new files** (server models, extraction pipeline, client components/pages)
- **8 modified files** (routes, schemas, service, types, router, pages)

### Flow
```
/events/new → "Have an announcement? Let AI fill this form"
  ↓
/events/paste → paste announcement → Extract with AI
  ↓
Gemini reads full text (10 s timeout, 3× retry)
  ↓
Review form — pre-filled, uncertain fields amber-highlighted
  ↓
Faculty edits → Confirm & Save Draft
  ↓
POST /events (event + rawMessage + extraction metadata, atomic)
  ↓
/events/my → draft → Publish
```

### Security
- `LLM_API_KEY` server-side only; never in client bundle or logs
- Only `rawMessage` (plain text) sent to Gemini — zero PII
- Per-user quota: 20 extractions/day (configurable via `Setting`)
- `rawMessage` projected out of all student-facing API responses
- `phone` field unaffected — F-3 touches no user data

### Testing
- [ ] `tsc --noEmit` passes on both server and client
- [ ] `POST /events/extract` with a real SIH announcement
- [ ] Simulate LLM timeout → regex fallback, no 500
- [ ] 21st extraction in a day → 429
- [ ] Confirm form → event created with `rawMessage` + `extraction` in DB
- [ ] All branches/years pre-selected when announcement is open to all

### Refs
FR-8, FR-9, FR-S6, FR-S7
```

---

## Commit order summary

| # | Commit | Type |
|---|--------|------|
| 1 | AuditLog + Setting models | `feat` |
| 2 | Extraction Zod schemas | `feat` |
| 3 | Regex baseline extractor | `feat` |
| 4 | Gemini LLM service | `feat` |
| 5 | Controller + route | `feat` |
| 6 | Persist F-3 metadata on event create | `feat` |
| 7 | Evaluation CLI script | `chore` |
| 8 | Client types + API + hook | `feat` |
| 9 | UncertainBadge + ExtractionConfirmForm | `feat` |
| 10 | PasteToPostPage + router | `feat` |
| 11 | Entry point banners on create/my-events | `feat` |
