import type { Response } from 'express';
import { asyncHandler } from '@/shared/utils';
import type { AuthRequest } from '@/shared/types';
import * as peopleService from './people.service';
import type { PeopleQuery } from './people.schema';

// ── GET /api/v1/people ────────────────────────────────────────────────────────

export const searchPeople = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const query = req.query as unknown as PeopleQuery;
  const result = await peopleService.searchPeople(req.user, query);
  res.status(200).json({ data: result });
});
