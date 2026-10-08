import { Router } from 'express';
import { createClipController } from '../controllers/clipController.js';
import type { ClipService } from '../services/clips/clipService.js';
import type { ExportService } from '../services/export/exportService.js';

export function clipRoutes(clips: ClipService, exports: ExportService): Router {
  const controller = createClipController(clips, exports);
  const router = Router();
  router.post('/', controller.create);
  router.get('/', controller.list);
  router.get('/:id', controller.get);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);
  router.get('/:id/export/markdown', controller.exportMarkdown);
  router.get('/:id/export/json', controller.exportJson);
  return router;
}
