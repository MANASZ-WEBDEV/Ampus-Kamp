# F-3: Paste-to-Post AI Extraction — Implementation Plan

> **Status:** Ready for implementation  
> **Depends on:** F-2 (events module) ✅ — `event.routes.ts`, `event.model.ts`, `event.service.ts` all exist  
> **LLM:** Gemini 1.5 Flash via `@google/generative-ai` SDK (`LLM_API_KEY` + `LLM_MODEL` already in `.env`)

---

## Overview

Faculty paste a raw campus announcement. The server calls Gemini, Zod-validates the response, and returns structured event fields with `uncertainFields[]` highlighted. A regex service runs in parallel for research comparison. Quota (20/day) is enforced via an `AuditLog` collection; the `Setting` collection holds the configurable limit.

---

## Files to Create / Modify

### Server — New Files

| File | Purpose |
|------|---------|
| `server/src/models/auditLog.model.ts` | Tracks extraction events per user for quota enforcement |
| `server/src/models/setting.model.ts` | Key-value store for `extractionsPerDay` limit |
| `server/src/modules/events/extraction/extraction.schema.ts` | Zod schemas: request body + LLM response |
| `server/src/modules/events/extraction/llm.service.ts` | Gemini call with retry + Zod validation + fallback |
| `server/src/modules/events/extraction/regex.service.ts` | Regex baseline extractor (runs in parallel) |
| `server/src/modules/events/extraction/extraction.controller.ts` | Thin controller calling service |
| `scripts/evaluateExtraction.ts` | CLI script: precision/recall/F1 per field from labeled CSV |

### Server — Modified Files

| File | Change |
|------|--------|
| `server/src/modules/events/event.routes.ts` | Mount `POST /extract` **before** `/:id` (placeholder comment already there) |
| `server/src/config/env.ts` | Add startup validation: if `LLM_API_KEY` is missing → warn (not crash, quota returns 503) |

### Client — New Files

| File | Purpose |
|------|---------|
| `client/src/features/events/pages/PasteToPostPage.tsx` | Textarea + Extract button → transitions to confirm form |
| `client/src/features/events/components/ExtractionConfirmForm.tsx` | Pre-filled form; uncertain fields highlighted amber; raw text collapsible |
| `client/src/features/events/components/UncertainBadge.tsx` | "AI uncertain — please verify" chip |
| `client/src/features/events/api/extraction.api.ts` | TanStack Query mutation for `POST /events/extract` |
| `client/src/features/events/hooks/useExtraction.ts` | `useMutation` wrapper |

### Client — Modified Files

| File | Change |
|------|--------|
| `client/src/features/events/types.ts` | Add `ExtractionResult`, `ExtractedFields` types |
| `client/src/features/events/index.ts` | Barrel export new components |
| `client/src/app/router.tsx` (or equivalent routing file) | Add `/events/paste` route (faculty only) |

---

## Detailed Implementation Steps

### Step 1 — `AuditLog` + `Setting` Models

**`server/src/models/auditLog.model.ts`**
```ts
// Minimal schema; extended in F-8/F-10 for full audit trail
interface IAuditLog {
  userId: Types.ObjectId;   // ref → User
  action: string;           // e.g. 'extraction'
  meta?: Record<string, unknown>;
  createdAt: Date;
}
// Index: { userId, action, createdAt: -1 }
// TTL index: createdAt, expireAfterSeconds: 90 days
```

**`server/src/models/setting.model.ts`**
```ts
interface ISetting {
  key: string;              // unique
  value: unknown;           // JSON value
  description?: string;
}
// { extractionsPerDay: 20 } seeded on first run
```

> **Note:** Quota check reads `Setting.findOne({ key: 'extractionsPerDay' })` — defaults to `20` if the document is absent (safe start-up).

---

### Step 2 — `extraction.schema.ts`

```ts
// Request body
export const extractRequestSchema = z.object({
  rawMessage: z.string()
    .min(10, 'Announcement must be at least 10 characters')
    .max(5000, 'Announcement must not exceed 5000 characters')
    .trim(),
});

// LLM response shape — used with safeParse
export const llmResponseSchema = z.object({
  title:                z.string().max(200).nullable(),
  type:                 z.enum(['hackathon','competition','sports','workshop','seminar','other']).nullable(),
  organizer:            z.string().max(100).nullable(),
  deadline:             z.string().datetime().nullable(),      // ISO8601; invalid → null
  eventDate:            z.string().datetime().nullable(),
  eligibility_branches: z.array(z.string()).nullable(),
  eligibility_years:    z.array(z.number().int().min(1).max(5)).nullable(),
  teamSize_min:         z.number().int().min(1).nullable(),
  teamSize_max:         z.number().int().min(1).nullable(),
  fee:                  z.string().max(100).nullable(),
  link:                 z.string().url().startsWith('http').nullable(),
  summary:              z.string().max(500).nullable(),        // ≤100 words ≈ ≤500 chars
});

export type ExtractRequest  = z.infer<typeof extractRequestSchema>;
export type LLMResponse     = z.infer<typeof llmResponseSchema>;

// Response shape returned to client
export interface ExtractionResult {
  extracted: Partial<EventFields>;  // EventFields mirrors CreateEventBody
  uncertainFields: string[];
  usedFallback: boolean;
}
```

