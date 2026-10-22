/**
 * llm.service.ts — F-3 Paste-to-Post AI Extraction
 *
 * Calls Google Gemini to extract structured event fields from raw text.
 * Retry strategy: 3x with exponential back-off (1s → 2s → 4s) on 429 / timeout.
 * If all retries fail or Zod parse fails, the caller receives usedFallback:true.
 *
 * Security rules enforced here:
 *  - Only rawMessage is sent to Gemini — zero PII.
 *  - LLM_API_KEY is read once at module init; never logged, never returned.
 *  - safeParse used throughout — no uncaught Zod throws.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '@/config/env';
import { llmResponseSchema, ALL_EXTRACTABLE_FIELDS } from './extraction.schema';
import type { ExtractedEventFields, ExtractionResult } from './extraction.schema';

// ── Versioning ────────────────────────────────────────────────────────────────
// Increment PROMPT_VERSION whenever the prompt template changes so that
// stored events carry an accurate record of which prompt produced them.

export const PROMPT_VERSION = 'v2';

// ── Retry / timeout constants ─────────────────────────────────────────────────

const TIMEOUT_MS = 10_000;             // 10 seconds — from spec
const RETRY_DELAYS_MS = [1000, 2000, 4000]; // exponential back-off steps

// ── Gemini client (lazy init — skipped if LLM_API_KEY is absent) ─────────────

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!env.LLM_API_KEY) {
      throw new Error('LLM_API_KEY is not configured.');
    }
    genAI = new GoogleGenerativeAI(env.LLM_API_KEY);
  }
  return genAI;
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(rawMessage: string): string {
  return `You are an assistant that extracts structured event information from campus announcements.
The announcement below may be long (500–1500 words). Read it carefully in full before responding.

Return ONLY a JSON object — no markdown fences, no explanation, no trailing text. Just raw JSON.
Use null for any field you cannot determine with confidence.

Required JSON shape:
{
  "title":                 string | null,    // official event name
  "type":                  "hackathon" | "competition" | "sports" | "workshop" | "seminar" | "other" | null,
  "organizer":             string | null,    // organising dept / club / council
  "deadline":              string | null,    // last date to register — ISO 8601 (e.g. "2026-11-15T00:00:00.000Z")
  "eventDate":             string | null,    // date the event is held — ISO 8601
  "eligibility_branches":  string[] | null,  // e.g. ["CSE","IT"]; null = open to all branches
  "eligibility_years":     number[] | null,  // e.g. [2,3]; null = open to all years; 1–4 only
  "teamSize_min":          number | null,    // minimum team members (integer ≥ 1)
  "teamSize_max":          number | null,    // maximum team members (integer ≥ 1)
  "fee":                   string | null,    // e.g. "₹200", "Free", "Rs. 500"
  "link":                  string | null,    // full registration/info URL starting with https://
  "summary":               string | null     // ≤ 100 words: what the event is, who should apply, key highlights
}

Rules:
- Dates MUST be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ). Convert "15th Nov 2026" → "2026-11-15T00:00:00.000Z".
- If only a date is mentioned with no time, use T00:00:00.000Z.
- For fee: extract the amount exactly as stated. If the announcement says "free", return "Free".
- For eligibility_branches: use standard codes — CSE, IT, ECE, ME, CE, EE, CSIT. Return null (not []) if open to all.
- For eligibility_years: return [1], [2,3], etc. Return null (not []) if open to all years.
- For teamSize: if solo event, return min:1 max:1. If "up to 5", return min:1 max:5.
- The summary should help a student quickly decide if this event is relevant to them.

Announcement text (read fully before responding):
"""
${rawMessage}
"""`;
}


// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    // Gemini 429 rate limit, timeout/abort, network errors
    return (
      msg.includes('429') ||
      msg.includes('rate limit') ||
      msg.includes('quota') ||
      msg.includes('aborted') ||
      msg.includes('timeout') ||
      msg.includes('network') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout')
    );
  }
  return false;
}

/**
 * stripJsonFences — remove markdown code fences that some LLM responses include.
 * e.g. ```json\n{...}\n``` → {...}
 */
function stripJsonFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

// ── LLM call with retry ───────────────────────────────────────────────────────

