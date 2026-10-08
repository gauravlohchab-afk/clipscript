import { copyFile } from 'node:fs/promises';
import { maxMediaBytes } from '../../config/env.js';
import type { DownloadFormat, MediaSource } from '../../types/media.js';
import { AppError } from '../../utils/AppError.js';
import { probeMedia, runFfmpeg, type ProbeResult } from '../../utils/ffmpeg.js';
import { downloadToFile, type UrlGuard } from '../../utils/safeFetch.js';
import type { TempWorkspace } from '../../utils/tempFiles.js';

export interface PreparedVideo {
  path: string;
  mimeType: string;
  probe: ProbeResult;
}

/** Copies or downloads the media into the request's temp workspace. */
export async function materializeSource(source: MediaSource, workspace: TempWorkspace, isAllowed: UrlGuard): Promise<string> {
  const target = workspace.file('source.mp4');
  if (source.kind === 'local') {
    await copyFile(source.path, target);
  } else if (source.kind === 'remote') {
    await downloadToFile(source.url, target, isAllowed, maxMediaBytes);
  } else {
    // yt-dlp sources point at the Reel page, not a media file; only their provider can download them.
    throw new AppError('MEDIA_PROCESSING_FAILED', 'We could not process this video. Please try again or use a different Reel.', {
      cause: new Error(`Source kind "${source.kind}" must be materialized by its provider`),
    });
  }
  return target;
}

/**
 * Normalizes a video for AI analysis: H.264/AAC MP4, at most 720p on the short side.
 * Smaller uploads are faster and cheaper while keeping on-screen text legible.
 */
export async function prepareForAnalysis(inputPath: string, workspace: TempWorkspace): Promise<PreparedVideo> {
  const probe = await probeMedia(inputPath);
  if (!probe.hasVideo) {
    throw new AppError('MEDIA_UNAVAILABLE', 'This Reel does not contain a playable video.');
  }

  const shortSide = probe.width && probe.height ? Math.min(probe.width, probe.height) : 0;
  if (shortSide > 0 && shortSide <= 720) {
    return { path: inputPath, mimeType: 'video/mp4', probe };
  }

  const output = workspace.file('analysis.mp4');
  await runFfmpeg([
    '-i', inputPath,
    '-vf', "scale='if(gt(iw,ih),-2,720)':'if(gt(iw,ih),720,-2)'",
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
    '-c:a', 'aac', '-b:a', '96k',
    '-movflags', '+faststart',
    output,
  ]);
  return { path: output, mimeType: 'video/mp4', probe };
}

/** Converts the source into the requested download format and returns the output path. */
export async function transcodeForDownload(
  inputPath: string,
  format: DownloadFormat,
  workspace: TempWorkspace,
): Promise<{ path: string; contentType: string; extension: string }> {
  const probe = await probeMedia(inputPath);
  const shortSide = probe.width && probe.height ? Math.min(probe.width, probe.height) : 0;

  if (format === 'mp3') {
    if (!probe.hasAudio) throw new AppError('FORMAT_UNAVAILABLE', 'This Reel has no audio track to export.');
    const output = workspace.file('audio.mp3');
    await runFfmpeg(['-i', inputPath, '-vn', '-c:a', 'libmp3lame', '-q:a', '4', output]);
    return { path: output, contentType: 'audio/mpeg', extension: 'mp3' };
  }

  if (format === 'best') {
    if (!probe.hasVideo) throw new AppError('FORMAT_UNAVAILABLE', 'This Reel does not contain a playable video.');
    return { path: inputPath, contentType: 'video/mp4', extension: 'mp4' };
  }

  const targetShortSide = format === '1080p' ? 1080 : 720;
  if (shortSide < targetShortSide) {
    throw new AppError('FORMAT_UNAVAILABLE', `This Reel is not available in ${format}.`);
  }
  if (shortSide === targetShortSide) {
    return { path: inputPath, contentType: 'video/mp4', extension: 'mp4' };
  }

  const output = workspace.file(`video-${format}.mp4`);
  const scale =
    `scale='if(gt(iw,ih),-2,${targetShortSide})':'if(gt(iw,ih),${targetShortSide},-2)'`;
  await runFfmpeg([
    '-i', inputPath,
    '-vf', scale,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    output,
  ]);
  return { path: output, contentType: 'video/mp4', extension: 'mp4' };
}
