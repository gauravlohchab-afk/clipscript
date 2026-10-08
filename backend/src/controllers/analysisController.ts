import type { Request, Response } from 'express';
import { validate } from '../middleware/validate.js';
import type { AnalysisService } from '../services/ai/analysisService.js';
import { analyzeBody } from '../types/requests.js';
import { sendSuccess } from '../utils/apiResponse.js';

export function createAnalysisController(analysis: AnalysisService) {
  return {
    analyze: async (req: Request, res: Response) => {
      const { url } = validate(analyzeBody, req.body);
      const result = await analysis.analyze(url);
      sendSuccess(res, result, 'Analysis complete');
    },
  };
}
