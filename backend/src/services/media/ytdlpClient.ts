import { spawn, type ChildProcess } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
import type { YtdlpInfo } from './ytdlpFormats.js';

export interface YtdlpClientOptions {
  /** Executable to run (the yt-dlp binary). */
  binary: string;
  /** Arguments placed before ClipScript's own (used by tests to run a fake yt-dlp through node). */
  binaryArgs?: string[];
  /** Passed to yt-dlp's --ffmpeg-location when set; otherwise yt-dlp finds FFmpeg on PATH. */
  ffmpegLocation?: string | null;
  metadataTimeoutMs: number;
  downloadTimeoutMs: number;
  maxConcurrent: number;
  maxFileBytes: number;
}

interface RunResult {
  stdout: string;
  stderr: string;
}

class ProcessTimeoutError extends Error {}

const MAX_STDOUT_BYTES = 32 * 1024 * 1024;
const MAX_QUEUED_PER_SLOT = 4;

/** Options every invocation gets: ignore user/system config files, no cache, no progress noise. */
const BASE_ARGS = ['--ignore-config', '--no-cache-dir', '--no-warnings', '--no-progress', '--socket-timeout', '20', '--retries', '2'];

/** Kills the process and its children (yt-dlp spawns FFmpeg; the Windows build also re-launches itself). */
function killTree(child: ChildProcess): void {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }).on('error', () => child.kill());
  } else {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      child.kill('SIGKILL');
    }
  }
}

/** Caps simultaneous yt-dlp processes; a short queue absorbs bursts, anything beyond is rejected. */
class ProcessLimiter {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) {
      if (this.waiting.length >= this.max * MAX_QUEUED_PER_SLOT) {
        throw new AppError('RATE_LIMITED', 'ClipScript is busy processing other media right now. Please try again in a moment.');
      }
      // The finishing task hands its slot over directly, so `active` stays unchanged.
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    } else {
      this.active += 1;
    }
    try {
      return await task();
    } finally {
      const next = this.waiting.shift();
      if (next) next();
      else this.active -= 1;
    }
  }
}

const PRIVATE_MESSAGE =
  'Unable to access this Instagram media. The content may be private, unavailable, or require access that ClipScript cannot provide.';

/**
 * Turns yt-dlp's stderr into a user-safe AppError. The raw output is only ever logged server-side.
 * Patterns follow yt-dlp's current Instagram extractor messages.
 */
export function mapYtdlpError(stderr: string): AppError {
  const text = stderr.toLowerCase();
  const fail = (code: ConstructorParameters<typeof AppError>[0], message: string) => new AppError(code, message, { cause: new Error(stderr.slice(-2000)) });

  if (/unsupported url/.test(text)) {
    return fail('UNSUPPORTED_URL', 'This link is not supported. Paste a public Instagram Reel or video post link.');
  }
  if (/max-filesize|file is larger than/.test(text)) {
    return fail('MEDIA_TOO_LARGE', 'This video is too large for ClipScript to process.');
  }
  if (/geo.?restrict|available in your (country|region)|from your location/.test(text)) {
    return fail('MEDIA_UNAVAILABLE', 'This Instagram media is not available in the server’s region.');
  }
  if (/http error 404|does not exist|has been removed|no longer available|page not found/.test(text)) {
    return fail('MEDIA_UNAVAILABLE', 'This Reel does not exist or has been removed.');
  }
  if (/login|log in|cookies|private|empty media response|not granting access|requested content is not available|age.?restricted|inappropriate|sensitive content/.test(text)) {
    return fail('PRIVATE_CONTENT', PRIVATE_MESSAGE);
  }
  if (/requested format is not available|no video formats found|no formats/.test(text)) {
    return fail('FORMAT_UNAVAILABLE', 'The requested format is no longer available for this Reel. Fetch it again and retry.');
  }
  if (/ffmpeg|ffprobe|postprocessing|merging/.test(text)) {
    return fail('MEDIA_PROCESSING_FAILED', 'We could not process this video. Please try again or use a different Reel.');
  }
  if (/http error 429|too many requests|rate.?limit/.test(text)) {
    return fail('MEDIA_FETCH_FAILED', 'Instagram is limiting requests right now. Please try again in a few minutes.');
  }
  if (/unable to download|timed out|getaddrinfo|connection|network|ssl|http error 5\d\d/.test(text)) {
    return fail('MEDIA_FETCH_FAILED', 'We could not reach Instagram right now. Please try again in a moment.');
  }
  return fail('MEDIA_FETCH_FAILED', 'We could not extract media from this link. Please try again or use a different Reel.');
}

/**
 * Thin, safe wrapper around the yt-dlp executable. Always spawns with an argument array (no shell),
 * puts `--` before the URL so it can never be read as an option, and enforces timeouts and concurrency.
 */
export class YtdlpClient {
  private readonly limiter: ProcessLimiter;

  constructor(private readonly options: YtdlpClientOptions) {
    this.limiter = new ProcessLimiter(options.maxConcurrent);
  }

  /** Metadata only: `--dump-single-json` never downloads the video. */
  async fetchInfo(url: string): Promise<YtdlpInfo> {
    logger.info('[Media] yt-dlp started (metadata)');
    const startedAt = Date.now();
    const { stdout } = await this.exec(['--dump-single-json', '--no-download', '--', url], this.options.metadataTimeoutMs);
    try {
      const info = JSON.parse(stdout) as YtdlpInfo;
      if (!info || typeof info !== 'object') throw new Error('yt-dlp returned no JSON object');
      logger.info(`[Media] Metadata extracted in ${Date.now() - startedAt}ms`);
      return info;
    } catch (error) {
      logger.error('[Media] yt-dlp returned unreadable metadata', error);
      throw new AppError('MEDIA_FETCH_FAILED', 'We could not read the media information for this Reel. Please try again.', { cause: error });
    }
  }

