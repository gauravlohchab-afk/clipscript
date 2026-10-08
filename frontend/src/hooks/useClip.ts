import { useCallback, useEffect, useState } from 'react';
import type { ApiError } from '@/services/apiClient';
import { clipService } from '@/services/clipService';
import type { Clip } from '@/types/clip';

interface State {
  clip: Clip | null;
  error: ApiError | null;
  key: string | null;
}

export function useClip(id: string | undefined) {
  const [state, setState] = useState<State>({ clip: null, error: null, key: null });
  const [version, setVersion] = useState(0);
  const requestKey = `${id ?? ''}#${version}`;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    clipService
      .get(id)
      .then((clip) => !cancelled && setState({ clip, error: null, key: requestKey }))
      .catch((error: unknown) => !cancelled && setState({ clip: null, error: error as ApiError, key: requestKey }));
    return () => {
      cancelled = true;
    };
  }, [id, requestKey]);

  const refetch = useCallback(() => setVersion((value) => value + 1), []);
  const setClip = useCallback((clip: Clip) => setState((current) => ({ ...current, clip })), []);

  return { clip: state.clip, error: state.error, loading: state.key !== requestKey, setClip, refetch };
}
