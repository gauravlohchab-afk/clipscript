import { useCallback, useEffect, useRef, useState } from 'react';
import { analysisService } from '@/services/analysisService';
import type { ApiError } from '@/services/apiClient';
import { clipService } from '@/services/clipService';
import { mediaService } from '@/services/mediaService';
import type { AnalysisResult } from '@/types/analysis';
import type { Clip } from '@/types/clip';
import type { Media } from '@/types/media';

export type WorkflowPhase = 'idle' | 'validating' | 'fetching' | 'ready' | 'analyzing' | 'complete';

export interface WorkflowState {
  phase: WorkflowPhase;
  url: string;
  media: Media | null;
  result: AnalysisResult | null;
  /** The library entry for this Reel, if it has been saved. */
  savedClip: Clip | null;
  error: ApiError | null;
  errorStage: 'fetch' | 'analyze' | null;
}

const STORAGE_KEY = 'clipscript:workflow';
const initialState: WorkflowState = { phase: 'idle', url: '', media: null, result: null, savedClip: null, error: null, errorStage: null };

function restore(): WorkflowState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const saved = JSON.parse(raw) as WorkflowState;
    if (saved.phase === 'ready' || saved.phase === 'complete') return { ...saved, error: null, errorStage: null };
  } catch {
    // Ignore corrupt session data.
  }
  return initialState;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Drives the Downloader: validate → fetch media → analyze → (save). Stale responses are ignored. */
export function useReelWorkflow() {
  const [state, setState] = useState<WorkflowState>(restore);
  const runId = useRef(0);

  useEffect(() => {
    try {
      if (state.phase === 'ready' || state.phase === 'complete') sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      else if (state.phase === 'idle') sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage may be unavailable (private mode); the workflow still works.
    }
  }, [state]);

  const fetchMedia = useCallback(async (url: string) => {
    const id = ++runId.current;
    setState({ ...initialState, phase: 'validating', url });
    await pause(350);
    if (id !== runId.current) return;
    setState((current) => ({ ...current, phase: 'fetching' }));

    try {
      const media = await mediaService.fetch(url);
      const existing = await clipService
        .list({ url: media.originalUrl, limit: 1 })
        .then((list) => list.items[0] ?? null)
        .catch(() => null);
      if (id !== runId.current) return;
      setState((current) => ({ ...current, phase: 'ready', media, savedClip: existing }));
    } catch (error) {
      if (id !== runId.current) return;
      setState((current) => ({ ...current, phase: 'idle', error: error as ApiError, errorStage: 'fetch' }));
    }
  }, []);

  const analyze = useCallback(async () => {
    const id = ++runId.current;
    const url = state.media?.originalUrl ?? state.url;
    setState((current) => ({ ...current, phase: 'analyzing', error: null, errorStage: null }));
    try {
      const result = await analysisService.analyze(url);
      if (id !== runId.current) return;
      setState((current) => ({ ...current, phase: 'complete', result, media: result.media }));
    } catch (error) {
      if (id !== runId.current) return;
      setState((current) => ({ ...current, phase: 'ready', error: error as ApiError, errorStage: 'analyze' }));
    }
  }, [state.media, state.url]);

  const setSavedClip = useCallback((clip: Clip | null) => setState((current) => ({ ...current, savedClip: clip })), []);

  const reset = useCallback(() => {
    runId.current += 1;
    setState(initialState);
  }, []);

  return { state, fetchMedia, analyze, setSavedClip, reset };
}
