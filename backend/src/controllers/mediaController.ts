import { pipeline } from 'node:stream/promises';
import type { Request, Response } from 'express';
import { validate } from '../middleware/validate.js';
import type { MediaService } from '../services/media/mediaService.js';
import { assetProxyQuery, downloadMediaBody, fetchMediaBody } from '../types/requests.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

export function createMediaController(media: MediaService) {
  return {
    fetch: async (req: Request, res: Response) => {
      const { url } = validate(fetchMediaBody, req.body);
      const data = await media.fetchMedia(url);
      sendSuccess(res, data, 'Media fetched successfully');
    },

    download: async (req: Request, res: Response) => {
      const { url, format } = validate(downloadMediaBody, req.body);
      const file = await media.prepareDownload(url, format);
      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
      try {
        await pipeline(file.stream, res);
      } catch (error) {
        logger.warn('Download stream interrupted', error instanceof Error ? error.message : error);
      } finally {
        await file.cleanup();
      }
    },

    samples: (_req: Request, res: Response) => {
      sendSuccess(res, { provider: media.providerName, urls: media.sampleUrls() }, 'Sample URLs');
    },

    proxy: async (req: Request, res: Response) => {
      const { src } = validate(assetProxyQuery, req.query);
      const range = typeof req.headers.range === 'string' ? req.headers.range : undefined;
      const asset = await media.proxyAsset(src, range);
      res.status(asset.status).set(asset.headers);
      if (!asset.body) {
        res.end();
        return;
      }
      try {
        await pipeline(asset.body, res);
      } catch {
        // Browsers routinely abort media range requests; nothing to report.
      }
    },
  };
}
