import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { mountDevMedia } from './dev/devRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/index.js';
import type { AppServices } from './services/container.js';

export function createApp(services: AppServices): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(
    helmet({
      // Thumbnails and previews are loaded cross-origin by the frontend.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: env.CLIENT_URL.split(',').map((origin) => origin.trim()),
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      exposedHeaders: ['Content-Disposition'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  if (services.media.providerName === 'mock') {
    mountDevMedia(app);
  }

  app.get('/', (_req, res) => {
    res.json({ success: true, message: 'ClipScript API. See /api/health.', data: {} });
  });
  app.use('/api', apiRouter(services));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
