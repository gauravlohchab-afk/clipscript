import { useState, type ReactNode } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useClipActions } from '@/hooks/useClipActions';
import type { ApiError } from '@/services/apiClient';
import type { Clip } from '@/types/clip';
import { ClipCard } from './ClipCard';

interface ClipGridProps {
  clips: Clip[];
  loading: boolean;
  error: ApiError | null;
  empty: ReactNode;
  onRetry: () => void;
  /** Called after a clip changed or was deleted so the page can update its list. */
  onChanged: (change: { type: 'updated'; clip: Clip } | { type: 'deleted'; id: string }) => void;
  savedLabel?: string;
}

/** Grid of ClipCards with shared loading, error, empty, toggle and delete handling. */
export function ClipGrid({ clips, loading, error, empty, onRetry, onChanged, savedLabel }: ClipGridProps) {
  const actions = useClipActions();
  const [pendingDelete, setPendingDelete] = useState<Clip | null>(null);

  if (error) return <ErrorState error={error} onRetry={onRetry} />;

  if (loading && clips.length === 0) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading clips">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="surface overflow-hidden p-2.5">
            <Skeleton className="aspect-[4/5] rounded-xl" />
            <div className="space-y-2 px-2 pt-4 pb-2">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (clips.length === 0) return <>{empty}</>;

  const toggle = async (clip: Clip) => {
    const updated = await actions.setSaved(clip.id, !clip.isSaved);
    if (updated) onChanged({ type: 'updated', clip: updated });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const ok = await actions.remove(pendingDelete.id);
    if (ok) onChanged({ type: 'deleted', id: pendingDelete.id });
    setPendingDelete(null);
  };

  return (
    <>
      <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {clips.map((clip) => (
            <ClipCard key={clip.id} clip={clip} onToggleSaved={toggle} onDelete={setPendingDelete} savedLabel={savedLabel} busy={actions.pending !== null} />
          ))}
        </div>
      </div>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this clip?"
        description={`“${pendingDelete?.title ?? ''}” and its analysis will be permanently removed from your library.`}
        loading={actions.pending === 'delete'}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