  /**
   * Downloads the selected format(s) into `dir` and returns the produced file. When `merge` is true,
   * yt-dlp uses FFmpeg to mux the separate video and audio streams into one MP4.
   */
  async download(url: string, opts: { selector: string; merge: boolean; dir: string; playlistItem: number | null }): Promise<string> {
    const args = [
      '-f', opts.selector,
      '--max-filesize', String(this.options.maxFileBytes),
      '--no-part', '--no-mtime',
      '-P', opts.dir,
      '-o', 'media.%(ext)s',
    ];
    // Carousel posts are playlists; only the entry detected during resolve is downloaded.
    if (opts.playlistItem) args.push('--yes-playlist', '--playlist-items', String(opts.playlistItem));
    else args.push('--no-playlist');
    if (opts.merge) args.push('--merge-output-format', 'mp4');
    if (this.options.ffmpegLocation) args.push('--ffmpeg-location', this.options.ffmpegLocation);
    args.push('--', url);

    logger.info(`[Media] Download started (format ${opts.selector}${opts.merge ? ', FFmpeg merge' : ''})`);
    const startedAt = Date.now();
    const { stdout, stderr } = await this.exec(args, this.options.downloadTimeoutMs);
    const { file, parts } = await this.findOutput(opts.dir);
    if (!file) {
      if (opts.merge && parts > 0) {
        // Without FFmpeg, yt-dlp only warns, exits 0 and leaves the separate streams unmerged.
        logger.error('[Media] yt-dlp could not merge video and audio: FFmpeg was not found. Install FFmpeg or set FFMPEG_PATH.');
        throw new AppError('MEDIA_PROCESSING_FAILED', 'We could not process this video. Please try again or use a different Reel.');
      }
      // yt-dlp also exits 0 but writes nothing when --max-filesize skips the download (reported on stdout).
      logger.warn('[Media] yt-dlp produced no output file', `${stdout}
${stderr}`.trim().slice(-1500));
      throw mapYtdlpError(`${stdout}
${stderr}`);
    }
    const { size } = await stat(file);
    if (size > this.options.maxFileBytes) {
      throw new AppError('MEDIA_TOO_LARGE', 'This video is too large for ClipScript to process.');
    }
    logger.info(`[Media] Download completed in ${Date.now() - startedAt}ms (${Math.round(size / 1024)} KB)`);
    return file;
  }

  /** Returns the yt-dlp version, or null when the binary cannot be run. */
  async version(): Promise<string | null> {
    try {
      const { stdout } = await this.spawnProcess(['--version'], 15_000);
      return stdout.trim() || null;
    } catch {
      return null;
    }
  }

  private async findOutput(dir: string): Promise<{ file: string | null; parts: number }> {
    const names = await readdir(dir);
    // Only the final file matches media.<ext>; intermediate DASH parts are named media.f<id>.<ext>.
    const name = names.find((candidate) => /^media\.[a-z0-9]{2,5}$/i.test(candidate));
    return { file: name ? path.join(dir, name) : null, parts: names.filter((candidate) => candidate.startsWith('media.f')).length };
  }

  private exec(args: string[], timeoutMs: number): Promise<RunResult> {
    return this.limiter.run(async () => {
      try {
        return await this.spawnProcess([...BASE_ARGS, ...args], timeoutMs);
      } catch (error) {
        if (error instanceof AppError) throw error;
        if (error instanceof ProcessTimeoutError) {
          logger.warn(`[Media] yt-dlp timed out after ${timeoutMs}ms and was terminated`);
          throw new AppError('MEDIA_FETCH_FAILED', 'Instagram took too long to respond. Please try again in a moment.', { status: 504, cause: error });
        }
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          logger.error(`[Media] yt-dlp executable not found ("${this.options.binary}"). Install yt-dlp or set YTDLP_PATH.`);
          throw new AppError('MEDIA_PROCESSING_FAILED', 'Media extraction is not available on the server right now. Please try again later.', { cause: error });
        }
        const stderr = error instanceof Error ? error.message : String(error);
        logger.warn('[Media] yt-dlp failed', stderr.slice(-1500));
        throw mapYtdlpError(stderr);
      }
    });
  }

  private spawnProcess(args: string[], timeoutMs: number): Promise<RunResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.options.binary, [...(this.options.binaryArgs ?? []), ...args], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
        shell: false,
        // Own process group on POSIX so a timeout can kill yt-dlp together with its FFmpeg child.
        detached: process.platform !== 'win32',
      });
      const stdout: Buffer[] = [];
      let stdoutBytes = 0;
      let stderr = '';
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn();
      };

      const timer = setTimeout(() => {
        killTree(child);
        finish(() => reject(new ProcessTimeoutError(`yt-dlp timed out after ${timeoutMs}ms`)));
      }, timeoutMs);

      child.stdout?.on('data', (chunk: Buffer) => {
        stdoutBytes += chunk.length;
        if (stdoutBytes > MAX_STDOUT_BYTES) {
          killTree(child);
          finish(() => reject(new Error('yt-dlp produced too much output')));
          return;
        }
        stdout.push(chunk);
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr = (stderr + chunk.toString()).slice(-8000);
      });
      child.on('error', (error) => finish(() => reject(error)));
      child.on('close', (code) => {
        finish(() => {
          if (code === 0) resolve({ stdout: Buffer.concat(stdout).toString('utf8'), stderr });
          else reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
        });
      });
    });
  }
}
