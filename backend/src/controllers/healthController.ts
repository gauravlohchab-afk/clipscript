import type { Request, Response } from 'express';
import type { AppServices } from '../services/container.js';
import { sendSuccess } from '../utils/apiResponse.js';

export function createHealthController(services: AppServices) {
  return {
    health: (_req: Request, res: Response) => {
      sendSuccess(
        res,
        {
          status: services.database.isReady() ? 'ok' : 'degraded',
          database: { mode: services.database.mode, connected: services.database.isReady() },
          providers: { media: services.media.providerName, ai: services.analysis.providerName },
        },
        'ClipScript API is running',
      );
    },
  };
}
