import { Zap } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ScoreValue } from '@/components/ui/ScoreRing';
import type { Hook } from '@/types/analysis';
import { scoreLabel, scoreTone } from '@/utils/format';

export function HookCard({ hook }: { hook: Hook }) {
  return (
    <Card as="section" aria-label="Hook analysis">
      <div className="mb-5 flex items-center gap-2">
        <Zap className="size-4 text-brand-600" />
        <p className="eyebrow">Hook analysis · First 3 seconds</p>
      </div>

      <blockquote className="font-display text-2xl leading-snug font-semibold tracking-[-0.02em] text-fg sm:text-[30px]">
        <span className="text-gradient">“</span>
        {hook.text || 'No spoken hook detected'}
        <span className="text-gradient">”</span>
      </blockquote>

      <dl className="mt-7 grid grid-cols-2 gap-6 border-t border-line pt-6">
        <div className="min-w-0">
          <dt className="label">Hook type</dt>
          <dd className="mt-2">
            <Badge tone="brand">{hook.type}</Badge>
          </dd>
        </div>
        <div>
          <dt className="label">Score</dt>
          <dd className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <ScoreValue score={hook.score} className="text-[28px]" />
            <span className="text-xs text-muted">{scoreLabel[scoreTone(hook.score)]}</span>
          </dd>
        </div>
      </dl>

      {hook.whyItWorks && (
        <div className="mt-6 rounded-xl border border-brand-100 bg-brand-50/60 p-5">
          <p className="mb-1.5 text-xs font-semibold tracking-[0.08em] text-brand-700 uppercase">Why it works</p>
          <p className="text-[15px] leading-relaxed text-fg/80">{hook.whyItWorks}</p>
        </div>
      )}
    </Card>
  );
}
