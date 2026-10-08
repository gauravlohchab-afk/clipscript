import { z } from 'zod';
import { analysisSchema } from './analysis.js';

const reelUrl = z
  .string({ error: 'Paste an Instagram Reel URL.' })
  .trim()
  .min(1, 'Paste an Instagram Reel URL.')
  .max(2048, 'That URL is too long.');

export const fetchMediaBody = z.object({ url: reelUrl });

export const downloadMediaBody = z.object({
  url: reelUrl,
  format: z.enum(['1080p', '720p', 'best', 'mp3'], { error: 'Choose 1080p, 720p, best available or MP3.' }),
});

export const analyzeBody = z.object({ url: reelUrl });

const downloadOptionSchema = z.object({
  format: z.enum(['1080p', '720p', 'best', 'mp3']),
  label: z.string().max(60),
  container: z.enum(['mp4', 'mp3']),
});

export const normalizedMediaSchema = z.object({
  platform: z.literal('instagram'),
  type: z.enum(['reel', 'post', 'video']),
  shortcode: z.string().min(1).max(64),
  originalUrl: z.string().url().max(2048),
  title: z.string().min(1).max(500),
  author: z.string().min(1).max(200),
  thumbnailUrl: z.string().url().max(4096).nullable(),
  mediaUrl: z.string().url().max(4096).nullable(),
  duration: z.number().min(0).max(60 * 60),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  hasAudio: z.boolean(),
  downloadOptions: z.array(downloadOptionSchema).max(5),
  provider: z.string().max(40),
});

export const createClipBody = z.object({
  media: normalizedMediaSchema,
  analysis: analysisSchema,
  meta: z.object({
    provider: z.string().min(1).max(40),
    model: z.string().min(1).max(100),
    analyzedAt: z.string().datetime(),
  }),
});

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

export const listClipsQuery = z.object({
  q: z.string().trim().max(200).optional(),
  saved: booleanString.optional(),
  hookType: z.string().trim().max(100).optional(),
  tag: z.string().trim().max(100).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  url: z.string().trim().max(2048).optional(),
  sort: z.enum(['newest', 'oldest', 'overall', 'hook', 'duration']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const updateClipBody = z.object({ isSaved: z.boolean() });

export const clipIdParams = z.object({ id: z.string().min(1).max(64) });

export const assetProxyQuery = z.object({ src: z.string().url().max(4096) });
