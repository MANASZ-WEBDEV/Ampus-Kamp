import type { Request, Response, NextFunction } from 'express';
import { validate } from '@/shared/middleware';
import { putSettingsSchema } from './setting.schema';
import { getAllSettings, updateSettings } from './setting.service';

// ── GET /api/v1/settings ──────────────────────────────────────────────────────

export async function getSettings(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await getAllSettings();
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

// ── PUT /api/v1/settings ──────────────────────────────────────────────────────

export const putSettings = [
  validate(putSettingsSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await updateSettings(req.body as Parameters<typeof updateSettings>[0]);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },
];
