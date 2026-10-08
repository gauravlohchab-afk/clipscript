import type { DownloadFormat, MediaFormat, MediaSource } from '../../types/media.js';

/** The subset of yt-dlp's `--dump-single-json` output ClipScript reads. Everything is optional: never trust it. */
export interface YtdlpRawFormat {
  format_id?: unknown;
  url?: unknown;
  protocol?: unknown;
  width?: unknown;
  height?: unknown;
  vcodec?: unknown;
  acodec?: unknown;
  tbr?: unknown;
}

export interface YtdlpInfo {
  _type?: unknown;
  id?: unknown;
  title?: unknown;
  description?: unknown;
  uploader?: unknown;
  channel?: unknown;
  duration?: unknown;
  thumbnail?: unknown;
  width?: unknown;
  height?: unknown;
  formats?: unknown;
  entries?: unknown;
}

/** What probing a progressive stream revealed (yt-dlp reports Instagram's progressive MP4s with unknown size/codecs). */
export type ProgressiveProbe = NonNullable<Extract<MediaSource, { kind: 'ytdlp' }>['progressive']>;

export interface FormatPlan {
  /** yt-dlp `-f` selector built only from format IDs yt-dlp itself reported. */
  selector: string;
  /** True when separate video and audio streams must be merged with FFmpeg. */
  merge: boolean;
}

const FORMAT_ID = /^[A-Za-z0-9_.-]{1,64}$/;

const str = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);
const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null);

function codec(value: unknown): string | null | 'none' {
  const text = str(value);
  if (!text) return null;
  return text.toLowerCase() === 'none' ? 'none' : text;
}

/**
 * Normalizes yt-dlp formats into the internal MediaFormat shape.
 * Only plain http(s) streams with a format ID safe to pass back to yt-dlp are kept.
 */
export function normalizeFormats(raw: unknown): MediaFormat[] {
  if (!Array.isArray(raw)) return [];
  const formats: MediaFormat[] = [];
  for (const entry of raw as YtdlpRawFormat[]) {
    const formatId = str(entry?.format_id);
    const url = str(entry?.url);
    const protocol = str(entry?.protocol) ?? '';
    if (!formatId || !FORMAT_ID.test(formatId) || !url || !/^https?$/.test(protocol)) continue;

    const vcodec = codec(entry.vcodec);
    const acodec = codec(entry.acodec);
    let kind: MediaFormat['kind'];
    if (vcodec === 'none' && acodec && acodec !== 'none') kind = 'audio';
    else if (acodec === 'none' && vcodec && vcodec !== 'none') kind = 'video';
    else if (vcodec === 'none') continue; // neither video nor audio
    else kind = 'progressive';

    formats.push({
      formatId,
      kind,
      url,
      width: kind === 'audio' ? null : num(entry.width),
      height: kind === 'audio' ? null : num(entry.height),
      bitrate: num(entry.tbr) ?? 0,
      vcodec: vcodec && vcodec !== 'none' ? vcodec : null,
      // yt-dlp marks Instagram's progressive streams "acodec: none" when the Reel is silent, and leaves it unset otherwise.
      hasAudio: kind === 'audio' ? true : acodec === 'none' ? false : acodec ? true : null,
    });
  }
  return formats;
}

/**
 * Carousel posts come back as playlists. Picks the first entry that has formats and returns
 * its 1-based playlist position (used with `--playlist-items` when downloading).
 */
export function pickVideoEntry(info: YtdlpInfo): { entry: YtdlpInfo; playlistItem: number | null } | null {
  if (info._type !== 'playlist') return { entry: info, playlistItem: null };
  const entries = Array.isArray(info.entries) ? (info.entries as YtdlpInfo[]) : [];
  const index = entries.findIndex((entry) => normalizeFormats(entry?.formats).some((format) => format.kind !== 'audio'));
  return index === -1 ? null : { entry: entries[index] as YtdlpInfo, playlistItem: index + 1 };
}

const shortSide = (format: { width: number | null; height: number | null }): number | null =>
  format.width && format.height ? Math.min(format.width, format.height) : null;

const isAvc = (format: MediaFormat) => Boolean(format.vcodec?.startsWith('avc'));

function bestBy<T>(items: T[], compare: (a: T, b: T) => number): T | null {
  return items.reduce<T | null>((best, item) => (best === null || compare(item, best) < 0 ? item : best), null);
}

/** The best progressive stream (the one most likely to have audio and the highest bitrate). */
export function bestProgressive(formats: MediaFormat[]): MediaFormat | null {
  return bestBy(
    formats.filter((format) => format.kind === 'progressive' && format.hasAudio !== false),
    (a, b) => b.bitrate - a.bitrate || (shortSide(b) ?? 0) - (shortSide(a) ?? 0),
  ) ?? bestBy(formats.filter((format) => format.kind === 'progressive'), (a, b) => b.bitrate - a.bitrate);
}

