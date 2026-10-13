import { Router } from 'express';
import mongoose from 'mongoose';
import { env } from '@/config/env';

export const healthRouter = Router();

/**
 * GET /api/v1/health
 * Public — no auth required.
 *
 * Returns platform status, database state, and last cron run times.
 * The cron run times are updated in-place by each scheduled job (F-2+).
 */
healthRouter.get('/', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus =
    dbState === 1 ? 'connected'
    : dbState === 2 ? 'connecting'
    : dbState === 3 ? 'disconnecting'
    : 'disconnected';

  res.status(200).json({
    data: {
      status: 'ok',
      env: env.NODE_ENV,
      version: '1.0.0-F0',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      // Each scheduled job populates its lastRunAt when it executes (F-2+)
      jobs: {
        closeEvents: null,
        expireLinks: null,
        closeTeamPosts: null,
        lockRegistrations: null,
        deadlineReminders: null,
        spotCheck: null,
      },
    },
  });
});