> **Rule:** Dates with `z.string().datetime()` that fail → `null` (not a crash). Fields that are `null` in the LLM response → added to `uncertainFields[]`.

---

### Step 3 — `llm.service.ts`

**Key constants:**
```ts
export const PROMPT_VERSION = 'v1'; // increment when prompt changes
const TIMEOUT_MS  = 10_000;         // 10s
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // exponential backoff
```

**Pipeline:**
```
buildPrompt(rawMessage)
  → callGeminiWithRetry()          // timeout + 3x retry on 429/timeout
  → extractJsonFromResponse()      // strip markdown fences, parse JSON
  → llmResponseSchema.safeParse()  // Zod validate
  → mapToExtracted()               // null fields → uncertainFields[]
  → return { extracted, uncertainFields, usedFallback: false }
```

**Fallback path (any failure):**
```
→ return { extracted: {}, uncertainFields: ALL_FIELDS, usedFallback: true }
```

**Security:** `env.LLM_API_KEY` is read once at service init; never logged; not in any response.

**`callGeminiWithRetry` implementation pattern:**
```ts
async function callGeminiWithRetry(prompt: string): Promise<string> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const result = await genAI.generateContent(prompt, { signal: controller.signal });
      clearTimeout(timeout);
      return result.response.text();
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      if (isRateLimitOrTimeout(err)) {
        await sleep(RETRY_DELAYS[attempt]);
      } else throw err;
    }
  }
  throw new Error('Unreachable');
}
```

> **Note:** The `@google/generative-ai` package needs to be installed. Check if it's already in `node_modules`; if not, add to `dependencies`.

---

### Step 4 — `regex.service.ts`

A deterministic baseline for research comparison. Must never throw — always returns a partial result.

```ts
// Patterns:
// title:    First line if ≥ 5 chars
// type:     keyword match (hackathon, competition, sports, workshop, seminar)
// deadline: "last date" / "deadline" / "apply by" + date patterns (DD/MM/YYYY, DD Month YYYY)
// eventDate: "on <date>" / "held on" patterns
// fee:      ₹ / Rs. / INR + number
// link:     https?:// URL extraction
// teamSize: "team of <n>" / "<n>-<n> members"
// branches: CSE, IT, ECE, ME, CE, EE keyword match
// years:    1st/2nd/3rd/4th year / "all years"

export function regexExtract(rawMessage: string): Partial<EventFields> { ... }
```

---

### Step 5 — `extraction.controller.ts`

```ts
export const extractEvent = asyncHandler(async (req, res) => {
  const { rawMessage } = req.body as ExtractRequest; // already Zod-validated by middleware
  const actor = (req as AuthRequest).user;

  // 1. Quota check
  const limit   = await getExtractionLimit();           // Setting lookup, default 20
  const todayCount = await countTodayExtractions(actor.id);
  if (todayCount >= limit) throw new RateLimitError('Daily extraction quota exceeded (20/day).');

  // 2. Run LLM + regex in parallel
  const [llmResult, regexResult] = await Promise.allSettled([
    llmExtract(rawMessage),
    Promise.resolve(regexExtract(rawMessage)),
  ]);

  // 3. Log the attempt (regardless of LLM success)
  await AuditLog.create({ userId: actor.id, action: 'extraction' });

  // 4. Merge: LLM wins if successful; else regex; else empty
  const result = llmResult.status === 'fulfilled'
    ? llmResult.value
    : {
        extracted: regexResult.status === 'fulfilled' ? regexResult.value : {},
        uncertainFields: ALL_FIELDS,
        usedFallback: true,
      };

  res.json({ data: result });
});
```

---

### Step 6 — Wire route in `event.routes.ts`

Add **before** the `/:id` route (the placeholder comment is already there):

```ts
import { extractRequestSchema } from './extraction/extraction.schema';
import * as extractCtrl from './extraction/extraction.controller';

// POST /api/v1/events/extract — must be before /:id
eventsRouter.post(
  '/extract',
  requireAuth,
  requireRole(['faculty', 'dept_head', 'admin']),
  validate(extractRequestSchema),
  extractCtrl.extractEvent,
);
```

---

### Step 7 — `evaluateExtraction.ts` script

A standalone CLI script (not part of the server bundle):

```
Usage: npx ts-node scripts/evaluateExtraction.ts --csv <path>

CSV format (labeled dataset):
  rawMessage, expected_title, expected_type, expected_deadline, ...

Output (per field + overall):
  ┌───────────┬───────────┬────────────┬────────────┐
  │ Field     │ Precision │ Recall     │ F1         │
  ├───────────┼───────────┼────────────┼────────────┤
  │ title     │  0.95     │  0.95      │  0.95      │
  │ type      │  0.88     │  0.92      │  0.90      │
  │ deadline  │  0.75     │  0.80      │  0.77      │
  │ ...       │  ...      │  ...       │  ...       │
  └───────────┴───────────┴────────────┴────────────┘
  LLM vs Regex comparison included.
```

