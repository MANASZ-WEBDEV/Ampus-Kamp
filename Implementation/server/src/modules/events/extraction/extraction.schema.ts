import { z } from 'zod';

// ── Reusable date primitive ───────────────────────────────────────────────────
// Used inside the LLM response schema. Accepts null (LLM uncertain) or a valid
// ISO 8601 string. Invalid formats are coerced to null rather than throwing.

const nullableIsoDate = z
  .string()
  .datetime({ message: 'Must be a valid ISO 8601 date-time string' })
  .nullable()
  .catch(null);  // any parse error → null (treated as uncertain by mapToExtracted)

// ── POST /api/v1/events/extract — request body ────────────────────────────────

export const extractRequestSchema = z.object({
  rawMessage: z
    .string({
      required_error: 'rawMessage is required',
      invalid_type_error: 'rawMessage must be a string',
    })
    .min(10, 'Announcement must be at least 10 characters')
    .max(10000, 'Announcement must not exceed 10,000 characters (~1500 words)')
    .trim(),
});

export type ExtractRequest = z.infer<typeof extractRequestSchema>;

// ── LLM response schema ───────────────────────────────────────────────────────
// Applied with safeParse so any LLM output that doesn't match causes a fallback,
// never a crash. All fields are nullable — null = LLM did not find/uncertain.

export const llmResponseSchema = z.object({
  title: z.string().max(200).nullable().catch(null),

  type: z
    .enum(['hackathon', 'competition', 'sports', 'workshop', 'seminar', 'other'])
    .nullable()
    .catch(null),

  organizer: z.string().max(100).nullable().catch(null),

  deadline: nullableIsoDate,

  eventDate: nullableIsoDate,

  eligibility_branches: z
    .array(z.string().trim().toUpperCase())
    .nullable()
    .catch(null),

  eligibility_years: z
    .array(z.number().int().min(1).max(5))
    .nullable()
    .catch(null),

  teamSize_min: z.number().int().min(1).nullable().catch(null),

  teamSize_max: z.number().int().min(1).nullable().catch(null),

  fee: z.string().max(100).nullable().catch(null),

  link: z
    .string()
    .url()
    .refine((u) => u.startsWith('http://') || u.startsWith('https://'), {
      message: 'URL must use http or https',
    })
    .nullable()
    .catch(null),

  summary: z.string().max(500).nullable().catch(null),
});

export type LLMResponse = z.infer<typeof llmResponseSchema>;

// ── Extracted fields — mirrors CreateEventBody ────────────────────────────────
// This is the shape returned to the client inside ExtractionResult.

export interface ExtractedEventFields {
  title?: string;
  type?: 'hackathon' | 'competition' | 'sports' | 'workshop' | 'seminar' | 'other';
  organizer?: string;
  deadline?: string;       // ISO8601
  eventDate?: string;      // ISO8601
  eligibility?: {
    branches: string[];
    years: number[];
  };
  teamSize?: {
    min: number;
    max: number;
  };
  fee?: string;
  link?: string;
  summary?: string;
}

// ── ExtractionResult — returned to client ─────────────────────────────────────

export interface ExtractionResult {
  extracted: ExtractedEventFields;
  uncertainFields: string[];
  usedFallback: boolean;
  regexExtracted?: ExtractedEventFields;  // included for research/eval; stripped before student views
}

// ── All possible extractable field names ──────────────────────────────────────
// Used to populate uncertainFields when LLM fails entirely.

export const ALL_EXTRACTABLE_FIELDS: (keyof ExtractedEventFields | string)[] = [
  'title',
  'type',
  'organizer',
  'deadline',
  'eventDate',
  'eligibility',
  'teamSize',
  'fee',
  'link',
  'summary',
];
