import { MousePointerClick } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { ScoreValue } from '@/components/ui/ScoreRing';
import type { Cta } from '@/types/analysis';

export function CtaCard({ cta }: { cta: Cta }) {
  const hasCta = Boolean(cta.text) && cta.type !== 'none';
  return (
    <Card as="section">
      <CardHeader
        icon={<MousePointerClick className="size-4" />}
        eyebrow="Call to action"
        title="CTA Analysis"
        action={<ScoreValue score={cta.score} className="text-2xl" />}
      />
      {hasCta ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-lg leading-snug font-semibold tracking-tight text-fg sm:text-xl">“{cta.text}”</p>
          <Badge tone="violet" className="self-start sm:self-auto">
            {cta.type}
          </Badge>
        </div>
      ) : (
        <p className="rounded-xl bg-surface-2/70 px-4 py-6 text-center text-sm text-muted">This Reel has no explicit call to action.</p>
      )}
    </Card>
  );
}
