import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { createServices } from './services/bootstrap.js';
import { isFfmpegAvailable } from './utils/ffmpeg.js';
import { logger } from './utils/logger.js';
import { sweepStaleWorkspaces } from './utils/tempFiles.js';

async function main(): Promise<void> {
  if (!(await isFfmpegAvailable())) {
    logger.warn('FFmpeg was not found on PATH. Analysis and downloads will fail until it is installed (or FFMPEG_PATH is set).');
  }

  const swept = await sweepStaleWorkspaces();
  if (swept > 0) logger.info(`[Media] Removed ${swept} stale temporary workspace(s)`);

  const database = await connectDatabase();
  const services = createServices(database);
  await services.media.verifySetup();
  const app = createApp(services);

  const server = app.listen(env.PORT, () => {
    logger.info(`ClipScript API listening on http://localhost:${env.PORT}`);
    logger.info(
      `Providers → media: ${services.media.providerName}, ai: ${services.analysis.providerName}, database: ${database.mode}`,
    );
  });
  // Analysis of long Reels can take a while; keep sockets open long enough.
  server.requestTimeout = 5 * 60 * 1000;

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down…`);
    server.close(() => {
      database
        .disconnect()
        .catch((error: unknown) => logger.error('Error while disconnecting the database', error))
        .finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  logger.error('ClipScript API failed to start', error);
  process.exit(1);
});
