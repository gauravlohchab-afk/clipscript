import './setup.js';
import { describe, expect, it } from 'vitest';
import { normalizeAnalysis } from '../src/services/ai/normalizeAnalysis.js';
import { buildDownloadOptions } from '../src/services/media/downloadOptions.js';
import { clipToMarkdown } from '../src/services/export/markdownExporter.js';
import type { ClipDto } from '../src/types/clip.js';
import { AppError } from '../src/utils/AppError.js';
import { parseInstagramUrl } from '../src/utils/instagramUrl.js';

describe('parseInstagramUrl', () => {
  it('normalizes reel URLs and strips tracking params', () => {
    expect(parseInstagramUrl('https://www.instagram.com/reel/C9abcDEF12/?igsh=xyz')).toEqual({
      shortcode: 'C9abcDEF12',
      kind: 'reel',
      canonicalUrl: 'https://www.instagram.com/reel/C9abcDEF12/',
    });
    expect(parseInstagramUrl('instagram.com/reels/C9abcDEF12').canonicalUrl).toBe('https://www.instagram.com/reel/C9abcDEF12/');
    expect(parseInstagramUrl('https://www.instagram.com/p/C9abcDEF12/').kind).toBe('post');
  });

  it.each([
    ['not a url ::', 'INVALID_URL'],
    ['https://www.tiktok.com/@a/video/1', 'UNSUPPORTED_URL'],
    ['https://www.instagram.com/stories/someone/123/', 'UNSUPPORTED_URL'],
    ['https://www.instagram.com/someuser/', 'UNSUPPORTED_URL'],
  ])('rejects %s with %s', (url, code) => {
    try {
      parseInstagramUrl(url);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe(code);
    }
  });
});

describe('buildDownloadOptions', () => {
  it('never offers formats above the source resolution', () => {
    expect(buildDownloadOptions({ width: 720, height: 1280, hasVideo: true, hasAudio: true }).map((o) => o.format)).toEqual(['720p', 'mp3']);
    expect(buildDownloadOptions({ width: 1080, height: 1920, hasVideo: true, hasAudio: false }).map((o) => o.format)).toEqual(['1080p', '720p']);
    expect(buildDownloadOptions({ width: null, height: null, hasVideo: false, hasAudio: false })).toEqual([]);
    expect(buildDownloadOptions({ width: 640, height: 640, hasVideo: true, hasAudio: true })).toEqual([
      { format: 'best', label: 'MP4 · 640p (best available)', container: 'mp4' },
      { format: 'mp3', label: 'Audio · MP3', container: 'mp3' },
    ]);
  });
});

describe('normalizeAnalysis', () => {
  it('coerces sloppy model output into a valid analysis', () => {
    const analysis = normalizeAnalysis(
      {
        summary: 'A reel',
        transcript: [
          { start: '4', end: '2', text: ' second ' },
          { start: 0, end: 3, text: 'first' },
          { start: 5, end: 6, text: '' },
        ],
        hook: { text: 'Stop', type: 'Command', why_it_works: 'Because', score: '8.5' },
        on_screen_text: [{ time: 99, text: 'LATE' }],
        structure: [{ stage: 'HOOK', start: 0, end: 3, description: 'x' }],
        retention: { score: 7, observations: ['ok', 3], risk_points: [] },
        cta: null,
        keyTakeaways: ['Do this'],
        scores: { hook: 8.5, retention: 7, structure: 6, cta: 0, overall: 7 },
      },
      30,
    );
    expect(analysis.transcript.map((s) => s.text)).toEqual(['first', 'second']);
    expect(analysis.transcript[1]).toMatchObject({ start: 4, end: 4 });
    expect(analysis.onScreenText[0]?.timestamp).toBe(30);
    expect(analysis.structure[0]?.stage).toBe('hook');
    expect(analysis.hook).toMatchObject({ whyItWorks: 'Because', score: 85 });
    expect(analysis.scores).toEqual({ hook: 85, retention: 70, structure: 60, cta: 0, overall: 70 });
    expect(analysis.cta).toEqual({ text: '', type: 'none', score: 0 });
  });

  it('computes overall when missing and clamps scores', () => {
    const analysis = normalizeAnalysis({ summary: 's', hook: { score: 150 }, retention: { score: 50 }, cta: { score: 50 }, scores: {} }, 10);
    expect(analysis.hook.score).toBe(100);
    expect(analysis.scores.overall).toBe(Math.round(100 * 0.35 + 50 * 0.3 + 0 * 0.2 + 50 * 0.15));
  });

  it('rejects non-object output', () => {
    expect(() => normalizeAnalysis('nope', 10)).toThrowError(AppError);
    expect(() => normalizeAnalysis(null, 10)).toThrowError(/unreadable/);
  });
});

describe('clipToMarkdown', () => {
  it('renders every required section', () => {
    const clip = {
      id: '1',
      originalUrl: 'https://www.instagram.com/reel/ABCDE/',
      shortcode: 'ABCDE',
      platform: 'instagram',
      mediaType: 'reel',
      title: 'Title',
      author: 'creator',
      thumbnailUrl: null,
      thumbnailData: null,
      mediaUrl: null,
      duration: 65,
      summary: 'Summary text',
      transcript: [{ start: 61, end: 64, text: 'Hello' }],
      hook: { text: 'Hook', type: 'Question', whyItWorks: 'Why', score: 80 },
      onScreenText: [],
      structure: [{ stage: 'hook', start: 0, end: 3, description: 'a | b' }],
      retention: { score: 70, observations: ['obs'], riskPoints: [] },
      cta: { text: 'Follow', type: 'Follow', score: 60 },
      keyTakeaways: ['One'],
      scores: { hook: 80, retention: 70, structure: 75, cta: 60, overall: 74 },
      tags: [],
      isSaved: true,
      analysisMeta: { provider: 'mock', model: 'm', analyzedAt: '2026-01-01T00:00:00.000Z' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    } satisfies ClipDto;
    const markdown = clipToMarkdown(clip);
    for (const heading of ['# Reel Analysis', '## Summary', '## Hook', '## Transcript', '## Content Structure', '## Retention Analysis', '## CTA', '## Key Takeaways', '## Scores']) {
      expect(markdown).toContain(heading);
    }
    expect(markdown).toContain('**[1:01–1:04]** Hello');
    expect(markdown).toContain('a \\| b');
    expect(markdown).toContain('| **Overall** | **74** |');
  });
});

describe('Gemini response schema', () => {
  it('is derived from the analysis contract', async () => {
    const { buildResponseSchema } = await import('../src/services/ai/geminiService.js');
    const schema = buildResponseSchema() as { type: string; required: string[]; properties: Record<string, unknown> };
    expect(schema.type).toBe('object');
    expect(schema.required).toEqual(
      expect.arrayContaining(['summary', 'transcript', 'hook', 'onScreenText', 'structure', 'retention', 'cta', 'keyTakeaways', 'scores']),
    );
    expect(schema).not.toHaveProperty('$schema');
  });
});
