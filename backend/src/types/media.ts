/** "best" is offered only when the source is below 720p, so lower-resolution Reels stay downloadable. */
export type DownloadFormat = '1080p' | '720p' | 'best' | 'mp3';

export interface DownloadOption {
  format: DownloadFormat;
  label: string;
  container: 'mp4' | 'mp3';
}

/** The provider-independent media shape returned to the frontend. */
export interface NormalizedMedia {
  platform: 'instagram';
  type: 'reel' | 'post' | 'video';
  shortcode: string;
  originalUrl: string;
  title: string;
  author: string;
  thumbnailUrl: string | null;
  mediaUrl: string | null;
  /** Duration in seconds, 0 when unknown. */
  duration: number;
  width: number | null;
  height: number | null;
  hasAudio: boolean;
  downloadOptions: DownloadOption[];
  /** Name of the provider that produced this record (e.g. "instagram", "mock"). */
  provider: string;
}

/**
 * One stream an extractor reported for a Reel. Internal only — never sent to clients.
 * "progressive" streams carry both video and (possibly) audio; "video"/"audio" are separate DASH streams.
 */
export interface MediaFormat {
  formatId: string;
  kind: 'progressive' | 'video' | 'audio';
  url: string;
  width: number | null;
  height: number | null;
  /** Total bitrate in kbit/s, 0 when unknown. */
  bitrate: number;
  vcodec: string | null;
  /** null when the extractor could not tell whether the stream has audio. */
  hasAudio: boolean | null;
}

/** Where the actual bytes live. Internal only — never sent to clients. */
export type MediaSource =
  | { kind: 'local'; path: string; mimeType: string }
  | { kind: 'remote'; url: string; mimeType: string }
  /** Downloaded on demand by the yt-dlp provider using format IDs detected during resolve. */
  | {
      kind: 'ytdlp';
      url: string;
      mimeType: string;
      playlistItem: number | null;
      formats: MediaFormat[];
      /** What probing the progressive stream revealed, since yt-dlp reports its size/audio as unknown. */
      progressive: { width: number | null; height: number | null; hasAudio: boolean } | null;
    };

export interface ResolvedMedia {
  media: NormalizedMedia;
  source: MediaSource | null;
}
