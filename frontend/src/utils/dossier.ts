import type { AnalysisResult } from '@/types/analysis';
import type { AnalysisDossier, Clip } from '@/types/clip';

export function dossierFromResult(result: AnalysisResult, saved?: Clip | null): AnalysisDossier {
  return {
    clipId: saved?.id ?? null,
    isSaved: saved?.isSaved ?? false,
    media: result.media,
    thumbnailData: saved?.thumbnailData ?? null,
    analysis: result.analysis,
    meta: result.meta,
  };
}

export function dossierFromClip(clip: Clip): AnalysisDossier {
  const { summary, transcript, hook, onScreenText, structure, retention, cta, keyTakeaways, scores } = clip;
  return {
    clipId: clip.id,
    isSaved: clip.isSaved,
    media: {
      title: clip.title,
      author: clip.author,
      duration: clip.duration,
      platform: clip.platform,
      type: clip.mediaType,
      originalUrl: clip.originalUrl,
      thumbnailUrl: clip.thumbnailUrl,
      mediaUrl: clip.mediaUrl,
    },
    thumbnailData: clip.thumbnailData,
    analysis: { summary, transcript, hook, onScreenText, structure, retention, cta, keyTakeaways, scores },
    meta: clip.analysisMeta,
  };
}

export function clipThumbnail(clip: Pick<Clip, 'thumbnailData' | 'thumbnailUrl'>): string | null {
  return clip.thumbnailData ?? clip.thumbnailUrl;
}
