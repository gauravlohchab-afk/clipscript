import type { Analysis, AnalysisMeta } from './analysis.js';
import type { NormalizedMedia } from './media.js';

/** The clip shape returned by the API. */
export interface ClipDto extends Analysis {
  id: string;
  originalUrl: string;
  shortcode: string;
  platform: NormalizedMedia['platform'];
  mediaType: NormalizedMedia['type'];
  title: string;
  author: string;
  thumbnailUrl: string | null;
  thumbnailData: string | null;
  mediaUrl: string | null;
  duration: number;
  tags: string[];
  isSaved: boolean;
  analysisMeta: AnalysisMeta;
  createdAt: string;
  updatedAt: string;
}

export type ClipSort = 'newest' | 'oldest' | 'overall' | 'hook' | 'duration';

export interface ClipListQuery {
  q?: string;
  saved?: boolean;
  hookType?: string;
  tag?: string;
  minScore?: number;
  url?: string;
  sort: ClipSort;
  page: number;
  limit: number;
}

export interface ClipListResult {
  items: ClipDto[];
  total: number;
  page: number;
  limit: number;
  facets: { hookTypes: string[]; tags: string[] };
}
