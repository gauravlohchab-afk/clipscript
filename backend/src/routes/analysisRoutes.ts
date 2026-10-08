import { Router } from 'express';
import { createAnalysisController } from '../controllers/analysisController.js';
import { analysisLimiter } from '../middleware/rateLimiter.js';
import type { AnalysisService } from '../services/ai/analysisService.js';

export function analysisRoutes(analysis: AnalysisService): Router {
  const controller = createAnalysisController(analysis);
  const router = Router();
  router.post('/analyze', analysisLimiter, controller.analyze);
  return router;
}
