import { Card } from '@/components/ui/Card';
import { ScoreRing, ScoreValue } from '@/components/ui/ScoreRing';
import type { Scores } from '@/types/analysis';
import { scoreLabel, scoreTone, scoreToneColor } from '@/utils/format';

const METRICS: Array<{ key: keyof Omit<Scores, 'overall'>; label: string }> = [
  { key: 'hook', label: 'Hook' },
  { key: 'retention', label: 'Retention' },
  { key: 'structure', label: 'Structure' },
  { key: 'cta', label: 'CTA' },
];

function ScoreTile({ label, score }: { label: string; score: number }) {
  const tone = scoreTone(score);
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="label">{label}</p>
      <ScoreValue score={score} className="mt-3 text-[28px]" />
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, score))}%`, backgroundColor: scoreToneColor[tone] }} />
      </div>
      <p className="mt-2 text-xs text-muted">{scoreLabel[tone]}</p>
    </div>
  );
}

/** Overview: the AI summary plus the overall and per-area scores. */
export function ScoresCard({ scores, summary }: { scores: Scores; summary?: string }) {
  return (
    <Card as="section" aria-label="Overview">
      <p className="eyebrow mb-3">Overview</p>
      {summary && <p className="max-w-3xl text-[17px] leading-relaxed text-fg">{summary}</p>}
      <div className="mt-7 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-stretch">
        <div className="flex items-center justify-center gap-5 rounded-xl bg-surface-2/70 px-6 py-5 sm:flex-col sm:gap-2">
          <ScoreRing score={scores.overall} size={112} stroke={8} />
          <div className="text-left sm:text-center">
            <p className="label">Overall</p>
            <p className="mt-1 text-sm font-medium" style={{ color: scoreToneColor[scoreTone(scores.overall)] }}>
              {scoreLabel[scoreTone(scores.overall)]}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {METRICS.map(({ key, label }) => (
            <ScoreTile key={key} label={label} score={scores[key]} />
          ))}
        </div>
      </div>
    </Card>
  );
}
