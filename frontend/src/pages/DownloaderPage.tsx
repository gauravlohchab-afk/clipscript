import { FileText, ScanText, Sparkles, Zap } from 'lucide-react';
import { useCallback, useState } from 'react';
import { AnalysisActions } from '@/components/analysis/AnalysisActions';
import { AnalysisView } from '@/components/analysis/AnalysisView';
import { AnalyzingCard } from '@/components/downloader/AnalyzingCard';
import { FetchingCard } from '@/components/downloader/FetchingCard';
import { MediaPreview } from '@/components/downloader/MediaPreview';
import { SampleUrls } from '@/components/downloader/SampleUrls';
import { UrlForm } from '@/components/downloader/UrlForm';
import { ErrorState } from '@/components/ui/ErrorState';
import { useClipActions } from '@/hooks/useClipActions';
import { useReelWorkflow } from '@/hooks/useReelWorkflow';
import { dossierFromResult } from '@/utils/dossier';

const FEATURES = [
  { icon: ScanText, title: 'Script extraction', text: 'Timestamped, near-verbatim transcript of every spoken line.' },
  { icon: Zap, title: 'Hook intelligence', text: 'The first 3 seconds decoded: type, psychology and score.' },
  { icon: Sparkles, title: 'Structure & retention', text: 'Sections, pacing, drop-off risks and the CTA, scored.' },
  { icon: FileText, title: 'Research library', text: 'Save, search and export clean Markdown or JSON dossiers.' },
];

export function DownloaderPage() {
  const { state, fetchMedia, analyze, setSavedClip, reset } = useReelWorkflow();
  const { save } = useClipActions();
  const [sample, setSample] = useState<{ url: string; nonce: number } | null>(null);

  const busy = state.phase === 'validating' || state.phase === 'fetching' || state.phase === 'analyzing';
  const busyLabel = state.phase === 'validating' ? 'Validating URL…' : state.phase === 'analyzing' ? 'Analyzing…' : 'Fetching media…';

  const ensureClip = useCallback(async () => {
    if (state.savedClip && state.result && state.savedClip.originalUrl === state.result.media.originalUrl) return state.savedClip;
    if (!state.result) return null;
    const clip = await save(state.result);
    if (clip) setSavedClip(clip);
    return clip;
  }, [save, setSavedClip, state.result, state.savedClip]);

  const dossier = state.phase === 'complete' && state.result ? dossierFromResult(state.result, state.savedClip) : null;

  return (
    <div className="space-y-12 sm:space-y-16">
      <section className="pt-2 text-center sm:pt-6">
        <p className="eyebrow animate-fade-up mb-5">AI-powered Reel research</p>
        <h1 className="animate-fade-up mx-auto max-w-4xl font-display text-[38px] leading-[1.06] font-extrabold tracking-[-0.04em] text-fg sm:text-[56px] lg:text-[64px]">
          Turn Viral Reels Into <br className="hidden sm:block" />
          <span className="text-gradient">Actionable Insights.</span>
        </h1>
        <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          Analyze Instagram Reels, extract their scripts, understand their hooks, and uncover the content patterns that make them work.
        </p>

        <div className="mx-auto mt-10 max-w-3xl sm:mt-12">
          <UrlForm initialUrl={state.url} busy={busy} busyLabel={busyLabel} onSubmit={fetchMedia} externalUrl={sample} />
          <SampleUrls disabled={busy} onPick={(url) => setSample({ url, nonce: Date.now() })} />
        </div>
      </section>

      {state.error && state.errorStage === 'fetch' && (
        <ErrorState error={state.error} onRetry={() => fetchMedia(state.url)} className="mx-auto max-w-3xl" />
      )}

      {(state.phase === 'validating' || state.phase === 'fetching') && <FetchingCard phase={state.phase} />}

      {state.media && (state.phase === 'ready' || state.phase === 'analyzing' || state.phase === 'complete') && (
        <MediaPreview
          media={state.media}
          savedClip={state.savedClip}
          analyzing={state.phase === 'analyzing'}
          analyzed={state.phase === 'complete'}
          onAnalyze={analyze}
          footer={
            <button type="button" onClick={reset} className="mt-4 self-start text-xs text-subtle underline-offset-4 hover:text-fg hover:underline">
              Start over with a different Reel
            </button>
          }
        />
      )}

      {state.error && state.errorStage === 'analyze' && <ErrorState error={state.error} onRetry={analyze} retryLabel="Retry analysis" />}

      {state.phase === 'analyzing' && <AnalyzingCard />}

      {dossier && state.result && (
        <section aria-label="Analysis results" className="space-y-8">
          <div className="border-t border-line pt-12">
            <p className="eyebrow mb-2">Research dossier</p>
            <h2 className="font-display text-[28px] font-bold tracking-[-0.03em] text-fg sm:text-[36px]">Analysis results</h2>
          </div>
          <AnalysisView
            dossier={dossier}
            actions={
              <AnalysisActions
                dossier={dossier}
                ensureClip={ensureClip}
                onClipChange={setSavedClip}
                onDeleted={() => setSavedClip(null)}
                showOpen
              />
            }
          />
        </section>
      )}

      {state.phase === 'idle' && !state.error && (
        <section className="grid grid-cols-2 gap-x-5 gap-y-10 border-t border-line pt-12 sm:gap-x-8 lg:grid-cols-4" aria-label="What ClipScript extracts">
          {FEATURES.map(({ icon: Icon, title, text }, index) => (
            <div key={title} className="animate-fade-up" style={{ animationDelay: `${index * 70}ms` }}>
              <span className="grid size-10 place-items-center rounded-xl border border-line bg-surface text-brand-600 shadow-hairline">
                <Icon className="size-[18px]" />
              </span>
              <h3 className="mt-5 font-display text-[15px] font-bold tracking-tight text-fg sm:text-base">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
