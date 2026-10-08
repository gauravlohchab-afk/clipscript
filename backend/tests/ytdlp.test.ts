import './setup.js';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { YtdlpClient, mapYtdlpError, type YtdlpClientOptions } from '../src/services/media/ytdlpClient.js';
import { normalizeFormats, pickVideoEntry, planDownload, summarizeFormats } from '../src/services/media/ytdlpFormats.js';
import { YtdlpProvider } from '../src/services/media/ytdlpProvider.js';
import type { ResolvedMedia } from '../src/types/media.js';
import { AppError } from '../src/utils/AppError.js';
import type { ProbeResult } from '../src/utils/ffmpeg.js';
import { parseInstagramUrl } from '../src/utils/instagramUrl.js';
import { createTempWorkspace, type TempWorkspace } from '../src/utils/tempFiles.js';
import { carouselPost, fullHdReel, reelWithAudio, silentReel } from './fixtures/ytdlpInfo.js';

const FAKE_YTDLP = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'fake-ytdlp.mjs');

const probeOf = (overrides: Partial<ProbeResult>): ProbeResult => ({
  duration: 13.5, width: 720, height: 1280, hasAudio: true, hasVideo: true, ...overrides,
});

describe('yt-dlp format detection', () => {
  it('classifies progressive, DASH video and DASH audio streams', () => {
    const formats = normalizeFormats(reelWithAudio.formats);
    expect(formats.map((format) => [format.formatId, format.kind, format.hasAudio])).toEqual([
      ['dash-125a', 'audio', true],
      ['1', 'progressive', null],
      ['2', 'progressive', null],
      ['dash-171v', 'video', false],
      ['dash-822v', 'video', false],
      ['dash-331v', 'video', false],
    ]);
  });

  it('drops formats with unsafe IDs or non-http protocols', () => {
    const formats = normalizeFormats([
      { format_id: '1; rm -rf /', url: 'https://a.cdninstagram.com/x.mp4', protocol: 'https' },
      { format_id: 'hls-1', url: 'https://a.cdninstagram.com/x.m3u8', protocol: 'm3u8_native' },
      { format_id: 'ok', url: 'https://a.cdninstagram.com/y.mp4', protocol: 'https' },
    ]);
    expect(formats.map((format) => format.formatId)).toEqual(['ok']);
    expect(normalizeFormats('garbage')).toEqual([]);
  });

  it('treats acodec "none" on progressive streams as a silent Reel', () => {
    const formats = normalizeFormats(silentReel.formats);
    expect(summarizeFormats(formats, null)).toEqual({ hasVideo: true, width: 720, height: 1280, hasAudio: false });
    expect(planDownload(formats, 'mp3', null)).toBeNull();
  });

  it('picks 1080p, then 720p, choosing the closest size, H.264 over VP9, and merging DASH audio', () => {
    const formats = normalizeFormats(fullHdReel.formats);
    expect(planDownload(formats, '1080p', null)).toEqual({ selector: 'dash-1080v+dash-9a', merge: true });
    expect(planDownload(formats, '720p', null)).toEqual({ selector: 'dash-720v+dash-9a', merge: true });
    expect(planDownload(formats, 'best', null)).toEqual({ selector: 'dash-1080v+dash-9a', merge: true });
    expect(planDownload(formats, 'mp3', null)).toEqual({ selector: 'dash-9a', merge: false });
  });

  it('prefers a progressive MP4 (no merge needed) when it matches the target size', () => {
    const formats = normalizeFormats(reelWithAudio.formats);
    const probe = { width: 720, height: 1280, hasAudio: true };
    expect(planDownload(formats, '720p', probe)).toEqual({ selector: '1', merge: false });
    expect(planDownload(formats, '1080p', probe)).toBeNull();
    expect(planDownload(formats, 'analysis', probe)).toEqual({ selector: '1', merge: false });
  });

  it('falls back to the largest stream for analysis and "best" when the Reel is below 720p', () => {
    const formats = normalizeFormats([silentReel.formats[1]]);
    expect(planDownload(formats, '720p', null)).toBeNull();
    expect(planDownload(formats, 'analysis', null)).toEqual({ selector: 'dash-747v', merge: false });
    expect(planDownload(formats, 'best', null)).toEqual({ selector: 'dash-747v', merge: false });
  });

  it('selects the first video entry of a carousel', () => {
    const picked = pickVideoEntry(carouselPost);
    expect(picked?.playlistItem).toBe(2);
    expect(pickVideoEntry({ _type: 'playlist', entries: [{ _type: 'url' }] })).toBeNull();
    expect(pickVideoEntry(reelWithAudio)?.playlistItem).toBeNull();
  });
});

