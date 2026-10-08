import { Sparkle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { mediaService } from '@/services/mediaService';

interface SampleUrlsProps {
  disabled: boolean;
  onPick: (url: string) => void;
}

const shortLabel = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

/** Demo links provided by the active media provider (empty for the real Instagram provider). */
export function SampleUrls({ disabled, onPick }: SampleUrlsProps) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    mediaService
      .samples()
      .then((samples) => setUrls(samples.urls))
      .catch(() => setUrls([]));
  }, []);

  if (urls.length === 0) return null;

  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
      <span className="flex items-center gap-1 text-subtle">
        <Sparkle className="size-3.5" /> Try a demo:
      </span>
      {urls.map((url) => (
        <button
          key={url}
          type="button"
          disabled={disabled}
          onClick={() => onPick(url)}
          className="max-w-full truncate rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[11px] text-muted shadow-hairline transition-colors hover:border-brand-200 hover:text-brand-700 disabled:opacity-50"
        >
          {shortLabel(url)}
        </button>
      ))}
    </div>
  );
}
