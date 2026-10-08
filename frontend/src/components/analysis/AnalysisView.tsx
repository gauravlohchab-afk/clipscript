import type { ReactNode } from 'react';
import type { AnalysisDossier } from '@/types/clip';
import { CtaCard } from './CtaCard';
import { HookCard } from './HookCard';
import { OnScreenTextCard } from './OnScreenTextCard';
import { RetentionCard } from './RetentionCard';
import { ScoresCard } from './ScoresCard';
import { StructureCard } from './StructureCard';
import { TakeawaysCard } from './TakeawaysCard';
import { TranscriptCard } from './TranscriptCard';
import { VideoSummaryCard } from './VideoSummaryCard';

interface AnalysisViewProps {
  dossier: AnalysisDossier;
  actions: ReactNode;
}

/**
 * The full research dossier, shared by the Downloader (fresh analysis) and the Clip page (saved).
 * Reading order: video → overview → hook → transcript → structure → visual text → retention → CTA → takeaways.
 */
export function AnalysisView({ dossier, actions }: AnalysisViewProps) {
  const { analysis, media } = dossier;
  return (
    <div className="animate-fade-up grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-8">
      <aside className="lg:sticky lg:top-24">
        <VideoSummaryCard dossier={dossier} />
      </aside>
      <div className="min-w-0 space-y-6">
        {actions}
        <ScoresCard scores={analysis.scores} summary={analysis.summary} />
        <HookCard hook={analysis.hook} />
        <TranscriptCard transcript={analysis.transcript} />
        <StructureCard structure={analysis.structure} duration={media.duration} />
        <OnScreenTextCard items={analysis.onScreenText} />
        <RetentionCard retention={analysis.retention} />
        <CtaCard cta={analysis.cta} />
        <TakeawaysCard takeaways={analysis.keyTakeaways} />
      </div>
    </div>
  );
}
