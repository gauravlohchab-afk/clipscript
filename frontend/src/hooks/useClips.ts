import { useCallback, useEffect, useState } from 'react';
import type { ApiError } from '@/services/apiClient';
import { clipService } from '@/services/clipService';
import type { ClipList, ClipListParams } from '@/types/clip';

interface State {
  data: ClipList | null;
  error: ApiError | null;
  /** The request key this state belongs to; loading = it differs from the current key. */
  key: string | null;
}

export function useClips(params: ClipListParams) {
  const [state, setState] = useState<State>({ data: null, error: null, key: null });
  const [version, setVersion] = useState(0);
  const paramsKey = JSON.stringify(params);
  const requestKey = `${paramsKey}#${version}`;

  useEffect(() => {
    let cancelled = false;
    clipService
      .list(JSON.parse(paramsKey) as ClipListParams)
      .then((data) => !cancelled && setState({ data, error: null, key: requestKey }))
      .catch((error: unknown) => !cancelled && setState({ data: null, error: error as ApiError, key: requestKey }));
    return () => {
      cancelled = true;
    };
  }, [paramsKey, requestKey]);

  const refetch = useCallback(() => setVersion((value) => value + 1), []);

  /** Optimistically drops a clip from the current list. */
  const removeLocal = useCallback(
    (id: string) =>
      setState((current) =>
        current.data
          ? { ...current, data: { ...current.data, items: current.data.items.filter((clip) => clip.id !== id), total: current.data.total - 1 } }
          : current,
      ),
    [],
  );

  return { data: state.data, error: state.error, loading: state.key !== requestKey, refetch, removeLocal };
}
