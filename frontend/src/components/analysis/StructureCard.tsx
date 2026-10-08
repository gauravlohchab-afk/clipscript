import { Layers } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import type { StructureSection } from '@/types/analysis';
import { formatTimestamp } from '@/utils/format';

const STAGE_COLORS = ['#d946ef', '#c056f0', '#a855f7', '#8b5cf6', '#7c3aed', '#6d5ef5', '#6366f1'];

export function StructureCard({ structure, duration }: { structure: StructureSection[]; duration: number }) {
  const total = Math.max(duration, structure.at(-1)?.end ?? 0, 1);

  return (
    <Card as="section">
      <CardHeader icon={<Layers className="size-4" />} eyebrow="Detected sequence" title="Content Structure" />
      {structure.length === 0 ? (
        <p className="rounded-xl bg-surface-2/70 px-4 py-6 text-center text-sm text-muted">No clear structure was detected.</p>
      ) : (
        <>
          <div className="mb-8 flex h-1.5 gap-1" aria-hidden>
            {structure.map((section, index) => (
              <div
                key={`${section.stage}-${index}`}
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(((section.end - section.start) / total) * 100, 3)}%`,
                  backgroundColor: STAGE_COLORS[index % STAGE_COLORS.length],
                }}
              />
            ))}
          </div>

          <ol>
            {structure.map((section, index) => {
              const color = STAGE_COLORS[index % STAGE_COLORS.length];
              const last = index === structure.length - 1;
              return (
                <li key={`${section.stage}-${index}`} className="relative grid grid-cols-[1.5rem_1fr] gap-4">
                  <div className="flex flex-col items-center" aria-hidden>
                    <span className="mt-1.5 size-3 shrink-0 rounded-full border-[3px] border-surface shadow-[0_0_0_1px_var(--color-line)]" style={{ backgroundColor: color }} />
                    {!last && <span className="mt-1 w-px flex-1 bg-line" />}
                  </div>
                  <div className={last ? 'pb-0' : 'pb-6'}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-bold tracking-[0.12em] text-fg uppercase">{section.stage}</span>
                      <span className="font-mono text-xs text-subtle tabular-nums">
                        {formatTimestamp(section.start)} – {formatTimestamp(section.end)}
                      </span>
                    </div>
                    {section.description && <p className="mt-2 text-sm leading-relaxed text-muted">{section.description}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </Card>
  );
}
