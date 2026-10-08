import { Sparkles } from 'lucide-react';
import { useStagedProgress } from '@/hooks/useStagedProgress';
import { ProgressSteps } from './ProgressSteps';

const ANALYSIS_STEPS = [
  'Preparing video',
  'Extracting transcript',
  'Analyzing hook',
  'Reading visual text',
  'Mapping structure & retention',
  'Generating insights',
];

export function AnalyzingCard() {
  const current = useStagedProgress(ANALYSIS_STEPS.length, true, 3200);
  const progress = Math.round(((current + 0.5) / ANALYSIS_STEPS.length) * 100);

  return (
    <section className="surface animate-fade-up p-6 sm:p-10" aria-label="Analysis in progress">
      <div className="grid gap-10 md:grid-cols-[1fr_1fr] md:items-center">
        <div>
          <span className="mb-6 grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <Sparkles className="animate-pulse-soft size-5" />
          </span>
          <h2 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-[28px]">Analyzing your Reel</h2>
          <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted">
            ClipScript is watching the video and listening to the audio to build your research dossier. This usually takes under a minute.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div className="bg-brand-gradient h-full rounded-full transition-[width] duration-700" style={{ width: `${progress}%` }} />
            </div>
            <span className="w-9 text-right text-xs font-medium text-subtle tabular-nums">{progress}%</span>
          </div>
        </div>
        <div className="rounded-2xl bg-surface-2/70 p-5 sm:p-6">
          <ProgressSteps steps={ANALYSIS_STEPS} current={current} />
        </div>
      </div>
    </section>
  );
}
