import type { Application } from 'express';
import { healthRouter } from '@/modules/health/health.routes';
import { authRouter } from '@/modules/auth/auth.routes';
import { usersRouter } from '@/modules/users/user.routes';
import { rosterRouter } from '@/modules/roster/roster.routes';
import { eventsRouter } from '@/modules/events/event.routes';

/**
 * mountRoutes — registers all feature routers on the app.
 *
 * Convention: every route module is prefixed with /api/v1/.
 * Add new feature routers here as they are built (F-1 through F-10).
 */
export function mountRoutes(app: Application): void {
  // ── Root info route — visible when someone opens localhost:5000 in a browser
  app.get('/', (_req, res) => {
    res.status(200).json({
      data: {
        name: 'Campus Innovation Platform — API Server',
        version: '1.0.0-F2',
        status: 'running',
        hint: 'Open http://localhost:5173 for the web client.',
        endpoints: {
          health: 'GET /api/v1/health',
          auth: 'POST /api/v1/auth/register | login | verify-otp | resend-otp | logout',
          users: 'GET /api/v1/users/me | PUT /api/v1/users/me | GET /api/v1/users/:id',
          roster: 'POST /api/v1/roster/import (admin)',
          events: 'GET /api/v1/events | GET /api/v1/events/my | GET /api/v1/events/:id | POST /api/v1/events | PUT /api/v1/events/:id | PATCH /api/v1/events/:id/publish | PATCH /api/v1/events/:id/close | DELETE /api/v1/events/:id | POST /api/v1/events/:id/bookmark',
        },
      },
    });
  });

  // ── F-0: Health check ──────────────────────────────────────────────────────
  app.use('/api/v1/health', healthRouter);

  // ── F-1: Auth & Profiles ──────────────────────────────────────────────────
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/roster', rosterRouter);

  // ── F-2: Events ───────────────────────────────────────────────────────────
  app.use('/api/v1/events', eventsRouter);

  // ── F-3: Extraction (mounted on /events/extract inside eventsRouter) ──────

  // ── F-4: Teams ────────────────────────────────────────────────────────────
  // app.use('/api/v1/teams', teamsRouter);
  // app.use('/api/v1/links', linksRouter);

  // ── F-5: People, Looking, Safety ──────────────────────────────────────────
  // app.use('/api/v1/people', peopleRouter);
  // app.use('/api/v1/blocks', blocksRouter);
  // app.use('/api/v1/reports', reportsRouter);

  // ── F-6: Registrations ────────────────────────────────────────────────────
  // app.use('/api/v1/registrations', registrationsRouter);

  // ── F-7: Credentials & Participations ────────────────────────────────────
  // app.use('/api/v1/courses', coursesRouter);
  // app.use('/api/v1/credentials', credentialsRouter);
  // app.use('/api/v1/participations', participationsRouter);

  // ── F-8: Analytics ────────────────────────────────────────────────────────
  // app.use('/api/v1/analytics', analyticsRouter);

  // ── F-9: Notifications, Push, Home ────────────────────────────────────────
  // app.use('/api/v1/home', homeRouter);
  // app.use('/api/v1/notifications', notificationsRouter);
  // app.use('/api/v1/push', pushRouter);

  // ── F-10: Admin & Settings ────────────────────────────────────────────────
  // app.use('/api/v1/admin', adminRouter);
  // app.use('/api/v1/settings', settingsRouter);

  // ── 404 for unknown /api/* paths ──────────────────────────────────────────
  app.use('/api/*', (_req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'API endpoint not found.' },
    });
  });
}
