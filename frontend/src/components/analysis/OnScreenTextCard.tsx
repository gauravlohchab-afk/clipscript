import { Type } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import type { OnScreenText } from '@/types/analysis';
import { formatTimestamp } from '@/utils/format';

export function OnScreenTextCard({ items }: { items: OnScreenText[] }) {
  return (
    <Card as="section">
      <CardHeader icon={<Type className="size-4" />} eyebrow="Visual text" title="On-Screen Text" />
      {items.length === 0 ? (
        <p className="rounded-xl bg-surface-2/70 px-4 py-6 text-center text-sm text-muted">No text overlays were detected.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item, index) => (
            <li key={`${item.timestamp}-${index}`} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
              <span className="mt-0.5 shrink-0 rounded-md bg-violet-50 px-2 py-0.5 font-mono text-[11px] font-medium text-violet-700 tabular-nums">
                {formatTimestamp(item.timestamp)}
              </span>
              <p className="min-w-0 text-[15px] font-medium break-words text-fg">{item.text}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
