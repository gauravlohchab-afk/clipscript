import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { AppError, isAppError } from '../utils/AppError.js';
import { buildFailure } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

function isDatabaseError(error: unknown): boolean {
  if (error instanceof mongoose.Error) return true;
  const name = error instanceof Error ? error.name : '';
  return /^Mongo/.test(name);
}

function isBodyParserError(error: unknown): error is { type: string; status: number } {
  return typeof error === 'object' && error !== null && 'type' in error && 'status' in error;
}

/** Converts any thrown error into the standard failure envelope. Raw internals are never sent. */
export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  let appError: AppError;

  if (isAppError(error)) {
    appError = error;
  } else if (isBodyParserError(error) && error.type === 'entity.too.large') {
    appError = new AppError('VALIDATION_ERROR', 'The request is too large.', { status: 413 });
  } else if (isBodyParserError(error) && error.type === 'entity.parse.failed') {
    appError = new AppError('VALIDATION_ERROR', 'The request body is not valid JSON.');
  } else if (isDatabaseError(error)) {
    appError = new AppError('DATABASE_ERROR', 'Your library is temporarily unavailable. Please try again shortly.', { cause: error });
  } else {
    appError = new AppError('INTERNAL_ERROR', 'Something went wrong on our side. Please try again.', { cause: error });
  }

  const logLine = `${req.method} ${req.originalUrl} → ${appError.status} ${appError.code}`;
  if (appError.status >= 500) logger.error(logLine, appError.cause ?? appError);
  else logger.debug(logLine);

  if (res.headersSent) {
    res.end();
    return;
  }
  res.status(appError.status).json(buildFailure(appError.code, appError.message, appError.details));
};

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError('NOT_FOUND', `Route ${req.method} ${req.path} does not exist.`));
};