function bestAudio(formats: MediaFormat[]): MediaFormat | null {
  return bestBy(formats.filter((format) => format.kind === 'audio'), (a, b) => b.bitrate - a.bitrate);
}

/** URL the browser preview plays: a progressive stream when there is one (it has sound), else the best video stream. */
export function previewFormat(formats: MediaFormat[]): MediaFormat | null {
  return (
    bestProgressive(formats) ??
    bestBy(formats.filter((format) => format.kind === 'video'), (a, b) => (shortSide(b) ?? 0) - (shortSide(a) ?? 0) || b.bitrate - a.bitrate)
  );
}

interface VideoCandidate {
  plan: FormatPlan;
  shortSide: number | null;
  width: number | null;
  height: number | null;
  hasAudio: boolean;
  avc: boolean;
  bitrate: number;
}

function videoCandidates(formats: MediaFormat[], probe: ProgressiveProbe | null): VideoCandidate[] {
  const audio = bestAudio(formats);
  const candidates: VideoCandidate[] = formats
    .filter((format) => format.kind === 'video')
    .map((format) => ({
      plan: audio ? { selector: `${format.formatId}+${audio.formatId}`, merge: true } : { selector: format.formatId, merge: false },
      shortSide: shortSide(format),
      width: format.width,
      height: format.height,
      hasAudio: Boolean(audio),
      avc: isAvc(format),
      bitrate: format.bitrate,
    }));

  const progressive = bestProgressive(formats);
  if (progressive) {
    const width = progressive.width ?? probe?.width ?? null;
    const height = progressive.height ?? probe?.height ?? null;
    candidates.push({
      plan: { selector: progressive.formatId, merge: false },
      shortSide: shortSide({ width, height }),
      width,
      height,
      hasAudio: progressive.hasAudio ?? probe?.hasAudio ?? false,
      avc: progressive.vcodec ? isAvc(progressive) : true,
      bitrate: progressive.bitrate,
    });
  }
  return candidates;
}

/** When any stream has audio, silent streams are never chosen for video output. */
function playablePool(candidates: VideoCandidate[]): VideoCandidate[] {
  return candidates.some((candidate) => candidate.hasAudio) ? candidates.filter((candidate) => candidate.hasAudio) : candidates;
}

/**
 * Best resolution and audio availability, used to decide which download options to offer.
 * Uses the same candidate pool as planDownload, so every advertised option can be produced.
 */
export function summarizeFormats(formats: MediaFormat[], probe: ProgressiveProbe | null) {
  const candidates = videoCandidates(formats, probe);
  const largest = bestBy(playablePool(candidates), (a, b) => (b.shortSide ?? 0) - (a.shortSide ?? 0));
  return {
    hasVideo: candidates.length > 0,
    width: largest?.width ?? null,
    height: largest?.height ?? null,
    hasAudio: Boolean(bestAudio(formats)) || candidates.some((candidate) => candidate.hasAudio),
  };
}

/**
 * Chooses which streams to download for a requested output. Format IDs differ per Reel, so the
 * choice is made from the formats yt-dlp reported, never hardcoded:
 * - video: the smallest stream at or above the target (less transcoding), preferring streams with
 *   audio, then H.264, then no merge, then bitrate; "best" takes the largest stream.
 * - mp3: the best audio-only stream, else a progressive stream that has audio.
 * - analysis: like 720p, but falls back to whatever is largest when the Reel is smaller.
 * Returns null when nothing suitable exists.
 */
export function planDownload(
  formats: MediaFormat[],
  purpose: DownloadFormat | 'analysis',
  probe: ProgressiveProbe | null,
): FormatPlan | null {
  if (purpose === 'mp3') {
    const audio = bestAudio(formats);
    if (audio) return { selector: audio.formatId, merge: false };
    const progressive = bestProgressive(formats);
    const hasAudio = progressive && (progressive.hasAudio ?? probe?.hasAudio ?? false);
    return progressive && hasAudio ? { selector: progressive.formatId, merge: false } : null;
  }

  const candidates = videoCandidates(formats, probe);
  if (candidates.length === 0) return null;
  const pool = playablePool(candidates);

  const preference = (a: VideoCandidate, b: VideoCandidate) =>
    Number(b.avc) - Number(a.avc) || Number(a.plan.merge) - Number(b.plan.merge) || b.bitrate - a.bitrate;
  const largest = (a: VideoCandidate, b: VideoCandidate) => (b.shortSide ?? 0) - (a.shortSide ?? 0) || preference(a, b);

  if (purpose === 'best') return bestBy(pool, largest)?.plan ?? null;

  const target = purpose === '1080p' ? 1080 : 720;
  const atLeastTarget = pool.filter((candidate) => (candidate.shortSide ?? 0) >= target);
  const chosen = bestBy(atLeastTarget, (a, b) => (a.shortSide ?? 0) - (b.shortSide ?? 0) || preference(a, b));
  if (chosen) return chosen.plan;
  return purpose === 'analysis' ? (bestBy(pool, largest)?.plan ?? null) : null;
}