describe('yt-dlp error mapping', () => {
  it.each([
    ['ERROR: [Instagram] x: Instagram sent an empty media response. Check if this post is accessible in your browser without being logged-in.', 'PRIVATE_CONTENT'],
    ['ERROR: [Instagram] x: Requested content is not available, rate-limit reached or login required', 'PRIVATE_CONTENT'],
    ['ERROR: Unsupported URL: https://example.com', 'UNSUPPORTED_URL'],
    ['ERROR: [Instagram] x: Unable to download webpage: HTTP Error 404: Not Found', 'MEDIA_UNAVAILABLE'],
    ['ERROR: [Instagram] x: Unable to download webpage: <urlopen error [Errno 11001] getaddrinfo failed>', 'MEDIA_FETCH_FAILED'],
    ['ERROR: The uploader has not made this video available in your country', 'MEDIA_UNAVAILABLE'],
    ['ERROR: [Instagram] x: Requested format is not available', 'FORMAT_UNAVAILABLE'],
    ['ERROR: Postprocessing: ffmpeg exited with code 1', 'MEDIA_PROCESSING_FAILED'],
    ['[download] File is larger than max-filesize (1 bytes > 0 bytes). Aborting.', 'MEDIA_TOO_LARGE'],
    ['something nobody anticipated', 'MEDIA_FETCH_FAILED'],
  ])('maps %s', (stderr, code) => {
    const error = mapYtdlpError(stderr);
    expect(error.code).toBe(code);
    expect(error.message).not.toMatch(/ERROR|\[Instagram\]|yt-dlp/);
  });
});

