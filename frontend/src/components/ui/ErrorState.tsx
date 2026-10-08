import { AlertTriangle, Lock, RefreshCw, SearchX, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ApiError } from '@/services/apiClient';
import { cn } from '@/utils/cn';
import { Button } from './Button';

function iconFor(code: ApiError['code']): ReactNode {
  switch (code) {
    case 'PRIVATE_CONTENT':
      return <Lock className="size-5" />;
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return <WifiOff className="size-5" />;
    case 'NOT_FOUND':
    case 'MEDIA_UNAVAILABLE':
      return <SearchX className="size-5" />;
    default:
      return <AlertTriangle className="size-5" />;
  }
}

interface ErrorStateProps {
  error: ApiError;
  onRetry?: () => void;
  retryLabel?: string;
  extra?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function ErrorState({ error, onRetry, retryLabel = 'Try again', extra, compact, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'animate-fade-up flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50/70 sm:flex-row sm:items-center',
        compact ? 'p-4' : 'p-5 sm:p-6',
        className,
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-red-600 shadow-hairline">{iconFor(error.code)}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-red-900">{error.title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-red-800/80">{error.message}</p>
        {extra}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={<RefreshCw className="size-4" />} onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
