import type { ResolvedMedia } from '../../types/media.js';
import { AppError } from '../../utils/AppError.js';
import type { ParsedInstagramUrl } from '../../utils/instagramUrl.js';
import { logger } from '../../utils/logger.js';
import { probeMedia } from '../../utils/ffmpeg.js';
import { guardedFetch } from '../../utils/safeFetch.js';
import { buildDownloadOptions } from './downloadOptions.js';
import type { MediaProvider } from './mediaProvider.js';

const PAGE_HOSTS = new Set(['www.instagram.com', 'instagram.com']);
const OEMBED_HOST = 'graph.facebook.com';
const CDN_SUFFIXES = ['.cdninstagram.com', '.fbcdn.net'];
const USER_AGENT = 'Mozilla/5.0 (compatible; ClipScriptBot/1.0; +https://github.com/clipscript)';

interface OEmbedResponse {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
}

interface OpenGraph {
  title?: string;
  description?: string;
  image?: string;
  video?: string;
  videoWidth?: number;
  videoHeight?: number;
}

/** Instagram/Facebook CDN hosts that serve public Reel media and thumbnails. */
export function isInstagramCdnUrl(url: URL): boolean {
  return url.protocol === 'https:' && CDN_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix));
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

function readMeta(html: string, property: string): string | undefined {
  const escaped = property.replace(/[.:]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) return decodeEntities(match[1]);
  }
  return undefined;
}

function parseOpenGraph(html: string): OpenGraph {
  const width = Number(readMeta(html, 'og:video:width'));
  const height = Number(readMeta(html, 'og:video:height'));
  return {
    title: readMeta(html, 'og:title'),
    description: readMeta(html, 'og:description'),
    image: readMeta(html, 'og:image'),
    video: readMeta(html, 'og:video:secure_url') ?? readMeta(html, 'og:video'),
    videoWidth: Number.isFinite(width) && width > 0 ? width : undefined,
    videoHeight: Number.isFinite(height) && height > 0 ? height : undefined,
  };
}

/** "Creator Name on Instagram: "caption"" → { author, caption } */
function splitOgTitle(title: string | undefined): { author?: string; caption?: string } {
  if (!title) return {};
  const match = /^(.*?) on Instagram: ["“]?([\s\S]*?)["”]?$/.exec(title);
  if (match) return { author: match[1]?.trim(), caption: match[2]?.trim() };
  return { caption: title };
}

export function firstLine(text: string | undefined, max = 120): string | undefined {
  if (!text) return undefined;
  const line = text.split('\n').map((part) => part.trim()).find(Boolean);
  if (!line) return undefined;
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

/**
 * Fetches publicly available Reel metadata.
 *
 * 1. The official Instagram oEmbed endpoint (requires META_OEMBED_TOKEN) for creator/title/thumbnail.
 * 2. The public Reel page's Open Graph tags, which Instagram exposes to link-preview crawlers.
 *
 * If Instagram requires a login to view the content, the Reel is treated as unavailable.
 * This provider never sends cookies, never logs in, and never tries to work around access controls.
 */
export class InstagramProvider implements MediaProvider {
  readonly name = 'instagram';

  constructor(private readonly oembedToken?: string) {}

  sampleUrls(): string[] {
    return [];
  }

  isAllowedAssetUrl(url: URL): boolean {
    return isInstagramCdnUrl(url);
  }

  async resolve(target: ParsedInstagramUrl): Promise<ResolvedMedia> {
    const [oembed, og] = await Promise.all([this.fetchOEmbed(target), this.fetchOpenGraph(target)]);

    if (!oembed && !og) {
      throw new AppError(
        'MEDIA_UNAVAILABLE',
        'We could not find public media for this Reel. It may be private, deleted, or require a login to view.',
      );
    }

    const { author: ogAuthor, caption } = splitOgTitle(og?.title);
    const mediaUrl = og?.video && isInstagramCdnUrl(new URL(og.video)) ? og.video : null;
    const thumbnailUrl = oembed?.thumbnail_url ?? og?.image ?? null;

    let probe = { duration: 0, width: og?.videoWidth ?? null, height: og?.videoHeight ?? null, hasAudio: Boolean(mediaUrl), hasVideo: Boolean(mediaUrl) };
    if (mediaUrl) {
      try {
        probe = await probeMedia(mediaUrl, 15_000);
      } catch {
        logger.warn(`Could not probe Instagram media for ${target.shortcode}; using Open Graph dimensions.`);
      }
    }

    return {
      media: {
        platform: 'instagram',
        type: target.kind === 'post' ? 'post' : 'reel',
        shortcode: target.shortcode,
        originalUrl: target.canonicalUrl,
        title: firstLine(oembed?.title) ?? firstLine(caption) ?? firstLine(og?.description) ?? 'Instagram Reel',
        author: oembed?.author_name ?? ogAuthor ?? 'Unknown creator',
        thumbnailUrl,
        mediaUrl,
        duration: probe.duration,
        width: probe.width,
        height: probe.height,
        hasAudio: probe.hasAudio,
        downloadOptions: mediaUrl ? buildDownloadOptions(probe) : [],
        provider: this.name,
      },
      source: mediaUrl ? { kind: 'remote', url: mediaUrl, mimeType: 'video/mp4' } : null,
    };
  }

  private async fetchOEmbed(target: ParsedInstagramUrl): Promise<OEmbedResponse | null> {
    if (!this.oembedToken) return null;
    const url = new URL('https://graph.facebook.com/v21.0/instagram_oembed');
    url.searchParams.set('url', target.canonicalUrl);
    url.searchParams.set('access_token', this.oembedToken);
    url.searchParams.set('omitscript', 'true');

    try {
      const response = await guardedFetch(url.toString(), (candidate) => candidate.hostname === OEMBED_HOST);
      if (response.ok) return (await response.json()) as OEmbedResponse;
      if (response.status === 400 || response.status === 404) {
        // Meta returns 400 for private, deleted, or age-restricted content.
        throw new AppError('PRIVATE_CONTENT', 'This Reel is private or unavailable. ClipScript can only analyze public Reels.');
      }
      logger.warn(`Instagram oEmbed returned ${response.status}`);
      return null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.warn('Instagram oEmbed request failed', error);
      return null;
    }
  }

  private async fetchOpenGraph(target: ParsedInstagramUrl): Promise<OpenGraph | null> {
    try {
      const response = await guardedFetch(target.canonicalUrl, (candidate) => PAGE_HOSTS.has(candidate.hostname), {
        headers: { 'user-agent': USER_AGENT, accept: 'text/html', 'accept-language': 'en' },
      });
      if (response.status === 404) {
        throw new AppError('MEDIA_UNAVAILABLE', 'This Reel does not exist or has been removed.');
      }
      if (!response.ok) return null;
      const finalUrl = new URL(response.url || target.canonicalUrl);
      if (finalUrl.pathname.startsWith('/accounts/login')) return null;

      const og = parseOpenGraph(await response.text());
      return og.title || og.image || og.video ? og : null;
    } catch (error) {
      if (error instanceof AppError) {
        // A redirect off Instagram (e.g. to a login wall on another host) means no public data.
        if (error.code === 'MEDIA_FETCH_FAILED') return null;
        throw error;
      }
      logger.warn('Instagram page request failed', error);
      throw new AppError('MEDIA_FETCH_FAILED', 'We could not reach Instagram right now. Please try again in a moment.', { cause: error });
    }
  }
}
