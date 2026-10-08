import { isValidObjectId, type SortOrder } from 'mongoose';
import { ClipModel, type ClipDocument } from '../../models/Clip.js';
import type { Analysis, AnalysisMeta } from '../../types/analysis.js';
import type { ClipDto, ClipListQuery, ClipListResult, ClipSort } from '../../types/clip.js';
import type { NormalizedMedia } from '../../types/media.js';
import { AppError } from '../../utils/AppError.js';
import { parseInstagramUrl } from '../../utils/instagramUrl.js';
import { logger } from '../../utils/logger.js';

export interface CreateClipInput {
  media: NormalizedMedia;
  analysis: Analysis;
  meta: AnalysisMeta;
}

export interface ThumbnailCapturer {
  captureThumbnail(url: string): Promise<string | null>;
}

const SORTS: Record<ClipSort, Record<string, SortOrder>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  overall: { 'scores.overall': -1, createdAt: -1 },
  hook: { 'scores.hook': -1, createdAt: -1 },
  duration: { duration: -1, createdAt: -1 },
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function deriveTags(analysis: Analysis): string[] {
  const tags = [analysis.hook.type, analysis.cta.type !== 'none' ? analysis.cta.type : null, ...analysis.structure.map((s) => s.stage)]
    .filter((tag): tag is string => Boolean(tag))
    .map((tag) => tag.toLowerCase().trim());
  return [...new Set(tags)].slice(0, 12);
}

export function toClipDto(doc: ClipDocument): ClipDto {
  const clip = doc.toObject();
  return {
    id: doc._id.toString(),
    originalUrl: clip.originalUrl,
    shortcode: clip.shortcode,
    platform: 'instagram',
    mediaType: clip.mediaType ?? 'reel',
    title: clip.title,
    author: clip.author,
    thumbnailUrl: clip.thumbnailUrl ?? null,
    thumbnailData: clip.thumbnailData ?? null,
    mediaUrl: clip.mediaUrl ?? null,
    duration: clip.duration ?? 0,
    summary: clip.summary ?? '',
    transcript: clip.transcript.map(({ start, end, text }) => ({ start, end, text })),
    hook: {
      text: clip.hook?.text ?? '',
      type: clip.hook?.type ?? 'Unclassified',
      whyItWorks: clip.hook?.whyItWorks ?? '',
      score: clip.hook?.score ?? 0,
    },
    onScreenText: clip.onScreenText.map(({ timestamp, text }) => ({ timestamp, text })),
    structure: clip.structure.map(({ stage, start, end, description }) => ({ stage, start, end, description: description ?? '' })),
    retention: {
      score: clip.retention?.score ?? 0,
      observations: clip.retention?.observations ?? [],
      riskPoints: clip.retention?.riskPoints ?? [],
    },
    cta: { text: clip.cta?.text ?? '', type: clip.cta?.type ?? 'none', score: clip.cta?.score ?? 0 },
    keyTakeaways: clip.keyTakeaways ?? [],
    scores: {
      hook: clip.scores?.hook ?? 0,
      retention: clip.scores?.retention ?? 0,
      structure: clip.scores?.structure ?? 0,
      cta: clip.scores?.cta ?? 0,
      overall: clip.scores?.overall ?? 0,
    },
    tags: clip.tags ?? [],
    isSaved: clip.isSaved ?? true,
    analysisMeta: {
      provider: clip.analysisMeta?.provider ?? 'unknown',
      model: clip.analysisMeta?.model ?? 'unknown',
      analyzedAt: (clip.analysisMeta?.analyzedAt ?? clip.createdAt).toISOString(),
    },
    createdAt: clip.createdAt.toISOString(),
    updatedAt: clip.updatedAt.toISOString(),
  };
}

const isDuplicateKeyError = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 11000;

export class ClipService {
  constructor(private readonly thumbnails?: ThumbnailCapturer) {}

