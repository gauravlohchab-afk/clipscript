import type { z } from 'zod';
import { AppError } from '../utils/AppError.js';

/** Parses untrusted input with a Zod schema, throwing a user-friendly VALIDATION_ERROR on failure. */
export function validate<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || 'body';
    fields[key] ??= issue.message;
  }
  const first = result.error.issues[0];
  const message = first && first.path.length <= 1 ? first.message : 'Some of the submitted data is invalid.';
  throw new AppError('VALIDATION_ERROR', message, { details: { fields } });
}
