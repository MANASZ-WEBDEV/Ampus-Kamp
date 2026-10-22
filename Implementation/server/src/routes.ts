import type { Application } from 'express';
import { healthRouter }  from '@/modules/health/health.routes';
import { authRouter }    from '@/modules/auth/auth.routes';
import { usersRouter }   from '@/modules/users/user.routes';
import { rosterRouter }  from '@/modules/roster/roster.routes';
import { eventsRouter }  from '@/modules/events/event.routes';
import { teamsRouter }   from '@/modules/teams/team.routes';
import { linksRouter }   from '@/modules/links/link.routes';
import { peopleRouter }        from '@/modules/people/people.routes';
import { safetyRouter }        from '@/modules/safety/safety.routes';
import { registrationsRouter } from '@/modules/registrations/registration.routes';

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
        version: '1.0.0-F6',
        status: 'running',
        hint: 'Open http://localhost:5173 for the web client.',
        endpoints: {
          health:     'GET /api/v1/health',
          auth:       'POST /api/v1/auth/register | login | verify-otp | resend-otp | logout',
          users:      'GET /api/v1/users/me | PUT /api/v1/users/me | GET /api/v1/users/:id',
          rosterImport: 'POST /api/v1/roster/import (admin)',
          events:     'GET /api/v1/events | GET /api/v1/events/my | GET /api/v1/events/:id | POST /api/v1/events | PUT /api/v1/events/:id | PATCH /api/v1/events/:id/publish | PATCH /api/v1/events/:id/close | DELETE /api/v1/events/:id | POST /api/v1/events/:id/bookmark',
          extraction: 'POST /api/v1/events/extract (faculty+) — AI Paste-to-Post',
          teams:      'GET /api/v1/events/:id/teams | GET /api/v1/teams/my | POST /api/v1/teams | PATCH /api/v1/teams/:id',
          links:      'GET /api/v1/links?box=in|out | POST /api/v1/links | PATCH /api/v1/links/:id',
          people:     'GET /api/v1/people?skills=&branch=&year=&eventId=',
          looking:    'PUT /api/v1/events/:id/looking | GET /api/v1/events/:id/looking',
          blocks:         'GET /api/v1/blocks | POST /api/v1/blocks | DELETE /api/v1/blocks/:blockedUserId',
          reports:        'POST /api/v1/reports',
          registrations:  'POST /api/v1/events/:id/registrations | PATCH /api/v1/registrations/:id | PATCH /api/v1/registrations/:id/members/:uid | GET /api/v1/registrations/mine',
          eventRoster:    'GET /api/v1/events/:id/registrations | GET /api/v1/events/:id/registrations/export (faculty+)',
          tracking:       'POST /api/v1/events/:id/tracking',
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

  // ── F-4: Team Finder — Posts & Requests ──────────────────────────────────
  app.use('/api/v1/teams', teamsRouter);
  app.use('/api/v1/links', linksRouter);

  // ── F-5: People, Looking, Safety ──────────────────────────────────────────
  app.use('/api/v1/people', peopleRouter);
  // safety router defines /blocks and /reports paths internally
  app.use('/api/v1',        safetyRouter);
  // looking routes mounted on eventsRouter as /:id/looking (in event.routes.ts)

  // ── F-6: Registrations ────────────────────────────────────────────────────
  // /mine, /:id, /:id/members/:uid — student routes
  // Event-scoped: create/roster/export/tracking live on eventsRouter
  app.use('/api/v1/registrations', registrationsRouter);

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
