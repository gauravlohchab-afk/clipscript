import { ArrowLeft } from 'lucide-react';
import { useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnalysisActions } from '@/components/analysis/AnalysisActions';
import { AnalysisView } from '@/components/analysis/AnalysisView';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useClip } from '@/hooks/useClip';
import { dossierFromClip } from '@/utils/dossier';

function LoadingDossier() {
  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]" aria-busy="true" aria-label="Loading analysis">
      <Skeleton className="aspect-[9/16] w-full max-w-[300px] rounded-2xl" />
      <div className="space-y-5">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function ClipAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clip, setClip, loading, error, refetch } = useClip(id);
  const ensureClip = useCallback(async () => clip, [clip]);

  return (
    <div className="space-y-8">
      <Link to="/library" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-fg">
        <ArrowLeft className="size-4" /> Script Library
      </Link>

      {loading && !clip && <LoadingDossier />}
      {error && (
        <ErrorState
          error={error}
          onRetry={error.code === 'NOT_FOUND' ? undefined : refetch}
          extra={
            error.code === 'NOT_FOUND' && (
              <Link to="/library" className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:text-brand-600">
                Back to the library →
              </Link>
            )
          }
        />
      )}

      {clip && (
        <>
          <header>
            <p className="eyebrow mb-2">Clip analysis</p>
            <h1 className="max-w-4xl font-display text-[28px] leading-tight font-bold tracking-[-0.03em] text-fg sm:text-[36px]">{clip.title}</h1>
          </header>
          <AnalysisView
            dossier={dossierFromClip(clip)}
            actions={
              <AnalysisActions
                dossier={dossierFromClip(clip)}
                ensureClip={ensureClip}
                onClipChange={setClip}
                onDeleted={() => navigate('/library', { replace: true })}
              />
            }
          />
        </>
      )}
    </div>
  );
}