  /** Saves an analysis. If the Reel is already in the library, returns the existing clip instead of duplicating it. */
  async create({ media, analysis, meta }: CreateClipInput): Promise<{ clip: ClipDto; created: boolean }> {
    const { canonicalUrl, shortcode, kind } = parseInstagramUrl(media.originalUrl);

    const existing = await ClipModel.findOne({ originalUrl: canonicalUrl });
    if (existing) {
      if (!existing.isSaved) {
        existing.isSaved = true;
        await existing.save();
      }
      return { clip: toClipDto(existing), created: false };
    }

    const thumbnailData = media.thumbnailUrl ? await this.thumbnails?.captureThumbnail(media.thumbnailUrl) : null;

    try {
      const doc = await ClipModel.create({
        originalUrl: canonicalUrl,
        shortcode,
        platform: 'instagram',
        mediaType: kind === 'post' ? 'post' : media.type,
        title: media.title,
        author: media.author,
        thumbnailUrl: media.thumbnailUrl,
        thumbnailData: thumbnailData ?? null,
        mediaUrl: media.mediaUrl,
        duration: media.duration,
        ...analysis,
        tags: deriveTags(analysis),
        isSaved: true,
        analysisMeta: { ...meta, analyzedAt: new Date(meta.analyzedAt) },
      });
      return { clip: toClipDto(doc), created: true };
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const doc = await ClipModel.findOne({ originalUrl: canonicalUrl });
        if (doc) return { clip: toClipDto(doc), created: false };
      }
      throw error;
    }
  }

  async list(query: ClipListQuery): Promise<ClipListResult> {
    const filter: Record<string, unknown> = {};
    if (query.saved !== undefined) filter.isSaved = query.saved;
    if (query.hookType) filter['hook.type'] = query.hookType;
    if (query.tag) filter.tags = query.tag.toLowerCase();
    if (query.minScore !== undefined) filter['scores.overall'] = { $gte: query.minScore };
    if (query.url) {
      try {
        filter.originalUrl = parseInstagramUrl(query.url).canonicalUrl;
      } catch {
        filter.originalUrl = '__invalid__';
      }
    }
    if (query.q) {
      const pattern = new RegExp(escapeRegex(query.q.trim()), 'i');
      filter.$or = [
        { title: pattern },
        { author: pattern },
        { summary: pattern },
        { 'hook.text': pattern },
        { 'hook.type': pattern },
        { tags: pattern },
        { 'transcript.text': pattern },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const [docs, total, hookTypes, tags] = await Promise.all([
      ClipModel.find(filter).sort(SORTS[query.sort]).skip(skip).limit(query.limit),
      ClipModel.countDocuments(filter),
      ClipModel.distinct('hook.type'),
      ClipModel.distinct('tags'),
    ]);

    return {
      items: docs.map(toClipDto),
      total,
      page: query.page,
      limit: query.limit,
      facets: {
        hookTypes: (hookTypes as string[]).filter(Boolean).sort(),
        tags: (tags as string[]).filter(Boolean).sort(),
      },
    };
  }

  async get(id: string): Promise<ClipDto> {
    return toClipDto(await this.findOrThrow(id));
  }

  async setSaved(id: string, isSaved: boolean): Promise<ClipDto> {
    const doc = await this.findOrThrow(id);
    doc.isSaved = isSaved;
    await doc.save();
    return toClipDto(doc);
  }

  async delete(id: string): Promise<void> {
    const doc = await this.findOrThrow(id);
    await doc.deleteOne();
    logger.info(`Deleted clip ${id}`);
  }

  private async findOrThrow(id: string): Promise<ClipDocument> {
    if (!isValidObjectId(id)) throw new AppError('NOT_FOUND', 'This clip could not be found. It may have been deleted.');
    const doc = await ClipModel.findById(id);
    if (!doc) throw new AppError('NOT_FOUND', 'This clip could not be found. It may have been deleted.');
    return doc;
  }
}
