import type { Response } from 'express';
import { asyncHandler } from '@/shared/utils';
import type { AuthRequest } from '@/shared/types';
import { ValidationError } from '@/shared/errors';
import { importRoster } from './roster.service';

export const importRosterHandler = asyncHandler<AuthRequest>(
  async (req, res: Response) => {
    if (!req.file) {
      throw new ValidationError('No CSV file uploaded. Use field name "file".');
    }
    const result = await importRoster(req.file.buffer);
    res.status(200).json({ data: result });
  },
);
