import { Download, Music } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/toastContext';
import { ApiError } from '@/services/apiClient';
import { mediaService } from '@/services/mediaService';
import type { DownloadFormat, DownloadOption } from '@/types/media';
import { saveBlob } from '@/utils/file';

interface DownloadActionsProps {
  url: string;
  options: DownloadOption[];
}

const LABELS: Record<DownloadFormat, string> = { '1080p': '1080p', '720p': '720p', best: 'Best', mp3: 'MP3' };

/** Renders only the formats the backend reported as available for this Reel. */
export function DownloadActions({ url, options }: DownloadActionsProps) {
  const toast = useToast();
  const [pending, setPending] = useState<DownloadFormat | null>(null);

  if (options.length === 0) {
    return <p className="text-sm text-subtle">No downloads are available for this Reel.</p>;
  }

  const download = async (format: DownloadFormat) => {
    setPending(format);
    try {
      const { blob, filename } = await mediaService.download(url, format);
      saveBlob(blob, filename ?? `clipscript-reel.${format === 'mp3' ? 'mp3' : 'mp4'}`);
      toast.show({ title: `${LABELS[format]} download ready`, tone: 'success' });
    } catch (error) {
      toast.show({ title: 'Download failed', description: error instanceof ApiError ? error.message : undefined, tone: 'error' });
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button
          key={option.format}
          variant="secondary"
          size="sm"
          disabled={pending !== null && pending !== option.format}
          loading={pending === option.format}
          loadingText={option.format === 'mp3' ? 'Extracting audio…' : `Preparing ${option.format === 'best' ? 'video' : option.format}…`}
          icon={option.container === 'mp3' ? <Music className="size-4" /> : <Download className="size-4" />}
          onClick={() => download(option.format)}
          title={option.label}
        >
          {LABELS[option.format]}
        </Button>
      ))}
    </div>
  );
}
