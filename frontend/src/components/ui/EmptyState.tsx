import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'animate-fade-up flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface/60 px-6 py-16 text-center sm:py-24',
        className,
      )}
    >
      <div className="mb-6 grid size-14 place-items-center rounded-2xl border border-brand-100 bg-brand-50 text-brand-600">{icon}</div>
      <h3 className="font-display text-xl font-bold tracking-tight text-fg sm:text-2xl">{title}</h3>
      <div className="mt-2 max-w-md text-sm leading-relaxed text-muted sm:text-[15px]">{description}</div>
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
