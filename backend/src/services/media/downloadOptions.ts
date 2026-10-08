import type { DownloadOption } from '../../types/media.js';

interface StreamInfo {
  width: number | null;
  height: number | null;
  hasVideo: boolean;
  hasAudio: boolean;
}

/**
 * Only advertises formats the source can actually produce (no upscaling, no audio from silent clips).
 * Sources below 720p (or of unknown size) get a single "best available" MP4 instead of nothing.
 */
export function buildDownloadOptions({ width, height, hasVideo, hasAudio }: StreamInfo): DownloadOption[] {
  const options: DownloadOption[] = [];
  const shortSide = width && height ? Math.min(width, height) : null;

  if (hasVideo) {
    if (shortSide !== null && shortSide >= 1080) options.push({ format: '1080p', label: 'MP4 · 1080p', container: 'mp4' });
    if (shortSide !== null && shortSide >= 720) options.push({ format: '720p', label: 'MP4 · 720p', container: 'mp4' });
    if (shortSide === null || shortSide < 720) {
      options.push({ format: 'best', label: shortSide ? `MP4 · ${shortSide}p (best available)` : 'MP4 · Best available', container: 'mp4' });
    }
  }
  if (hasAudio) options.push({ format: 'mp3', label: 'Audio · MP3', container: 'mp3' });
  return options;
}