describe('YtdlpClient (fake executable)', () => {
  const workspaces: TempWorkspace[] = [];
  const client = (overrides: Partial<YtdlpClientOptions> = {}) =>
    new YtdlpClient({
      binary: process.execPath,
      binaryArgs: [FAKE_YTDLP],
      metadataTimeoutMs: 10_000,
      downloadTimeoutMs: 10_000,
      maxConcurrent: 2,
      maxFileBytes: 10 * 1024 * 1024,
      ...overrides,
    });
  const workspace = async () => {
    const ws = await createTempWorkspace('clipscript-dl-');
    workspaces.push(ws);
    return ws;
  };

  afterEach(async () => {
    await Promise.all(workspaces.splice(0).map((ws) => ws.cleanup()));
  });

  it('runs metadata-only extraction with safe arguments', async () => {
    const info = (await client().fetchInfo('https://www.instagram.com/reel/abc12/')) as { args: string[] };
    expect(info.args).toEqual(expect.arrayContaining(['--ignore-config', '--dump-single-json', '--no-download']));
    expect(info.args.slice(-2)).toEqual(['--', 'https://www.instagram.com/reel/abc12/']);
  });

  it('downloads into the workspace with the chosen format and merge settings', async () => {
    const ws = await workspace();
    const file = await client({ ffmpegLocation: '/opt/ffmpeg' }).download('https://www.instagram.com/reel/abc12/', {
      selector: 'dash-1v+dash-2a', merge: true, dir: ws.dir, playlistItem: 2,
    });
    expect(path.dirname(file)).toBe(ws.dir);
    const args = JSON.parse(await readFile(file, 'utf8')) as string[];
    expect(args).toEqual(expect.arrayContaining(['-f', 'dash-1v+dash-2a', '--merge-output-format', 'mp4', '--ffmpeg-location', '/opt/ffmpeg', '--playlist-items', '2']));
  });

  it('turns yt-dlp failures into friendly errors', async () => {
    await expect(client().fetchInfo('https://www.instagram.com/reel/private1/')).rejects.toMatchObject({ code: 'PRIVATE_CONTENT' });
  });

  it('reports missing FFmpeg when DASH streams could not be merged', async () => {
    const ws = await workspace();
    await expect(
      client().download('https://www.instagram.com/reel/nomerge/', { selector: 'dash-1v+dash-2a', merge: true, dir: ws.dir, playlistItem: null }),
    ).rejects.toMatchObject({ code: 'MEDIA_PROCESSING_FAILED' });
  });

  it('reports files over the size limit', async () => {
    const ws = await workspace();
    await expect(
      client().download('https://www.instagram.com/reel/toolarge/', { selector: '1', merge: false, dir: ws.dir, playlistItem: null }),
    ).rejects.toMatchObject({ code: 'MEDIA_TOO_LARGE' });
  });

  it('kills the process and fails cleanly on timeout', async () => {
    const startedAt = Date.now();
    await expect(client({ metadataTimeoutMs: 5_000 }).fetchInfo('https://www.instagram.com/reel/slow1/')).rejects.toMatchObject({
      code: 'MEDIA_FETCH_FAILED',
      status: 504,
    });
    expect(Date.now() - startedAt).toBeLessThan(15_000);
  });

  it('fails with a configuration error when yt-dlp is not installed', async () => {
    const missing = client({ binary: path.join(path.dirname(FAKE_YTDLP), 'does-not-exist-yt-dlp'), binaryArgs: [] });
    await expect(missing.fetchInfo('https://www.instagram.com/reel/abc12/')).rejects.toMatchObject({ code: 'MEDIA_PROCESSING_FAILED' });
    expect(await missing.version()).toBeNull();
  });

  it('limits concurrent processes and rejects bursts beyond the queue', async () => {
    const limited = client({ maxConcurrent: 1, metadataTimeoutMs: 5_000 });
    const calls = Array.from({ length: 6 }, () => limited.fetchInfo('https://www.instagram.com/reel/slow1/').catch((error: AppError) => error.code));
    const codes = await Promise.all(calls);
    // 1 running + 4 queued; the 6th is rejected immediately.
    expect(codes.filter((code) => code === 'RATE_LIMITED')).toHaveLength(1);
  }, 60_000);
});

