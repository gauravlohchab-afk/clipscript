import { stat, readFile } from 'node:fs/promises';
import { runFfmpeg } from '../../utils/ffmpeg.js';
import { logger } from '../../utils/logger.js';
import { downloadToFile, type UrlGuard } from '../../utils/safeFetch.js';
import { createTempWorkspace } from '../../utils/tempFiles.js';

const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_DATA_BYTES = 120 * 1024;

/**
 * Captures a small JPEG preview as a data URL. Platform CDN thumbnail links expire, so saved
 * clips keep this tiny copy (≈20–60 KB) instead of the full-size image.
 */
export async function captureThumbnail(
  url: string,
  isAllowed: UrlGuard,
  localPath: string | null = null,
): Promise<string | null> {
  const workspace = await createTempWorkspace('clipscript-thumb-');
  try {
    const output = workspace.file('thumb.jpg');
    let source = localPath;
    if (!source) {
      source = workspace.file('source');
      await downloadToFile(url, source, isAllowed, MAX_SOURCE_BYTES);
    }
    await runFfmpeg(['-i', source, '-frames:v', '1', '-vf', 'scale=360:-2', '-q:v', '6', output], 20_000);
    if ((await stat(output)).size > MAX_DATA_BYTES) return null;
    return `data:image/jpeg;base64,${(await readFile(output)).toString('base64')}`;
  } catch (error) {
    logger.warn('Thumbnail capture failed; the clip will use the original thumbnail URL', error instanceof Error ? error.message : error);
    return null;
  } finally {
    await workspace.cleanup();
  }
}
