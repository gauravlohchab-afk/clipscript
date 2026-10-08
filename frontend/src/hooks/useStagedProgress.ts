import { useEffect, useState } from 'react';

/**
 * Advances through a list of stage labels while a long request is running. The last stage is held
 * until the request finishes, so the UI never claims to be done before the server is.
 */
export function useStagedProgress(stageCount: number, active: boolean, intervalMs = 2200): number {
  const [index, setIndex] = useState(0);
  const [prevActive, setPrevActive] = useState(active);

  // Restart from the first stage each time a new run begins.
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) setIndex(0);
  }

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      setIndex((current) => Math.min(current + 1, stageCount - 1));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [active, stageCount, intervalMs]);

  return index;
}
