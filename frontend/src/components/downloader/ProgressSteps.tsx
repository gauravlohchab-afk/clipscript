import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ProgressStepsProps {
  steps: string[];
  current: number;
  className?: string;
}

/** Vertical list of named stages: done ✓, active pulsing dot, upcoming dimmed. */
export function ProgressSteps({ steps, current, className }: ProgressStepsProps) {
  return (
    <ol className={cn('space-y-3', className)} aria-live="polite">
      {steps.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'active' : 'todo';
        return (
          <li key={step} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                'grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-300',
                state === 'done' && 'border-transparent bg-brand-gradient text-white',
                state === 'active' && 'border-brand-300 bg-brand-50',
                state === 'todo' && 'border-line bg-surface',
              )}
            >
              {state === 'done' && <Check className="size-3" strokeWidth={3} />}
              {state === 'active' && <span className="animate-pulse-soft size-1.5 rounded-full bg-brand-500" />}
            </span>
            <span className={cn('transition-colors', state === 'active' ? 'font-medium text-fg' : state === 'done' ? 'text-muted' : 'text-subtle')}>
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
