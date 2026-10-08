export type DownloadFormat = '1080p' | '720p' | 'best' | 'mp3';

export interface DownloadOption {
  format: DownloadFormat;
  label: string;
  container: 'mp4' | 'mp3';
}

export interface Media {
  platform: 'instagram';
  type: 'reel' | 'post' | 'video';
  shortcode: string;
  originalUrl: string;
  title: string;
  author: string;
  thumbnailUrl: string | null;
  mediaUrl: string | null;
  duration: number;
  width: number | null;
  height: number | null;
  hasAudio: boolean;
  downloadOptions: DownloadOption[];
  provider: string;
}

export interface SampleUrls {
  provider: string;
  urls: string[];
}
