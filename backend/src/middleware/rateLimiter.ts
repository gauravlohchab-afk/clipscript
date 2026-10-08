import rateLimit, { type Options } from 'express-rate-limit';
import { buildFailure } from '../utils/apiResponse.js';

function limiter(windowMs: number, limit: number, message: string) {
  const options: Partial<Options> = {
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    handler: (_req, res) => {
      res.status(429).json(buildFailure('RATE_LIMITED', message));
    },
  };
  return rateLimit(options);
}

export const apiLimiter = limiter(15 * 60 * 1000, 600, 'Too many requests. Please slow down and try again in a few minutes.');
export const mediaLimiter = limiter(60 * 1000, 30, 'Too many media requests. Please wait a minute and try again.');
export const downloadLimiter = limiter(10 * 60 * 1000, 30, 'Download limit reached. Please wait a few minutes.');
export const analysisLimiter = limiter(10 * 60 * 1000, 15, 'Analysis limit reached. Please wait a few minutes before analyzing another Reel.');
