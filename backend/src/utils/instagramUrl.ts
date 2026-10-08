import { AppError } from './AppError.js';

export type InstagramContentKind = 'reel' | 'post' | 'tv';

export interface ParsedInstagramUrl {
  shortcode: string;
  kind: InstagramContentKind;
  /** Canonical, tracking-free URL used for de-duplication. */
  canonicalUrl: string;
}

const INSTAGRAM_HOSTS = new Set(['instagram.com', 'www.instagram.com', 'm.instagram.com', 'instagr.am', 'www.instagr.am']);
const PATH_PATTERN = /^\/(?:[\w.]+\/)?(reels?|p|tv)\/([A-Za-z0-9_-]{5,64})\/?$/;

/**
 * Validates and normalizes an Instagram Reel/post URL.
 * Throws INVALID_URL for malformed input and UNSUPPORTED_URL for valid URLs ClipScript cannot analyze.
 */
export function parseInstagramUrl(input: string): ParsedInstagramUrl {
  const raw = input.trim();
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new AppError('INVALID_URL', 'That does not look like a valid URL. Paste a link like https://www.instagram.com/reel/ABC123/.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new AppError('INVALID_URL', 'Only http and https links are supported.');
  }

  const host = url.hostname.toLowerCase();
  if (!INSTAGRAM_HOSTS.has(host)) {
    throw new AppError('UNSUPPORTED_URL', 'ClipScript currently supports Instagram Reels only. Paste an instagram.com/reel/... link.');
  }

  const path = url.pathname.replace(/\/{2,}/g, '/');
  if (/^\/stories\//.test(path)) {
    throw new AppError('UNSUPPORTED_URL', 'Instagram Stories are not supported. Paste a public Reel link instead.');
  }

  const match = PATH_PATTERN.exec(path);
  if (!match) {
    throw new AppError('UNSUPPORTED_URL', 'This Instagram link is not a Reel. Open the Reel, tap Share → Copy link, and paste it here.');
  }

  const segment = match[1] ?? 'reel';
  const shortcode = match[2] ?? '';
  const kind: InstagramContentKind = segment.startsWith('reel') ? 'reel' : segment === 'tv' ? 'tv' : 'post';
  const canonicalSegment = kind === 'post' ? 'p' : kind;

  return {
    shortcode,
    kind,
    canonicalUrl: `https://www.instagram.com/${canonicalSegment}/${shortcode}/`,
  };
}
