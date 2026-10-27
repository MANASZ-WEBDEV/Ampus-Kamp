import type { Request, Response, NextFunction } from 'express';
import { listQuerySchema, idParamSchema }        from './notification.schema';
import { getNotifications, markRead }            from './notification.service';

// ── GET /api/v1/notifications ─────────────────────────────────────────────────

export async function listNotifications(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query  = listQuerySchema.parse(req.query);
    // userId always from token — never from query param
    const userId = req.user!.id;

    const result = await getNotifications(userId, query.cursor, query.limit);

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/v1/notifications/:id/read ─────────────────────────────────────

export async function markNotificationRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = idParamSchema.parse(req.params);
    const userId = req.user!.id;

    await markRead(userId, id);

    res.json({ data: {} });
  } catch (err) {
    next(err);
  }
}
