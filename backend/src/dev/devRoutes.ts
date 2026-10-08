/**
 * DEVELOPMENT ONLY. Serves the generated sample media used by the mock media provider.
 * Mounted by app.ts only when the mock media provider is active.
 */
import express, { type Express } from 'express';
import { DEV_MEDIA_ROUTE } from '../services/media/mockMediaProvider.js';
import { DEV_MEDIA_DIR } from './devMediaAssets.js';

export function mountDevMedia(app: Express): void {
  app.use(
    DEV_MEDIA_ROUTE,
    express.static(DEV_MEDIA_DIR, {
      index: false,
      dotfiles: 'ignore',
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.txt')) res.status(404);
      },
    }),
  );
}
