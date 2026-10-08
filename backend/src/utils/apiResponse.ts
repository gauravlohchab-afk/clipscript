import type { Response } from 'express';

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

export function sendSuccess<T>(res: Response, data: T, message = 'OK', status = 200): Response {
  const body: ApiSuccess<T> = { success: true, message, data };
  return res.status(status).json(body);
}

export function buildFailure(code: string, message: string, details?: Record<string, unknown>): ApiFailure {
  return { success: false, message, error: details ? { code, details } : { code } };
}
