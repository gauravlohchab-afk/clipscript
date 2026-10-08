/**
 * DEVELOPMENT PROVIDER. Returns realistic, deterministic analyses for the sample Reels so the
 * full analysis UI can be built and tested without a Gemini API key. Never used in production
 * unless AI_PROVIDER=mock is set explicitly.
 */
import { pickSampleReel } from '../../dev/sampleReels.js';
import type { AIProvider, AnalysisInput } from './aiProvider.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockAIProvider implements AIProvider {
  readonly name = 'mock';
  readonly model = 'clipscript-mock-v1';

  constructor(private readonly delayMs = 1200) {}

  async analyze({ media, duration }: AnalysisInput): Promise<unknown> {
    if (this.delayMs > 0) await sleep(this.delayMs);

    const sample = pickSampleReel(media.shortcode);
    // Rescale the sample timeline onto the real video's duration.
    const ratio = duration > 0 ? duration / sample.duration : 1;
    const at = (seconds: number) => Math.round(seconds * ratio * 10) / 10;

    const scores = {
      hook: sample.hook.score,
      retention: sample.retention.score,
      structure: sample.structureScore,
      cta: sample.cta.score,
    };

    return {
      summary: sample.summary,
      transcript: sample.transcript.map((segment) => ({ ...segment, start: at(segment.start), end: at(segment.end) })),
      hook: { text: sample.transcript[0]?.text ?? '', ...sample.hook },
      onScreenText: sample.onScreenText.map(({ timestamp, text }) => ({ timestamp: at(timestamp), text })),
      structure: sample.structure.map((section) => ({ ...section, start: at(section.start), end: at(section.end) })),
      retention: sample.retention,
      cta: sample.cta,
      keyTakeaways: sample.keyTakeaways,
      scores: {
        ...scores,
        overall: Math.round(scores.hook * 0.35 + scores.retention * 0.3 + scores.structure * 0.2 + scores.cta * 0.15),
      },
    };
  }
}
