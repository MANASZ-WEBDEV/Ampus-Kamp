import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import { env } from '@/config/env';
import { apiLimiter } from '@/shared/middleware/rateLimit';
import { errorHandler } from '@/shared/middleware/errorHandler';
import { mountRoutes } from '@/routes';

/**
 * createApp — Express application factory.
 * Returns a configured app without starting the HTTP server.
 * Separated from server.ts so tests can import the app without opening a port.
 */
export function createApp(): express.Application {
  const app = express();

  // ── Security headers ────────────────────────────────────────────────────────
  app.use(
    helmet({
      // Relax CSP in development (Vite HMR, devtools)
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    }),
  );

  // ── CORS ────────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,          // Required for httpOnly cookie
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    }),
  );

  // ── Request ID (trace requests across logs) ─────────────────────────────────
  app.use((req, _res, next) => {
    req.headers['x-request-id'] ??= randomUUID();
    next();
  });

  // ── Structured logging ──────────────────────────────────────────────────────
  app.use(
    morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
      // Skip 2xx in test to keep output clean
      skip: (_req, res) => env.NODE_ENV === 'test' && res.statusCode < 400,
    }),
  );

  // ── Body & cookie parsing ────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  app.use(compression());

  // ── Global API rate limit ────────────────────────────────────────────────────
  app.use('/api', apiLimiter);

  // ── Feature routes ───────────────────────────────────────────────────────────
  mountRoutes(app);

  // ── Global error handler (MUST be last) ─────────────────────────────────────
  app.use(errorHandler);

  return app;
}
