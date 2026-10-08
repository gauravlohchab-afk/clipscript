import type { AnalysisResult } from '../../types/analysis.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
import { createTempWorkspace } from '../../utils/tempFiles.js';
import { prepareForAnalysis } from '../media/mediaProcessor.js';
import type { MediaService } from '../media/mediaService.js';
import type { AIProvider } from './aiProvider.js';
import { normalizeAnalysis } from './normalizeAnalysis.js';

/**
 * Orchestrates the analysis pipeline:
 * resolve media → download to a temp workspace → normalize with FFmpeg → multimodal AI → validate.
 * Temporary media is always deleted; nothing large is stored permanently.
 */
export class AnalysisService {
  constructor(
    private readonly mediaService: MediaService,
    private readonly aiProvider: AIProvider,
  ) {}

  get providerName(): string {
    return this.aiProvider.name;
  }

  async analyze(url: string): Promise<AnalysisResult> {
    const resolved = await this.mediaService.resolve(url);
    const { media, source } = resolved;
    if (!source) {
      throw new AppError(
        'MEDIA_UNAVAILABLE',
        'ClipScript could not access the video for this Reel, so it cannot be analyzed. Only public Reels with available media are supported.',
      );
    }

    const workspace = await createTempWorkspace('clipscript-ai-');
    const startedAt = Date.now();
    try {
      const original = await this.mediaService.materialize(resolved, 'analysis', workspace);
      const prepared = await prepareForAnalysis(original, workspace);
      const duration = prepared.probe.duration || media.duration;

      const raw = await this.aiProvider.analyze({
        media,
        video: { path: prepared.path, mimeType: prepared.mimeType },
        duration,
        hasAudio: prepared.probe.hasAudio,
      });
      const analysis = normalizeAnalysis(raw, duration);

      logger.info(`Analyzed ${media.shortcode} with ${this.aiProvider.name} in ${Date.now() - startedAt}ms`);
      return {
        media: { ...media, duration: duration || media.duration },
        analysis,
        meta: { provider: this.aiProvider.name, model: this.aiProvider.model, analyzedAt: new Date().toISOString() },
      };
    } finally {
      await workspace.cleanup().catch((error: unknown) => logger.warn('Temp cleanup failed', error));
    }
  }
}
