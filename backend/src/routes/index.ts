import { Router } from 'express';
import { createHealthController } from '../controllers/healthController.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import type { AppServices } from '../services/container.js';
import { analysisRoutes } from './analysisRoutes.js';
import { clipRoutes } from './clipRoutes.js';
import { mediaRoutes } from './mediaRoutes.js';

export function apiRouter(services: AppServices): Router {
  const router = Router();
  router.use(apiLimiter);
  router.get('/health', createHealthController(services).health);
  router.use('/media', mediaRoutes(services.media));
  router.use('/analysis', analysisRoutes(services.analysis));
  router.use('/clips', clipRoutes(services.clips, services.exports));
  return router;
}
