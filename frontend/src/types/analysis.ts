import type { Media } from './media';

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface Hook {
  text: string;
  type: string;
  whyItWorks: string;
  score: number;
}

export interface OnScreenText {
  timestamp: number;
  text: string;
}

export interface StructureSection {
  stage: string;
  start: number;
  end: number;
  description: string;
}

export interface Retention {
  score: number;
  observations: string[];
  riskPoints: string[];
}

export interface Cta {
  text: string;
  type: string;
  score: number;
}

export interface Scores {
  hook: number;
  retention: number;
  structure: number;
  cta: number;
  overall: number;
}

export interface Analysis {
  summary: string;
  transcript: TranscriptSegment[];
  hook: Hook;
  onScreenText: OnScreenText[];
  structure: StructureSection[];
  retention: Retention;
  cta: Cta;
  keyTakeaways: string[];
  scores: Scores;
}

export interface AnalysisMeta {
  provider: string;
  model: string;
  analyzedAt: string;
}

export interface AnalysisResult {
  media: Media;
  analysis: Analysis;
  meta: AnalysisMeta;
}
