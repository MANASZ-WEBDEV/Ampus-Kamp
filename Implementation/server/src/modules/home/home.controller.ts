import type { Request, Response, NextFunction } from 'express';
import { getHomeData } from './home.service';

// ── GET /api/v1/home ──────────────────────────────────────────────────────────

export async function getHome(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    // userId always from token — never from query params
    const userId = req.user!.id;
    const data   = await getHomeData(userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
