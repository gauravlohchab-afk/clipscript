import { Router } from 'express';
import { createMediaController } from '../controllers/mediaController.js';
import { downloadLimiter, mediaLimiter } from '../middleware/rateLimiter.js';
import type { MediaService } from '../services/media/mediaService.js';

export function mediaRoutes(media: MediaService): Router {
  const controller = createMediaController(media);
  const router = Router();
  router.post('/fetch', mediaLimiter, controller.fetch);
  router.post('/download', downloadLimiter, controller.download);
  router.get('/samples', controller.samples);
  router.get('/proxy', controller.proxy);
  return router;
}
