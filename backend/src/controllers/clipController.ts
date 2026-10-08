import type { Request, Response } from 'express';
import { validate } from '../middleware/validate.js';
import type { ClipService } from '../services/clips/clipService.js';
import type { ExportService, ExportFile } from '../services/export/exportService.js';
import { clipIdParams, createClipBody, listClipsQuery, updateClipBody } from '../types/requests.js';
import { sendSuccess } from '../utils/apiResponse.js';

function sendFile(res: Response, file: ExportFile) {
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.send(file.body);
}

export function createClipController(clips: ClipService, exports: ExportService) {
  return {
    create: async (req: Request, res: Response) => {
      const body = validate(createClipBody, req.body);
      const { clip, created } = await clips.create(body);
      if (created) sendSuccess(res, clip, 'Clip saved to your library', 201);
      else sendSuccess(res, clip, 'This Reel is already in your library');
    },

    list: async (req: Request, res: Response) => {
      const query = validate(listClipsQuery, req.query);
      sendSuccess(res, await clips.list(query), 'Clips retrieved');
    },

    get: async (req: Request, res: Response) => {
      const { id } = validate(clipIdParams, req.params);
      sendSuccess(res, await clips.get(id), 'Clip retrieved');
    },

    update: async (req: Request, res: Response) => {
      const { id } = validate(clipIdParams, req.params);
      const { isSaved } = validate(updateClipBody, req.body);
      const clip = await clips.setSaved(id, isSaved);
      sendSuccess(res, clip, isSaved ? 'Added to Saved Clips' : 'Removed from Saved Clips');
    },

    remove: async (req: Request, res: Response) => {
      const { id } = validate(clipIdParams, req.params);
      await clips.delete(id);
      sendSuccess(res, { id }, 'Clip deleted');
    },

    exportMarkdown: async (req: Request, res: Response) => {
      const { id } = validate(clipIdParams, req.params);
      sendFile(res, await exports.markdown(id));
    },

    exportJson: async (req: Request, res: Response) => {
      const { id } = validate(clipIdParams, req.params);
      sendFile(res, await exports.json(id));
    },
  };
}
