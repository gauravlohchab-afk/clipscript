import axios, { AxiosError } from 'axios';
import type { ApiErrorCode, ApiFailure, ApiSuccess } from '@/types/api';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

/** A normalized, user-presentable error. Raw server/network errors never reach components. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number | null;
  readonly title: string;

  constructor(code: ApiErrorCode, message: string, status: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.title = ERROR_TITLES[code] ?? 'Something went wrong';
  }
}

const ERROR_TITLES: Partial<Record<ApiErrorCode, string>> = {
  VALIDATION_ERROR: 'Check your input',
  INVALID_URL: 'Invalid URL',
  UNSUPPORTED_URL: 'Unsupported link',
  PRIVATE_CONTENT: 'Private content',
  MEDIA_UNAVAILABLE: 'Media unavailable',
  MEDIA_FETCH_FAILED: 'Could not fetch media',
  MEDIA_TOO_LARGE: 'Video too large',
  FORMAT_UNAVAILABLE: 'Format unavailable',
  MEDIA_PROCESSING_FAILED: 'Processing failed',
  AI_FAILED: 'AI analysis failed',
  AI_INVALID_RESPONSE: 'AI analysis incomplete',
  DATABASE_ERROR: 'Library unavailable',
  NOT_FOUND: 'Not found',
  EXPORT_FAILED: 'Export failed',
  RATE_LIMITED: 'Slow down',
  NETWORK_ERROR: 'Connection problem',
  TIMEOUT: 'Request timed out',
};

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

function isApiFailure(value: unknown): value is ApiFailure {
  return typeof value === 'object' && value !== null && (value as { success?: unknown }).success === false && 'message' in value;
}

async function readBlobFailure(blob: Blob): Promise<ApiFailure | null> {
  try {
    const parsed: unknown = JSON.parse(await blob.text());
    return isApiFailure(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function toApiError(error: unknown): Promise<ApiError> {
  if (error instanceof ApiError) return error;
  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError('TIMEOUT', 'The server took too long to respond. Please try again.');
    }
    if (!error.response) {
      return new ApiError('NETWORK_ERROR', 'Cannot reach the ClipScript server. Check your connection and that the API is running.');
    }
    const { status, data } = error.response;
    const failure = data instanceof Blob ? await readBlobFailure(data) : isApiFailure(data) ? data : null;
    if (failure) return new ApiError((failure.error?.code as ApiErrorCode) ?? 'UNKNOWN', failure.message || FALLBACK_MESSAGE, status);
    return new ApiError(status >= 500 ? 'INTERNAL_ERROR' : 'UNKNOWN', FALLBACK_MESSAGE, status);
  }
  return new ApiError('UNKNOWN', FALLBACK_MESSAGE);
}

/** Runs a request that returns the standard envelope and unwraps `data`. */
export async function request<T>(run: () => Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  try {
    const response = await run();
    return response.data.data;
  } catch (error) {
    throw await toApiError(error);
  }
}

/** Runs a request that returns a file. */
export async function requestFile(run: () => Promise<{ data: Blob; headers: Record<string, unknown> }>): Promise<{ blob: Blob; filename: string | null }> {
  try {
    const response = await run();
    const disposition = String(response.headers['content-disposition'] ?? '');
    const match = /filename="?([^"]+)"?/.exec(disposition);
    return { blob: response.data, filename: match?.[1] ?? null };
  } catch (error) {
    throw await toApiError(error);
  }
}
