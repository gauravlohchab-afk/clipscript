import { spawn } from 'node:child_process';
import { AppError } from './AppError.js';
import { logger } from './logger.js';

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';

/** Explicit FFmpeg location to hand to other tools (yt-dlp), or null to let them search PATH. */
export const ffmpegLocation = process.env.FFMPEG_PATH || null;

interface RunResult {
  stdout: string;
  stderr: string;
}

function run(binary: string, args: string[], timeoutMs: number): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${binary} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      // Keep only the tail; ffmpeg can be very chatty.
      stderr = (stderr + chunk.toString()).slice(-8000);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${binary} exited with code ${code}: ${stderr.split('\n').slice(-6).join('\n')}`));
    });
  });
}

export async function runFfmpeg(args: string[], timeoutMs = 120_000): Promise<void> {
  try {
    await run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], timeoutMs);
  } catch (error) {
    logger.error('ffmpeg failed', error);
    throw new AppError('MEDIA_PROCESSING_FAILED', 'We could not process this video. Please try again or use a different Reel.', {
      cause: error,
    });
  }
}

export interface ProbeResult {
  duration: number;
  width: number | null;
  height: number | null;
  hasAudio: boolean;
  hasVideo: boolean;
}

interface FfprobeOutput {
  format?: { duration?: string };
  streams?: Array<{ codec_type?: string; width?: number; height?: number; duration?: string }>;
}

export async function probeMedia(input: string, timeoutMs = 20_000): Promise<ProbeResult> {
  try {
    const { stdout } = await run(
      FFPROBE,
      ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', input],
      timeoutMs,
    );
    const parsed = JSON.parse(stdout) as FfprobeOutput;
    const streams = parsed.streams ?? [];
    const video = streams.find((stream) => stream.codec_type === 'video');
    const duration = Number(parsed.format?.duration ?? video?.duration ?? 0);
    return {
      duration: Number.isFinite(duration) ? Math.round(duration * 10) / 10 : 0,
      width: video?.width ?? null,
      height: video?.height ?? null,
      hasAudio: streams.some((stream) => stream.codec_type === 'audio'),
      hasVideo: Boolean(video),
    };
  } catch (error) {
    logger.warn('ffprobe failed', error);
    throw new AppError('MEDIA_PROCESSING_FAILED', 'We could not read this video file.', { cause: error });
  }
}

export async function isFfmpegAvailable(): Promise<boolean> {
  try {
    await run(FFMPEG, ['-version'], 10_000);
    return true;
  } catch {
    return false;
  }
}
