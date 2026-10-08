import { z } from 'zod';
import type { NormalizedMedia } from './media.js';

const score = z.number().int().min(0).max(100);
const seconds = z.number().min(0);

export const transcriptSegmentSchema = z.object({
  start: seconds,
  end: seconds,
  text: z.string().min(1),
});

export const hookSchema = z.object({
  text: z.string(),
  type: z.string().min(1),
  whyItWorks: z.string(),
  score,
});

export const onScreenTextSchema = z.object({
  timestamp: seconds,
  text: z.string().min(1),
});

export const structureSectionSchema = z.object({
  stage: z.string().min(1),
  start: seconds,
  end: seconds,
  description: z.string(),
});

export const retentionSchema = z.object({
  score,
  observations: z.array(z.string()),
  riskPoints: z.array(z.string()),
});

export const ctaSchema = z.object({
  text: z.string(),
  type: z.string().min(1),
  score,
});

export const scoresSchema = z.object({
  hook: score,
  retention: score,
  structure: score,
  cta: score,
  overall: score,
});

/** The validated AI analysis contract. Every analysis must match this before it reaches a client. */
export const analysisSchema = z.object({
  summary: z.string().min(1),
  transcript: z.array(transcriptSegmentSchema),
  hook: hookSchema,
  onScreenText: z.array(onScreenTextSchema),
  structure: z.array(structureSectionSchema),
  retention: retentionSchema,
  cta: ctaSchema,
  keyTakeaways: z.array(z.string().min(1)),
  scores: scoresSchema,
});

export type TranscriptSegment = z.infer<typeof transcriptSegmentSchema>;
export type Hook = z.infer<typeof hookSchema>;
export type OnScreenText = z.infer<typeof onScreenTextSchema>;
export type StructureSection = z.infer<typeof structureSectionSchema>;
export type Retention = z.infer<typeof retentionSchema>;
export type Cta = z.infer<typeof ctaSchema>;
export type Scores = z.infer<typeof scoresSchema>;
export type Analysis = z.infer<typeof analysisSchema>;

export interface AnalysisMeta {
  provider: string;
  model: string;
  analyzedAt: string;
}

export interface AnalysisResult {
  media: NormalizedMedia;
  analysis: Analysis;
  meta: AnalysisMeta;
}
