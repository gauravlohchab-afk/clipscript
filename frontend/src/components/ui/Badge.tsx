import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

type Tone = 'neutral' | 'brand' | 'violet' | 'success' | 'warning' | 'danger';

const tones: Record<Tone, string> = {
  neutral: 'border-line bg-surface-2 text-muted',
  brand: 'border-brand-200 bg-brand-50 text-brand-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-red-200 bg-red-50 text-red-700',
};

export function Badge({ tone = 'neutral', icon, children, className }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', tones[tone], className)}>
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}
