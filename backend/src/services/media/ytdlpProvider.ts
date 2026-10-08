import type { ResolvedMedia } from '../../types/media.js';
import { AppError } from '../../utils/AppError.js';
import { probeMedia, type ProbeResult } from '../../utils/ffmpeg.js';
import type { ParsedInstagramUrl } from '../../utils/instagramUrl.js';
import { logger } from '../../utils/logger.js';
import type { TempWorkspace } from '../../utils/tempFiles.js';
import { buildDownloadOptions } from './downloadOptions.js';
import { firstLine, isInstagramCdnUrl } from './instagramProvider.js';
import type { MaterializePurpose, MediaProvider } from './mediaProvider.js';
import type { YtdlpClient } from './ytdlpClient.js';
import { normalizeFormats, pickVideoEntry, planDownload, previewFormat, summarizeFormats, type ProgressiveProbe } from './ytdlpFormats.js';

const str = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

function isAllowedUrl(value: string | null): value is string {
  if (!value) return false;
  try {
    return isInstagramCdnUrl(new URL(value));
  } catch {
    return false;
  }
}

/**
 * Extracts public Instagram Reels and video posts with yt-dlp (https://github.com/yt-dlp/yt-dlp).
 *
 * - resolve(): `yt-dlp --dump-single-json` (metadata only, no download), then a quick ffprobe of the
 *   preview stream for duration/audio, which yt-dlp does not report for Instagram.
 * - materialize(): downloads the formats chosen from what yt-dlp reported, merging DASH video+audio
 *   with FFmpeg when needed.
 *
 * Never sends cookies or credentials: content that needs a login is reported as unavailable.
 */
export class YtdlpProvider implements MediaProvider {
  readonly name = 'ytdlp';

  constructor(
    private readonly client: Pick<YtdlpClient, 'fetchInfo' | 'download' | 'version'>,
    private readonly probe: (input: string, timeoutMs: number) => Promise<ProbeResult> = probeMedia,
  ) {}

  sampleUrls(): string[] {
    return [];
  }

  isAllowedAssetUrl(url: URL): boolean {
    return isInstagramCdnUrl(url);
  }

  async verifySetup(): Promise<void> {
    const version = await this.client.version();
    if (version) logger.info(`[Media] yt-dlp ${version} ready`);
    else logger.warn('[Media] yt-dlp was not found. Media fetch, downloads and analysis will fail until it is installed (or YTDLP_PATH is set).');
  }

  async resolve(target: ParsedInstagramUrl): Promise<ResolvedMedia> {
    logger.info(`[Media] Fetching metadata for ${target.shortcode}`);
    const info = await this.client.fetchInfo(target.canonicalUrl);

    const picked = pickVideoEntry(info);
    if (!picked) {
      throw new AppError('MEDIA_UNAVAILABLE', 'This post does not contain a video. ClipScript works with Reels and video posts.');
    }
    const { entry, playlistItem } = picked;
    const formats = normalizeFormats(entry.formats);
    logger.info(`[Media] Formats detected: ${formats.length}`);

    const preview = previewFormat(formats);
    if (!preview) {
      throw new AppError('MEDIA_UNAVAILABLE', 'No downloadable video was found for this Reel.');
    }
    const mediaUrl = isAllowedUrl(preview.url) ? preview.url : null;

    let probe: ProbeResult | null = null;
    if (mediaUrl) {
      try {
        probe = await this.probe(mediaUrl, 15_000);
      } catch {
        logger.warn(`[Media] Could not probe the preview stream for ${target.shortcode}; using yt-dlp metadata only.`);
      }
    }
    const progressive: ProgressiveProbe | null =
      probe && preview.kind === 'progressive' ? { width: probe.width, height: probe.height, hasAudio: probe.hasAudio } : null;
    const summary = summarizeFormats(formats, progressive);

    const duration = typeof entry.duration === 'number' && entry.duration > 0 ? Math.round(entry.duration * 10) / 10 : (probe?.duration ?? 0);
    const rawTitle = str(entry.title);
    const thumbnail = str(entry.thumbnail);

    return {
      media: {
        platform: 'instagram',
        type: target.kind === 'post' ? 'post' : 'reel',
        shortcode: target.shortcode,
        originalUrl: target.canonicalUrl,
        // yt-dlp titles Instagram media "Video by <user>"; the caption's first line is more useful.
        title: firstLine(str(entry.description) ?? undefined) ?? firstLine(rawTitle ?? undefined) ?? 'Instagram Reel',
        author: (str(entry.channel) ?? str(entry.uploader) ?? 'Unknown creator').slice(0, 200),
        thumbnailUrl: isAllowedUrl(thumbnail) ? thumbnail : null,
        mediaUrl,
        duration,
        width: summary.width,
        height: summary.height,
        hasAudio: summary.hasAudio,
        downloadOptions: buildDownloadOptions(summary),
        provider: this.name,
      },
      source: { kind: 'ytdlp', url: target.canonicalUrl, mimeType: 'video/mp4', playlistItem, formats, progressive },
    };
  }

  async materialize(resolved: ResolvedMedia, purpose: MaterializePurpose, workspace: TempWorkspace): Promise<string> {
    const { source } = resolved;
    if (source?.kind !== 'ytdlp') {
      throw new AppError('MEDIA_UNAVAILABLE', 'No downloadable media is available for this Reel.');
    }
    const plan = planDownload(source.formats, purpose, source.progressive);
    if (!plan) {
      throw new AppError(
        'FORMAT_UNAVAILABLE',
        purpose === 'mp3' ? 'This Reel has no audio track to export.' : `This Reel is not available in ${purpose === 'analysis' ? 'a playable format' : purpose}.`,
      );
    }
    return this.client.download(source.url, { ...plan, dir: workspace.dir, playlistItem: source.playlistItem });
  }
}
