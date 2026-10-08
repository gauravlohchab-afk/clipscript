import type { NormalizedMedia } from '../../types/media.js';

export interface AnalysisInput {
  media: NormalizedMedia;
  /** Prepared (normalized, size-reduced) video on local disk. */
  video: { path: string; mimeType: string };
  /** Probed duration in seconds. */
  duration: number;
  hasAudio: boolean;
}

/**
 * Multimodal analysis provider. Implementations return raw, untrusted output;
 * the analysis service is responsible for normalizing and validating it.
 */
export interface AIProvider {
  readonly name: string;
  readonly model: string;
  analyze(input: AnalysisInput): Promise<unknown>;
}
