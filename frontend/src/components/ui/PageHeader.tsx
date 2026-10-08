import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="animate-fade-up mb-10 flex flex-col gap-6 sm:mb-12 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h1 className="font-display text-[32px] leading-[1.1] font-bold tracking-[-0.03em] text-fg sm:text-[40px]">{title}</h1>
        {description && <p className="mt-3 text-[15px] leading-relaxed text-muted sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