---

### Step 8 — Client: `types.ts` additions

```ts
export interface ExtractedFields {
  title?: string | null;
  type?: EventType | null;
  organizer?: string | null;
  deadline?: string | null;
  eventDate?: string | null;
  eligibility?: { branches?: string[]; years?: number[] } | null;
  teamSize?: { min?: number; max?: number } | null;
  fee?: string | null;
  link?: string | null;
  summary?: string | null;
}

export interface ExtractionResult {
  extracted: ExtractedFields;
  uncertainFields: string[];
  usedFallback: boolean;
}
```

---

### Step 9 — Client: `extraction.api.ts` + `useExtraction.ts`

```ts
// extraction.api.ts
export async function extractEvent(rawMessage: string): Promise<ExtractionResult> {
  const res = await apiClient.post('/events/extract', { rawMessage });
  return res.data.data;
}

// useExtraction.ts
export function useExtraction() {
  return useMutation({ mutationFn: extractEvent });
}
```

---

### Step 10 — Client: `UncertainBadge.tsx`

```tsx
export function UncertainBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                     bg-warning-container text-on-warning-container text-[10px] font-bold">
      <span className="material-symbols-outlined text-[12px]">warning</span>
      AI uncertain — please verify
    </span>
  );
}
```

---

### Step 11 — Client: `ExtractionConfirmForm.tsx`

A pre-filled form that reuses the existing field components from `FacultyPostEventPage` but:
- Wraps each field with `UncertainBadge` if that field's name is in `uncertainFields[]`
- Tracks which fields were changed by faculty → `editedFields[]`
- Has a collapsible panel showing the raw text
- On "Confirm & Create Draft" → calls existing `useCreateEvent` with the form data + `rawMessage`
- On confirm success → navigates to `/events/my` (same as manual create)

**Key UX states:**
1. `extracting` — skeleton / spinner while LLM runs
2. `review` — pre-filled form with uncertain highlights
3. `fallback` — empty form with raw text visible + warning banner
4. `submitting` — draft being saved

---

### Step 12 — Client: `PasteToPostPage.tsx`

**Route:** `/events/paste` (faculty+ only)

**Flow:**
```
[Textarea — paste announcement here]
  ↓ Extract →
  [ExtractionConfirmForm (review state)]
  ↓ Confirm & Create Draft →
  [/events/my]
```

**Quota guard:** If server returns `429` → show "You've used all 20 daily AI extractions. Try again tomorrow." banner with a fallback "Fill manually instead" button that navigates to `/events/new`.

---

## Package Dependency Check

The `@google/generative-ai` npm package is needed for the Gemini SDK. We need to verify if it's installed:

```bash
# Run in server/
npm list @google/generative-ai
# If not found:
npm install @google/generative-ai
```

---

## Acceptance Criteria Checklist

| # | Criterion | Implementation |
|---|-----------|----------------|
| AC-1 | Real announcement → structured card in < 10s | `TIMEOUT_MS=10000`, Gemini Flash is fast |
| AC-2 | Uncertain fields listed in `uncertainFields` | `null` fields → `uncertainFields[]` in `mapToExtracted()` |
| AC-3 | Simulated LLM timeout → graceful fallback (no 500) | `try/catch` around entire llm call; controller catches |
| AC-4 | 21st extraction in a day → `429` | `RateLimitError` after quota check |
| AC-5 | `promptVersion` stored on confirmed event | `setRawMessage()` in `event.service.ts` already exists; confirm form calls it via `createEvent` with `extraction.promptVersion = PROMPT_VERSION` |
| AC-6 | `editedFields` accurately records faculty changes | `ExtractionConfirmForm` tracks which fields were changed before confirm |
| AC-7 | Eval script prints field-level F1 | `scripts/evaluateExtraction.ts` |

---

## Implementation Sequence

```
1. auditLog.model.ts + setting.model.ts         (5 min)
2. extraction.schema.ts                          (10 min)
3. llm.service.ts                                (20 min)
4. regex.service.ts                              (15 min)
5. extraction.controller.ts                      (10 min)
6. event.routes.ts update                        (2 min)
7. evaluateExtraction.ts script                  (15 min)
8. Client: types.ts additions                    (5 min)
9. Client: extraction.api.ts + useExtraction.ts  (5 min)
10. Client: UncertainBadge.tsx                   (5 min)
11. Client: ExtractionConfirmForm.tsx            (30 min)
12. Client: PasteToPostPage.tsx                  (20 min)
13. Router update                                (5 min)
14. Install @google/generative-ai if needed      (2 min)
```

**Total estimate: ~2.5 hours**

---

## Out of Scope (per spec)

- Event creation itself (F-2 already done)
- Confirm form UI pixel-perfect polish beyond functional
- Test file for extraction (can be added as bonus)
