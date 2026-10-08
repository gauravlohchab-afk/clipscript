import { Skeleton } from '@/components/ui/Skeleton';
import { useStagedProgress } from '@/hooks/useStagedProgress';
import { ProgressSteps } from './ProgressSteps';

const FETCH_STEPS = ['Validating URL', 'Fetching media', 'Preparing preview'];

export function FetchingCard({ phase }: { phase: 'validating' | 'fetching' }) {
  const fetchStage = useStagedProgress(2, phase === 'fetching', 2500);
  const current = phase === 'validating' ? 0 : 1 + fetchStage;

  return (
    <div className="surface animate-fade-up grid gap-8 p-5 sm:grid-cols-[220px_1fr] sm:p-8">
      <Skeleton className="aspect-[9/16] w-full max-w-[220px] justify-self-center rounded-2xl" />
      <div className="flex flex-col justify-center gap-8">
        <div className="space-y-3">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-7 w-4/5" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
        <ProgressSteps steps={FETCH_STEPS} current={current} />
      </div>
    </div>
  );
}
