/**
 * DEVELOPMENT PROVIDER. Serves generated sample Reels so the complete workflow (preview,
 * downloads, AI analysis, saving) works without Instagram access.
 *
 * Shortcodes containing "private", "removed" or "fail" simulate the matching error states.
 */
import path from 'node:path';
import { DEV_MEDIA_DIR, ensureDevMedia, devVideoPath } from '../../dev/devMediaAssets.js';
import { pickSampleReel, SAMPLE_REELS } from '../../dev/sampleReels.js';
import type { ResolvedMedia } from '../../types/media.js';
import { AppError } from '../../utils/AppError.js';
import type { ParsedInstagramUrl } from '../../utils/instagramUrl.js';
import { buildDownloadOptions } from './downloadOptions.js';
import type { MediaProvider } from './mediaProvider.js';

export const DEV_MEDIA_ROUTE = '/dev-media';

export class MockMediaProvider implements MediaProvider {
  readonly name = 'mock';

  constructor(private readonly publicBaseUrl: string) {}

  sampleUrls(): string[] {
    return [
      ...SAMPLE_REELS.map((sample) => `https://www.instagram.com/reel/${sample.shortcode}/`),
      'https://www.instagram.com/reel/CSprivateDemo/',
    ];
  }

  isAllowedAssetUrl(url: URL): boolean {
    return url.origin === new URL(this.publicBaseUrl).origin && url.pathname.startsWith(`${DEV_MEDIA_ROUTE}/`);
  }

  localAssetPath(url: URL): string | null {
    if (!this.isAllowedAssetUrl(url)) return null;
    const name = path.basename(decodeURIComponent(url.pathname));
    return /^[\w-]+\.(mp4|jpg)$/.test(name) ? path.join(DEV_MEDIA_DIR, name) : null;
  }

  async resolve(target: ParsedInstagramUrl): Promise<ResolvedMedia> {
    const code = target.shortcode.toLowerCase();
    if (code.includes('private')) {
      throw new AppError('PRIVATE_CONTENT', 'This Reel is private or unavailable. ClipScript can only analyze public Reels.');
    }
    if (code.includes('removed')) {
      throw new AppError('MEDIA_UNAVAILABLE', 'This Reel does not exist or has been removed.');
    }
    if (code.includes('fail')) {
      throw new AppError('MEDIA_FETCH_FAILED', 'We could not reach Instagram right now. Please try again in a moment.');
    }

    const sample = pickSampleReel(target.shortcode);
    await ensureDevMedia(sample);

    const hasVideo = true;
    const hasAudio = true;
    return {
      media: {
        platform: 'instagram',
        type: target.kind === 'post' ? 'post' : 'reel',
        shortcode: target.shortcode,
        originalUrl: target.canonicalUrl,
        title: sample.title,
        author: sample.author,
        thumbnailUrl: `${this.publicBaseUrl}${DEV_MEDIA_ROUTE}/${sample.shortcode}.jpg`,
        mediaUrl: `${this.publicBaseUrl}${DEV_MEDIA_ROUTE}/${sample.shortcode}.mp4`,
        duration: sample.duration,
        width: sample.width,
        height: sample.height,
        hasAudio,
        downloadOptions: buildDownloadOptions({ width: sample.width, height: sample.height, hasVideo, hasAudio }),
        provider: this.name,
      },
      source: { kind: 'local', path: devVideoPath(sample), mimeType: 'video/mp4' },
    };
  }

}
