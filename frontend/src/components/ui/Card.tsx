import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article';
}

export function Card({ as: Tag = 'div', className, ...rest }: CardProps) {
  return <Tag className={cn('surface p-5 sm:p-7', className)} {...rest} />;
}

interface CardHeaderProps {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ icon, eyebrow, title, action, className }: CardHeaderProps) {
  return (
    <div className={cn('mb-6 flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">{icon}</span>}
        <div className="min-w-0">
          {eyebrow && <p className="label mb-0.5">{eyebrow}</p>}
          <h3 className="truncate font-display text-lg font-bold tracking-tight text-fg sm:text-xl">{title}</h3>
        </div>
      </div>
      {action}
    </div>
  );
}
