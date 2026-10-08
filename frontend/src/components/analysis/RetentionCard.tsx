import { AlertTriangle, Eye, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { ScoreValue } from '@/components/ui/ScoreRing';
import type { Retention } from '@/types/analysis';
import { cn } from '@/utils/cn';

function Column({ tone, icon, title, items, empty }: { tone: 'positive' | 'risk'; icon: ReactNode; title: string; items: string[]; empty: string }) {
  const positive = tone === 'positive';
  return (
    <div className={cn('rounded-xl border p-5', positive ? 'border-emerald-100 bg-emerald-50/50' : 'border-amber-100 bg-amber-50/50')}>
      <p className={cn('mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-[0.08em] uppercase', positive ? 'text-emerald-700' : 'text-amber-700')}>
        {icon} {title}
      </p>
      {items.length ? (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-fg/85">
              <span className={cn('mt-2 size-1.5 shrink-0 rounded-full', positive ? 'bg-emerald-500' : 'bg-amber-500')} aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{empty}</p>
      )}
    </div>
  );
}

export function RetentionCard({ retention }: { retention: Retention }) {
  return (
    <Card as="section">
      <CardHeader
        icon={<Eye className="size-4" />}
        eyebrow="Watch-time patterns"
        title="Retention Analysis"
        action={<ScoreValue score={retention.score} className="text-2xl" />}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Column
          tone="positive"
          icon={<TrendingUp className="size-3.5" />}
          title="What keeps viewers"
          items={retention.observations}
          empty="No observations recorded."
        />
        <Column
          tone="risk"
          icon={<AlertTriangle className="size-3.5" />}
          title="Drop-off risks"
          items={retention.riskPoints}
          empty="No significant risk points found."
        />
      </div>
    </Card>
  );
}
