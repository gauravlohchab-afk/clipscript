export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiFailure {
  success: false;
  message: string;
  error: { code: string; details?: Record<string, unknown> };
}

export type ApiErrorCode =
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
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN';
