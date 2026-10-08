export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_URL'
  | 'UNSUPPORTED_URL'
  | 'PRIVATE_CONTENT'
  | 'MEDIA_UNAVAILABLE'
  | 'MEDIA_FETCH_FAILED'
  | 'MEDIA_TOO_LARGE'
  | 'FORMAT_UNAVAILABLE'
  | 'MEDIA_PROCESSING_FAILED'
  | 'AI_FAILED'
  | 'AI_INVALID_RESPONSE'
  | 'DATABASE_ERROR'
  | 'NOT_FOUND'
  | 'EXPORT_FAILED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

const defaultStatus: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  INVALID_URL: 400,
  UNSUPPORTED_URL: 422,
  PRIVATE_CONTENT: 403,
  MEDIA_UNAVAILABLE: 404,
  MEDIA_FETCH_FAILED: 502,
  MEDIA_TOO_LARGE: 413,
  FORMAT_UNAVAILABLE: 422,
  MEDIA_PROCESSING_FAILED: 500,
  AI_FAILED: 502,
  AI_INVALID_RESPONSE: 502,
  DATABASE_ERROR: 503,
  NOT_FOUND: 404,
  EXPORT_FAILED: 500,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

/**
 * An error whose message is safe to show to end users.
 * Anything that is not an AppError is treated as internal and never exposed.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    options: { status?: number; details?: Record<string, unknown>; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.status = options.status ?? defaultStatus[code];
    this.details = options.details;
  }
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;
