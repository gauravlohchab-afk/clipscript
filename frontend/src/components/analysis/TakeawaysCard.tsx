import { Lightbulb } from 'lucide-react';

export function TakeawaysCard({ takeaways }: { takeaways: string[] }) {
  return (
    <section
      className="rounded-2xl border border-brand-100 bg-[linear-gradient(135deg,var(--color-brand-50)_0%,#ffffff_55%,#f5f3ff_100%)] p-5 shadow-soft sm:p-7"
      aria-label="Key takeaways"
    >
      <div className="mb-6 flex items-center gap-3">
        <span className="bg-brand-gradient grid size-9 place-items-center rounded-xl text-white shadow-cta">
          <Lightbulb className="size-4" />
        </span>
        <div>
          <p className="eyebrow mb-0.5">Apply it</p>
          <h3 className="font-display text-lg font-bold tracking-tight text-fg sm:text-xl">Key Takeaways</h3>
        </div>
      </div>
      {takeaways.length === 0 ? (
        <p className="text-sm text-muted">No takeaways generated.</p>
      ) : (
        <ol className="grid gap-3 sm:grid-cols-2">
          {takeaways.map((item, index) => (
            <li key={item} className="flex gap-4 rounded-xl border border-line bg-surface p-4 shadow-hairline">
              <span className="text-gradient font-display text-xl leading-6 font-extrabold tabular-nums">{String(index + 1).padStart(2, '0')}</span>
              <p className="text-sm leading-6 text-fg/85">{item}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