describe('YtdlpProvider', () => {
  const fakeClient = (info: unknown, onDownload?: (opts: unknown) => void) => ({
    fetchInfo: async () => info as never,
    version: async () => '2026.08.19',
    download: async (_url: string, opts: { dir: string }) => {
      onDownload?.(opts);
      return path.join(opts.dir, 'media.mp4');
    },
  });

  it('normalizes metadata into the existing media response shape', async () => {
    const provider = new YtdlpProvider(fakeClient(reelWithAudio), async () => probeOf({}));
    const { media, source } = await provider.resolve(parseInstagramUrl('https://www.instagram.com/reel/CDUMkliABpa/?igsh=x'));
    expect(media).toEqual({
      platform: 'instagram',
      type: 'reel',
      shortcode: 'CDUMkliABpa',
      originalUrl: 'https://www.instagram.com/reel/CDUMkliABpa/',
      title: 'I definitely need a mountain lake close by to practice SUP',
      author: 'clippedinandfree',
      thumbnailUrl: 'https://scontent.cdninstagram.com/v/thumb.jpg',
      mediaUrl: 'https://scontent.cdninstagram.com/v/progressive-1.mp4',
      duration: 13.5,
      width: 720,
      height: 1280,
      hasAudio: true,
      downloadOptions: [
        { format: '720p', label: 'MP4 · 720p', container: 'mp4' },
        { format: 'mp3', label: 'Audio · MP3', container: 'mp3' },
      ],
      provider: 'ytdlp',
    });
    // Raw yt-dlp data stays internal.
    expect(JSON.stringify(media)).not.toContain('dash-');
    expect(source?.kind).toBe('ytdlp');
  });

  it('offers 1080p and 720p only when the streams exist', async () => {
    const provider = new YtdlpProvider(fakeClient(fullHdReel), async () => probeOf({ width: 720, height: 1280 }));
    const { media } = await provider.resolve(parseInstagramUrl('https://www.instagram.com/reel/FullHd1080/'));
    expect(media.downloadOptions.map((option) => option.format)).toEqual(['1080p', '720p', 'mp3']);
  });

  it('still resolves when the preview probe fails', async () => {
    const provider = new YtdlpProvider(fakeClient(silentReel), async () => {
      throw new Error('probe failed');
    });
    const { media } = await provider.resolve(parseInstagramUrl('https://www.instagram.com/reel/Chunk8-jurw/'));
    expect(media.duration).toBe(0);
    expect(media.downloadOptions.map((option) => option.format)).toEqual(['720p']);
  });

  it('rejects posts without video and asset URLs off the Instagram CDN', async () => {
    const imageOnly = new YtdlpProvider(fakeClient({ _type: 'playlist', entries: [{ _type: 'url' }] }), async () => probeOf({}));
    await expect(imageOnly.resolve(parseInstagramUrl('https://www.instagram.com/p/abcde/'))).rejects.toMatchObject({ code: 'MEDIA_UNAVAILABLE' });

    const offCdn = { ...silentReel, thumbnail: 'http://169.254.169.254/latest', formats: [{ ...silentReel.formats[2], url: 'https://evil.example/x.mp4' }] };
    const { media } = await new YtdlpProvider(fakeClient(offCdn), async () => probeOf({})).resolve(parseInstagramUrl('https://www.instagram.com/reel/abcde/'));
    expect(media.thumbnailUrl).toBeNull();
    expect(media.mediaUrl).toBeNull();
  });

  it('materializes downloads and analysis input through yt-dlp with a dynamic format plan', async () => {
    const calls: unknown[] = [];
    const provider = new YtdlpProvider(fakeClient(fullHdReel, (opts) => calls.push(opts)), async () => probeOf({}));
    const resolved: ResolvedMedia = await provider.resolve(parseInstagramUrl('https://www.instagram.com/reel/FullHd1080/'));
    const ws = await createTempWorkspace('clipscript-dl-');
    try {
      await provider.materialize(resolved, '1080p', ws);
      await provider.materialize(resolved, 'analysis', ws);
      expect(calls).toEqual([
        { selector: 'dash-1080v+dash-9a', merge: true, dir: ws.dir, playlistItem: null },
        // A probed 720p progressive MP4 with audio beats merging DASH streams for analysis.
        { selector: '1', merge: false, dir: ws.dir, playlistItem: null },
      ]);
      await expect(provider.materialize(resolved, 'best', ws)).resolves.toBe(path.join(ws.dir, 'media.mp4'));
    } finally {
      await ws.cleanup();
    }
    expect(existsSync(ws.dir)).toBe(false);
  });

  it('refuses formats the Reel does not have', async () => {
    const provider = new YtdlpProvider(fakeClient(silentReel), async () => probeOf({ hasAudio: false }));
    const resolved = await provider.resolve(parseInstagramUrl('https://www.instagram.com/reel/Chunk8-jurw/'));
    const ws = await createTempWorkspace('clipscript-dl-');
    try {
      await expect(provider.materialize(resolved, 'mp3', ws)).rejects.toMatchObject({ code: 'FORMAT_UNAVAILABLE' });
      await expect(provider.materialize(resolved, '1080p', ws)).rejects.toMatchObject({ code: 'FORMAT_UNAVAILABLE' });
      expect(await readdir(ws.dir)).toEqual([]);
    } finally {
      await ws.cleanup();
    }
  });
});