async function callGeminiWithRetry(prompt: string): Promise<string> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: env.LLM_MODEL });

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      clearTimeout(timeoutId);

      const text = result.response.text();
      if (!text || text.trim() === '') {
        throw new Error('Empty response from LLM');
      }
      return text;
    } catch (err) {
      clearTimeout(timeoutId);

      const isLastAttempt = attempt === RETRY_DELAYS_MS.length;
      if (isLastAttempt) throw err;

      if (isRetryableError(err)) {
        await sleep(RETRY_DELAYS_MS[attempt] ?? 1000);
        continue;
      }
      // Non-retryable error — propagate immediately
      throw err;
    }
  }

  // TypeScript: unreachable, but satisfies return type
  throw new Error('Unreachable: exceeded retry loop');
}

// ── Parse + validate LLM output ───────────────────────────────────────────────

function parseLLMOutput(rawText: string): ReturnType<typeof llmResponseSchema.safeParse> {
  const cleaned = stripJsonFences(rawText);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { success: false, error: new Error('LLM output is not valid JSON') } as ReturnType<typeof llmResponseSchema.safeParse>;
  }
  return llmResponseSchema.safeParse(parsed);
}

// ── Map LLM response → ExtractionResult ──────────────────────────────────────

function mapLLMToResult(llm: ReturnType<typeof llmResponseSchema['parse']>): {
  extracted: ExtractedEventFields;
  uncertainFields: string[];
} {
  const uncertainFields: string[] = [];
  const extracted: ExtractedEventFields = {};

  if (llm.title)      extracted.title    = llm.title;      else uncertainFields.push('title');
  if (llm.type)       extracted.type     = llm.type;       else uncertainFields.push('type');
  if (llm.organizer)  extracted.organizer = llm.organizer; else uncertainFields.push('organizer');
  if (llm.deadline)   extracted.deadline = llm.deadline;   else uncertainFields.push('deadline');
  if (llm.eventDate)  extracted.eventDate = llm.eventDate; else uncertainFields.push('eventDate');
  if (llm.fee)        extracted.fee      = llm.fee;        else uncertainFields.push('fee');
  if (llm.link)       extracted.link     = llm.link;       else uncertainFields.push('link');
  if (llm.summary)    extracted.summary  = llm.summary;    else uncertainFields.push('summary');

  // Eligibility — null from LLM means "open to all" (not uncertain)
  // [] = open to all in the data model.
  // We only mark eligibility as uncertain if the LLM gave a non-null but
  // internally inconsistent value (e.g. one null and one non-null).
  if (llm.eligibility_branches === null && llm.eligibility_years === null) {
    // LLM is confident: open to all branches and all years
    extracted.eligibility = { branches: [], years: [] };
    // Not uncertain — don't push to uncertainFields
  } else if (llm.eligibility_branches !== null || llm.eligibility_years !== null) {
    // At least one side was specified
    extracted.eligibility = {
      branches: llm.eligibility_branches ?? [],
      years:    llm.eligibility_years    ?? [],
    };
  } else {
    // Shouldn't be reached, but treat as uncertain
    uncertainFields.push('eligibility');
  }

  // teamSize — treat as uncertain only if BOTH are null
  if (llm.teamSize_min !== null && llm.teamSize_max !== null) {
    extracted.teamSize = {
      min: llm.teamSize_min!,
      max: llm.teamSize_max!,
    };
  } else if (llm.teamSize_min !== null) {
    extracted.teamSize = { min: llm.teamSize_min!, max: llm.teamSize_min! };
    uncertainFields.push('teamSize');
  } else {
    uncertainFields.push('teamSize');
  }

  return { extracted, uncertainFields };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * llmExtract — call Gemini and return structured extraction result.
 *
 * Never throws to the caller.
 * On any failure (timeout, parse error, API error) → usedFallback: true.
 */
export async function llmExtract(rawMessage: string): Promise<ExtractionResult> {
  if (!env.LLM_API_KEY) {
    return {
      extracted: {},
      uncertainFields: [...ALL_EXTRACTABLE_FIELDS],
      usedFallback: true,
    };
  }

  try {
    const prompt  = buildPrompt(rawMessage);
    const rawText = await callGeminiWithRetry(prompt);
    const parsed  = parseLLMOutput(rawText);

    if (!parsed.success) {
      // Zod validation failed — treat as fallback
      return {
        extracted: {},
        uncertainFields: [...ALL_EXTRACTABLE_FIELDS],
        usedFallback: true,
      };
    }

    const { extracted, uncertainFields } = mapLLMToResult(parsed.data);

    return {
      extracted,
      uncertainFields,
      usedFallback: false,
    };
  } catch {
    // Any unhandled error (network, API key invalid, etc.) → fallback
    return {
      extracted: {},
      uncertainFields: [...ALL_EXTRACTABLE_FIELDS],
      usedFallback: true,
    };
  }
}
