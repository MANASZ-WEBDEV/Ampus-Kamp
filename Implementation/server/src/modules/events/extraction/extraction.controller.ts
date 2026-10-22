/**
 * extraction.controller.ts — F-3 Paste-to-Post AI Extraction
 *
 * Thin controller: quota check → parallel LLM + regex → merge → respond.
 * All business logic is in llm.service and regex.service.
 *
 * Security:
 *  - requireAuth + requireRole(['faculty', 'dept_head', 'admin']) applied in routes.
 *  - rawMessage is NOT returned in the response (only extracted fields are).
 *  - quota is enforced server-side via AuditLog count.
 */

import type { Response } from 'express';
import { asyncHandler } from '@/shared/utils/asyncHandler';
import { RateLimitError } from '@/shared/errors';
import type { AuthRequest } from '@/shared/types';
import { AuditLog } from '@/models/auditLog.model';
import { getSetting } from '@/models/setting.model';
import { llmExtract } from './llm.service';
import { regexExtract } from './regex.service';
import { ALL_EXTRACTABLE_FIELDS } from './extraction.schema';
import type { ExtractRequest, ExtractionResult } from './extraction.schema';

// ── Quota helpers ─────────────────────────────────────────────────────────────

/**
 * getExtractionLimit — reads the configurable daily quota from Setting.
 * Falls back to 20 if the key hasn't been seeded yet.
 */
async function getExtractionLimit(): Promise<number> {
  return getSetting<number>('extractionsPerDay', 20);
}

/**
 * countTodayExtractions — count how many extraction audit entries this user
 * has created since midnight UTC today.
 */
async function countTodayExtractions(userId: string): Promise<number> {
  const midnight = new Date();
  midnight.setUTCHours(0, 0, 0, 0);

  return AuditLog.countDocuments({
    userId,
    action: 'extraction',
    createdAt: { $gte: midnight },
  });
}

// ── Controller ────────────────────────────────────────────────────────────────

export const extractEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { rawMessage } = req.body as ExtractRequest; // already Zod-validated by middleware
  const actor = req.user;

  // 1. Per-user daily quota check
  const [limit, todayCount] = await Promise.all([
    getExtractionLimit(),
    countTodayExtractions(actor.id),
  ]);

  if (todayCount >= limit) {
    throw new RateLimitError(
      `Daily AI extraction quota reached (${limit}/day). Try again tomorrow.`,
    );
  }

  // 2. Run LLM + regex in parallel (both are non-throwing)
  const [llmResult, regexResult] = await Promise.all([
    llmExtract(rawMessage),
    Promise.resolve(regexExtract(rawMessage)),
  ]);

  // 3. Log the extraction attempt (after calls, regardless of outcome)
  //    We intentionally don't await this — logging failure should not block response.
  AuditLog.create({ userId: actor.id, action: 'extraction' }).catch(() => {
    // Silent — quota counter may be slightly off, but that's acceptable
  });

  // 4. Build final result
  //    Strategy: use LLM result if it succeeded; otherwise merge regex into fallback
  let finalResult: ExtractionResult;

  if (!llmResult.usedFallback) {
    // LLM succeeded — primary result
    finalResult = {
      ...llmResult,
      regexExtracted: regexResult, // included for research comparison
    };
  } else {
    // LLM failed → use regex output, mark all missing fields as uncertain
    const regexFields = regexResult;
    const uncertainFields = [...ALL_EXTRACTABLE_FIELDS].filter(
      (f) => !(f in regexFields),
    );

    finalResult = {
      extracted: regexFields,
      uncertainFields,
      usedFallback: true,
      regexExtracted: regexResult,
    };
  }

  // rawMessage is intentionally NOT returned to client
  res.status(200).json({ data: finalResult });
});
