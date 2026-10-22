import { z } from 'zod';

// ── GET /api/v1/people ───────────────────────────────────────────────────────
//
// SDE3 note on eventId:
//   `eventId` is optional at the transport layer, but the client ALWAYS
//   passes it when navigating from EventDetailPage (URL: /teams/people?eventId=xxx).
//   When present, the service performs a single batched LookingFlag query to
//   annotate each result with isLooking — one DB round-trip for the whole page,
//   not N queries. When absent, isLooking is omitted from the response.

export const peopleQuerySchema = z.object({
  skills:  z.string().optional(), // comma-separated: "react,ml,python"
  branch:  z.string().optional(), // dept code: "CSE", "ECE"
  year:    z.coerce.number().int().min(1).max(5).optional(),
  eventId: z.string().optional(), // enables isLooking annotation
  limit:   z.coerce.number().int().min(1).max(50).default(20),
  cursor:  z.string().optional(), // ObjectId-based cursor for keyset pagination
});

export type PeopleQuery = z.infer<typeof peopleQuerySchema>;
