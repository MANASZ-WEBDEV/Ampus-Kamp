import http from 'http';
import { createApp }          from '@/app';
import { connectDB, disconnectDB } from '@/config/db';
import { env }                from '@/config/env';
import { scheduleCloseEvents }    from '@/jobs/closeEvents';
import { scheduleCloseTeamPosts } from '@/jobs/closeTeamPosts';
import { scheduleExpireLinks }    from '@/jobs/expireLinks';

async function main(): Promise<void> {
  // 1. Connect to MongoDB before accepting requests
  await connectDB();

  // 2. Register background jobs
  // Order matters: team posts are closed before links are expired.
  scheduleCloseEvents();      // 00:05 — close published events past deadline
  scheduleCloseTeamPosts();   // 00:05 — expire team posts past event deadline
  scheduleExpireLinks();      // 00:10 — expire pending links past 7-day TTL

  // 3. Build the Express app
  const app = createApp();
  const server = http.createServer(app);

  // 4. Listen
  server.listen(env.PORT, () => {
    console.log(
      JSON.stringify({
        level: 'info',
        message: `🚀  Server running`,
        port: env.PORT,
        env: env.NODE_ENV,
        timestamp: new Date().toISOString(),
      }),
    );
  });

  // ── Graceful shutdown ───────────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    console.log(
      JSON.stringify({
        level: 'info',
        message: `📡  ${signal} received — shutting down gracefully`,
        timestamp: new Date().toISOString(),
      }),
    );

    // Stop accepting new connections; wait for in-flight requests to finish
    server.close(() => {
      console.log(
        JSON.stringify({ level: 'info', message: '🔒  HTTP server closed', timestamp: new Date().toISOString() }),
      );
      disconnectDB()
        .then(() => {
          console.log(
            JSON.stringify({ level: 'info', message: '✅  Graceful shutdown complete', timestamp: new Date().toISOString() }),
          );
          process.exit(0);
        })
        .catch((err) => {
          console.error('Error during DB disconnect:', err);
          process.exit(1);
        });
    });

    // Force-kill after 10 s if still pending
    setTimeout(() => {
      console.error('⚠️  Forced shutdown — 10s timeout exceeded');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Unhandled promise rejection',
        reason: String(reason),
        timestamp: new Date().toISOString(),
      }),
    );
    shutdown('unhandledRejection');
  });
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      level: 'fatal',
      message: '❌  Failed to start server',
      error: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    }),
  );
  process.exit(1);
});
