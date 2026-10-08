/**
 * DEVELOPMENT ONLY. Generates small sample videos + thumbnails with FFmpeg so the mock media
 * provider can serve real, playable media without contacting Instagram.
 */
import { access, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runFfmpeg } from '../utils/ffmpeg.js';
import { logger } from '../utils/logger.js';
import type { SampleReel } from './sampleReels.js';

export const DEV_MEDIA_DIR = path.join(tmpdir(), 'clipscript-dev-media');

const inflight = new Map<string, Promise<void>>();

const exists = (file: string) =>
  access(file).then(
    () => true,
    () => false,
  );

export const devVideoPath = (sample: SampleReel) => path.join(DEV_MEDIA_DIR, `${sample.shortcode}.mp4`);
export const devThumbnailPath = (sample: SampleReel) => path.join(DEV_MEDIA_DIR, `${sample.shortcode}.jpg`);

/** Wraps overlay text so it fits the vertical frame (drawtext does not wrap on its own). */
function wrap(text: string, maxChars = 16): string {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    if (current && `${current} ${word}`.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines.join('\n');
}

async function buildTextFilters(sample: SampleReel): Promise<string> {
  const fontSize = Math.round(sample.width / 12);
  const filters: string[] = [];
  for (const [index, item] of sample.onScreenText.entries()) {
    const textFile = path.join(DEV_MEDIA_DIR, `${sample.shortcode}-text-${index}.txt`);
    await writeFile(textFile, wrap(item.text));
    const escapedPath = textFile.replace(/\\/g, '/').replace(/:/g, '\\:');
    filters.push(
      `drawtext=textfile='${escapedPath}':fontcolor=white:fontsize=${fontSize}:box=1:boxcolor=black@0.35:boxborderw=${Math.round(fontSize / 2.5)}:line_spacing=${Math.round(fontSize / 4)}:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,${item.timestamp},${item.until})'`,
    );
  }
  const handleFile = path.join(DEV_MEDIA_DIR, `${sample.shortcode}-handle.txt`);
  await writeFile(handleFile, `@${sample.author}`);
  filters.push(
    `drawtext=textfile='${handleFile.replace(/\\/g, '/').replace(/:/g, '\\:')}':fontcolor=white@0.85:fontsize=${Math.round(fontSize * 0.55)}:x=w*0.06:y=h*0.86`,
  );
  return filters.join(',');
}

async function generate(sample: SampleReel): Promise<void> {
  await mkdir(DEV_MEDIA_DIR, { recursive: true });
  const video = devVideoPath(sample);
  const [c0, c1, c2] = sample.colors;
  const base = [
    '-f', 'lavfi',
    '-i', `gradients=s=${sample.width}x${sample.height}:c0=${c0}:c1=${c1}:c2=${c2}:nb_colors=3:x0=0:y0=0:x1=${sample.width}:y1=${sample.height}:speed=0.008:d=${sample.duration}:r=24`,
    '-f', 'lavfi',
    '-i', `sine=frequency=196:sample_rate=44100:duration=${sample.duration}`,
  ];
  const encode = ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '30', '-pix_fmt', 'yuv420p', '-af', 'volume=0.06', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', '-shortest'];

  try {
    await runFfmpeg([...base, '-vf', await buildTextFilters(sample), ...encode, video], 180_000);
  } catch {
    // FFmpeg builds without fontconfig/freetype cannot draw text; fall back to plain gradients.
    logger.warn(`Text overlay unavailable in this FFmpeg build; generating ${sample.shortcode} without captions.`);
    await runFfmpeg([...base, ...encode, video], 180_000);
  }
  await runFfmpeg(['-ss', '1.2', '-i', video, '-frames:v', '1', '-vf', 'scale=540:-2', '-q:v', '4', devThumbnailPath(sample)]);
  logger.info(`Generated development sample media for ${sample.shortcode}`);
}

/** Ensures the sample's video and thumbnail exist on disk (generated once per machine). */
export async function ensureDevMedia(sample: SampleReel): Promise<void> {
  if ((await exists(devVideoPath(sample))) && (await exists(devThumbnailPath(sample)))) return;
  let pending = inflight.get(sample.shortcode);
  if (!pending) {
    pending = generate(sample).finally(() => inflight.delete(sample.shortcode));
    inflight.set(sample.shortcode, pending);
  }
  await pending;
}
