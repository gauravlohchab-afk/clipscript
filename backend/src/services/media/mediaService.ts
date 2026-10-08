import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import type { DownloadFormat, NormalizedMedia, ResolvedMedia } from '../../types/media.js';
import { AppError } from '../../utils/AppError.js';
import { parseInstagramUrl } from '../../utils/instagramUrl.js';
import { logger } from '../../utils/logger.js';
import { guardedFetch } from '../../utils/safeFetch.js';
import { createTempWorkspace, type TempWorkspace } from '../../utils/tempFiles.js';
import { materializeSource, transcodeForDownload } from './mediaProcessor.js';
import { captureThumbnail } from './thumbnailCapture.js';
import type { MaterializePurpose, MediaProvider } from './mediaProvider.js';

export interface PreparedDownload {
  stream: Readable;
  filename: string;
  contentType: string;
  cleanup: () => Promise<void>;
}

export interface ProxiedAsset {
  status: number;
  headers: Record<string, string>;
  body: Readable | null;
}

const PROXY_PASSTHROUGH_HEADERS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag'];
const PROXY_CONTENT_TYPES = /^(image|video|audio)\//;

function slugify(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '-')
      .slice(0, 60) || 'reel'
  );
}

/**
 * The only entry point the rest of the backend uses for media. Controllers and the analysis
 * pipeline never talk to a provider directly, so providers can be swapped without changes here.
 */
export class MediaService {
  constructor(private readonly provider: MediaProvider) {}

  get providerName(): string {
    return this.provider.name;
  }

  sampleUrls(): string[] {
    return this.provider.sampleUrls();
  }

  verifySetup(): Promise<void> {
    return this.provider.verifySetup?.() ?? Promise.resolve();
  }

  async resolve(url: string): Promise<ResolvedMedia> {
    const target = parseInstagramUrl(url);
    return this.provider.resolve(target);
  }

  async fetchMedia(url: string): Promise<NormalizedMedia> {
    const { media } = await this.resolve(url);
    return media;
  }

  isAllowedAssetUrl = (url: URL): boolean => this.provider.isAllowedAssetUrl(url);

  /** Writes the media for a download format or for analysis into the workspace and returns the file path. */
  async materialize(resolved: ResolvedMedia, purpose: MaterializePurpose, workspace: TempWorkspace): Promise<string> {
    if (this.provider.materialize) return this.provider.materialize(resolved, purpose, workspace);
    if (!resolved.source) {
      throw new AppError('MEDIA_UNAVAILABLE', 'No downloadable media is available for this Reel.');
    }
    return materializeSource(resolved.source, workspace, this.isAllowedAssetUrl);
  }

  captureThumbnail(url: string): Promise<string | null> {
    let local: string | null;
    try {
      local = this.provider.localAssetPath?.(new URL(url)) ?? null;
    } catch {
      return Promise.resolve(null);
    }
    return captureThumbnail(url, this.isAllowedAssetUrl, local);
  }

  /** Produces a temporary file in the requested format. The caller must call cleanup() once streamed. */
  async prepareDownload(url: string, format: DownloadFormat): Promise<PreparedDownload> {
    const resolved = await this.resolve(url);
    const { media, source } = resolved;
    if (!source) {
      throw new AppError('MEDIA_UNAVAILABLE', 'No downloadable media is available for this Reel.');
    }
    if (!media.downloadOptions.some((option) => option.format === format)) {
      throw new AppError('FORMAT_UNAVAILABLE', `This Reel is not available as ${format.toUpperCase()}.`);
    }

    const workspace = await createTempWorkspace('clipscript-dl-');
    const cleanup = async () => {
      await workspace.cleanup().catch((error: unknown) => logger.warn('[Media] Temp cleanup failed', error));
      logger.debug('[Media] Temporary files cleaned');
    };
    try {
      const input = await this.materialize(resolved, format, workspace);
      logger.info(`[Media] FFmpeg processing (${format})`);
      const output = await transcodeForDownload(input, format, workspace);
      const suffix = format === 'mp3' ? '' : `-${format}`;
      return {
        stream: createReadStream(output.path),
        filename: `${slugify(`${media.author}-${media.shortcode}`)}${suffix}.${output.extension}`,
        contentType: output.contentType,
        cleanup,
      };
    } catch (error) {
      await cleanup();
      throw error;
    }
  }

  /**
   * Streams a thumbnail/video from an allowlisted provider host. Browsers often cannot load
   * platform CDN assets directly (cross-origin resource policies), so previews go through here.
   */
  async proxyAsset(src: string, range?: string): Promise<ProxiedAsset> {
    let url: URL;
    try {
      url = new URL(src);
    } catch {
      throw new AppError('VALIDATION_ERROR', 'Invalid asset URL.');
    }
    if (!this.isAllowedAssetUrl(url)) {
      throw new AppError('VALIDATION_ERROR', 'This asset cannot be loaded through ClipScript.');
    }

    let response: Response;
    try {
      response = await guardedFetch(url.toString(), this.isAllowedAssetUrl, {
        headers: range ? { range } : {},
        timeoutMs: 30_000,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('MEDIA_FETCH_FAILED', 'The preview could not be loaded.', { cause: error });
    }

    if (response.status === 403 || response.status === 410) {
      throw new AppError('MEDIA_UNAVAILABLE', 'This preview link has expired. Fetch the Reel again to refresh it.');
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok || !PROXY_CONTENT_TYPES.test(contentType)) {
      throw new AppError('MEDIA_FETCH_FAILED', 'The preview could not be loaded.');
    }

    const headers: Record<string, string> = { 'cache-control': 'private, max-age=600' };
    for (const name of PROXY_PASSTHROUGH_HEADERS) {
      const value = response.headers.get(name);
      if (value) headers[name] = value;
    }
    return {
      status: response.status,
      headers,
      body: response.body ? Readable.fromWeb(response.body as import('node:stream/web').ReadableStream<Uint8Array>) : null,
    };
  }
}
