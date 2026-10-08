import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { AppError } from './AppError.js';

const MAX_REDIRECTS = 5;

export type UrlGuard = (url: URL) => boolean;

/**
 * fetch() that re-checks every redirect hop against an allowlist so a provider can never be
 * tricked into requesting internal or arbitrary hosts (SSRF protection).
 */
export async function guardedFetch(
  input: string,
  isAllowed: UrlGuard,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  let current = new URL(input);
  const { timeoutMs = 20_000, ...rest } = init;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (current.protocol !== 'https:' && current.protocol !== 'http:') {
      throw new AppError('MEDIA_FETCH_FAILED', 'The media link uses an unsupported protocol.');
    }
    if (!isAllowed(current)) {
      throw new AppError('MEDIA_FETCH_FAILED', 'The media is hosted somewhere ClipScript is not allowed to fetch from.');
    }

    const response = await fetch(current, { ...rest, redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) });
    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      current = new URL(location, current);
      continue;
    }
    return response;
  }
  throw new AppError('MEDIA_FETCH_FAILED', 'The media link redirected too many times.');
}

/** Streams a remote file to disk, aborting once maxBytes is exceeded. */
export async function downloadToFile(
  url: string,
  destination: string,
  isAllowed: UrlGuard,
  maxBytes: number,
): Promise<void> {
  let response: Response;
  try {
    response = await guardedFetch(url, isAllowed, { timeoutMs: 120_000 });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('MEDIA_FETCH_FAILED', 'We could not download this Reel. Please try again in a moment.', { cause: error });
  }

  if (response.status === 403 || response.status === 410) {
    throw new AppError('MEDIA_UNAVAILABLE', 'This media link has expired or is no longer available. Fetch the Reel again.');
  }
  if (!response.ok || !response.body) {
    throw new AppError('MEDIA_FETCH_FAILED', 'We could not download this Reel. Please try again in a moment.');
  }

  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > maxBytes) {
    throw new AppError('MEDIA_TOO_LARGE', 'This video is too large for ClipScript to process.');
  }

  let received = 0;
  const source = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream<Uint8Array>);
  source.on('data', (chunk: Buffer) => {
    received += chunk.length;
    if (received > maxBytes) {
      source.destroy(new AppError('MEDIA_TOO_LARGE', 'This video is too large for ClipScript to process.'));
    }
  });

  try {
    await pipeline(source, createWriteStream(destination));
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('MEDIA_FETCH_FAILED', 'The download was interrupted. Please try again.', { cause: error });
  }
}
