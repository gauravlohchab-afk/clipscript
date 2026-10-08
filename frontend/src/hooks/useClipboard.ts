import { useCallback } from 'react';
import { useToast } from './toastContext';

export function useClipboard() {
  const toast = useToast();
  return useCallback(
    async (text: string, successTitle = 'Copied to clipboard') => {
      try {
        await navigator.clipboard.writeText(text);
        toast.show({ title: successTitle, tone: 'success' });
        return true;
      } catch {
        toast.show({ title: 'Copy failed', description: 'Your browser blocked clipboard access.', tone: 'error' });
        return false;
      }
    },
    [toast],
  );
}
