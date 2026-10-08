import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type Toast, type ToastInput } from '@/hooks/toastContext';
import { cn } from '@/utils/cn';

const icons = {
  success: <CheckCircle2 className="size-5 text-emerald-600" />,
  error: <XCircle className="size-5 text-red-600" />,
  info: <Info className="size-5 text-violet-600" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const show = useCallback(
    (input: ToastInput) => {
      nextId.current += 1;
      const toast: Toast = { id: nextId.current, tone: 'info', ...input };
      setToasts((current) => [...current.slice(-3), toast]);
      window.setTimeout(() => dismiss(toast.id), input.tone === 'error' ? 6000 : 3500);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'animate-fade-up pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface p-3.5 shadow-lift',
              toast.tone === 'error' ? 'border-red-200' : 'border-line',
            )}
          >
            {icons[toast.tone ?? 'info']}
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium text-fg">{toast.title}</p>
              {toast.description && <p className="mt-0.5 text-muted">{toast.description}</p>}
            </div>
            <button onClick={() => dismiss(toast.id)} className="text-subtle hover:text-fg" aria-label="Dismiss notification">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
