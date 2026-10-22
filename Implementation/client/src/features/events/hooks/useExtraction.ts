import { useMutation } from '@tanstack/react-query';
import { extractEvent } from '../api/events.api';
import type { ExtractionResult } from '../types';

/**
 * useExtraction — TanStack Query mutation for POST /events/extract.
 *
 * Usage:
 *   const { mutateAsync, isPending, error } = useExtraction();
 *   const result = await mutateAsync(rawMessage);
 *
 * Error handling:
 *   - 429 → quota exceeded (show "try again tomorrow" banner)
 *   - 503 → LLM_API_KEY not configured (show "fill manually" fallback)
 *   - Other → generic error message
 */
export function useExtraction() {
  return useMutation<ExtractionResult, Error, string>({
    mutationFn: (rawMessage: string) => extractEvent(rawMessage),
    // No cache invalidation needed — extraction is stateless (no DB write here)
  });
}
