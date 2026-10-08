import { useCallback, useState } from 'react';
import { ApiError } from '@/services/apiClient';
import { clipService, exportService, type ExportFormat } from '@/services/clipService';
import type { AnalysisResult } from '@/types/analysis';
import { saveBlob } from '@/utils/file';
import { useToast } from './toastContext';

export type ClipAction = 'save' | 'toggle' | 'delete' | 'markdown' | 'json' | 'copy';

/** Save / remove / delete / export with per-action loading state and toasts. */
export function useClipActions() {
  const toast = useToast();
  const [pending, setPending] = useState<ClipAction | null>(null);

  const run = useCallback(
    async <T,>(action: ClipAction, task: () => Promise<T>, errorTitle: string): Promise<T | null> => {
      setPending(action);
      try {
        return await task();
      } catch (error) {
        const apiError = error instanceof ApiError ? error : new ApiError('UNKNOWN', 'Please try again.');
        toast.show({ title: errorTitle, description: apiError.message, tone: 'error' });
        return null;
      } finally {
        setPending(null);
      }
    },
    [toast],
  );

  const save = useCallback(
    (result: AnalysisResult) =>
      run(
        'save',
        async () => {
          const clip = await clipService.save(result);
          toast.show({ title: 'Saved to your library', description: clip.title, tone: 'success' });
          return clip;
        },
        'Could not save clip',
      ),
    [run, toast],
  );

  const setSaved = useCallback(
    (id: string, isSaved: boolean) =>
      run(
        'toggle',
        async () => {
          const clip = await clipService.setSaved(id, isSaved);
          toast.show({ title: isSaved ? 'Added to Saved Clips' : 'Removed from Saved Clips', tone: 'success' });
          return clip;
        },
        'Could not update clip',
      ),
    [run, toast],
  );

  const remove = useCallback(
    (id: string) =>
      run(
        'delete',
        async () => {
          await clipService.remove(id);
          toast.show({ title: 'Clip deleted', tone: 'success' });
          return true;
        },
        'Could not delete clip',
      ),
    [run, toast],
  );

  const download = useCallback(
    (id: string, format: ExportFormat) =>
      run(
        format,
        async () => {
          const { blob, filename } = await exportService.file(id, format);
          saveBlob(blob, filename ?? `clipscript-analysis.${format === 'markdown' ? 'md' : 'json'}`);
          return true;
        },
        'Export failed',
      ),
    [run],
  );

  const markdown = useCallback((id: string) => run('copy', () => exportService.markdownText(id), 'Export failed'), [run]);

  return { pending, save, setSaved, remove, download, markdown };
}

export type ClipActions = ReturnType<typeof useClipActions>;
