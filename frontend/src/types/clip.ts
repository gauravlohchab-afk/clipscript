import type { Analysis, AnalysisMeta } from './analysis';
import type { Media } from './media';

export interface Clip extends Analysis {
  id: string;
  originalUrl: string;
  shortcode: string;
  platform: Media['platform'];
  mediaType: Media['type'];
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

export interface ClipListParams {
  q?: string;
  saved?: boolean;
  hookType?: string;
  minScore?: number;
  url?: string;
  sort?: ClipSort;
  page?: number;
  limit?: number;
}

export interface ClipList {
  items: Clip[];
  total: number;
  page: number;
  limit: number;
  facets: { hookTypes: string[]; tags: string[] };
}

/**
 * What the analysis UI renders: either a fresh (unsaved) analysis or a saved clip.
 * `clipId` is present once the analysis exists in the library.
 */
export interface AnalysisDossier {
  clipId: string | null;
  isSaved: boolean;
  media: Pick<Media, 'title' | 'author' | 'duration' | 'platform' | 'type' | 'originalUrl' | 'thumbnailUrl' | 'mediaUrl'>;
  thumbnailData: string | null;
  analysis: Analysis;
  meta: AnalysisMeta;
}
