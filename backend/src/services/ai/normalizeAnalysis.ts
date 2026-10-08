import { analysisSchema, type Analysis } from '../../types/analysis.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';

type Loose = Record<string, unknown>;

const isObject = (value: unknown): value is Loose => typeof value === 'object' && value !== null && !Array.isArray(value);
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

const clampTime = (value: unknown, duration: number) => {
  const seconds = Math.max(0, asNumber(value));
  const bounded = duration > 0 ? Math.min(seconds, duration) : seconds;
  return Math.round(bounded * 10) / 10;
};

const clampScore = (value: unknown, scale: number) => Math.round(Math.min(100, Math.max(0, asNumber(value) * scale)));

/** Some models answer on a 0–10 scale despite instructions; detect that and rescale. */
function detectScoreScale(raw: Loose): number {
  const scores = isObject(raw.scores) ? Object.values(raw.scores).map((value) => asNumber(value, -1)) : [];
  const valid = scores.filter((value) => value >= 0);
  return valid.length > 0 && valid.every((value) => value <= 10) && valid.some((value) => value > 1) ? 10 : 1;
}

/**
 * Turns untrusted AI output into a valid Analysis, or throws AI_INVALID_RESPONSE.
 * Coerces types, clamps timestamps and scores, drops empty entries, and fills derivable fields,
 * so a slightly malformed response never reaches (or breaks) the frontend.
 */
export function normalizeAnalysis(raw: unknown, duration: number): Analysis {
  if (!isObject(raw)) {
    throw new AppError('AI_INVALID_RESPONSE', 'The AI returned an unreadable analysis. Please try again.');
  }
  const scale = detectScoreScale(raw);

  const transcript = asArray(raw.transcript)
    .filter(isObject)
    .map((segment) => {
      const start = clampTime(segment.start, duration);
      const end = Math.max(start, clampTime(segment.end ?? segment.start, duration));
      return { start, end, text: asString(segment.text) };
    })
    .filter((segment) => segment.text.length > 0)
    .sort((a, b) => a.start - b.start);

  const hookRaw = isObject(raw.hook) ? raw.hook : {};
  const hook = {
    text: asString(hookRaw.text, transcript[0]?.text ?? ''),
    type: asString(hookRaw.type) || 'Unclassified',
    whyItWorks: asString(hookRaw.whyItWorks ?? hookRaw.why_it_works),
    score: clampScore(hookRaw.score, scale),
  };

  const onScreenText = asArray(raw.onScreenText ?? raw.on_screen_text)
    .filter(isObject)
    .map((item) => ({ timestamp: clampTime(item.timestamp ?? item.time, duration), text: asString(item.text) }))
    .filter((item) => item.text.length > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  const structure = asArray(raw.structure)
    .filter(isObject)
    .map((section) => {
      const start = clampTime(section.start, duration);
      return {
        stage: asString(section.stage).toLowerCase() || 'section',
        start,
        end: Math.max(start, clampTime(section.end ?? section.start, duration)),
        description: asString(section.description),
      };
    })
    .sort((a, b) => a.start - b.start);

  const retentionRaw = isObject(raw.retention) ? raw.retention : {};
  const retention = {
    score: clampScore(retentionRaw.score, scale),
    observations: asArray(retentionRaw.observations).map((item) => asString(item)).filter(Boolean),
    riskPoints: asArray(retentionRaw.riskPoints ?? retentionRaw.risk_points).map((item) => asString(item)).filter(Boolean),
  };

  const ctaRaw = isObject(raw.cta) ? raw.cta : {};
  const ctaText = asString(ctaRaw.text);
  const cta = {
    text: ctaText,
    type: asString(ctaRaw.type) || (ctaText ? 'Unclassified' : 'none'),
    score: clampScore(ctaRaw.score, scale),
  };

  const scoresRaw = isObject(raw.scores) ? raw.scores : {};
  const partial = {
    hook: scoresRaw.hook !== undefined ? clampScore(scoresRaw.hook, scale) : hook.score,
    retention: scoresRaw.retention !== undefined ? clampScore(scoresRaw.retention, scale) : retention.score,
    structure: clampScore(scoresRaw.structure, scale),
    cta: scoresRaw.cta !== undefined ? clampScore(scoresRaw.cta, scale) : cta.score,
  };
  const overall =
    scoresRaw.overall !== undefined
      ? clampScore(scoresRaw.overall, scale)
      : Math.round(partial.hook * 0.35 + partial.retention * 0.3 + partial.structure * 0.2 + partial.cta * 0.15);

  const candidate = {
    summary: asString(raw.summary) || 'No summary was generated for this Reel.',
    transcript,
    hook,
    onScreenText,
    structure,
    retention,
    cta,
    keyTakeaways: asArray(raw.keyTakeaways ?? raw.key_takeaways).map((item) => asString(item)).filter(Boolean),
    scores: { ...partial, overall },
  };

  const result = analysisSchema.safeParse(candidate);
  if (!result.success) {
    logger.warn('AI analysis failed validation', result.error.issues);
    throw new AppError('AI_INVALID_RESPONSE', 'The AI returned an incomplete analysis. Please try again.');
  }
  return result.data;
}
