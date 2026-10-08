import { Film, ImageOff } from 'lucide-react';
import { useState } from 'react';
import { assetUrl } from '@/utils/assetUrl';
import { cn } from '@/utils/cn';

interface ReelPlayerProps {
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  title: string;
  className?: string;
}

/** 9:16 video preview that degrades to the thumbnail (or a placeholder) when media is unavailable or expired. */
export function ReelPlayer({ mediaUrl, thumbnailUrl, title, className }: ReelPlayerProps) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const video = assetUrl(mediaUrl);
  const poster = assetUrl(thumbnailUrl);
  const showVideo = video && !videoFailed;

  return (
    <div className={cn('relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-line', className)}>
      {showVideo ? (
        <video
          key={video}
          src={video}
          poster={poster ?? undefined}
          controls
          playsInline
          preload="metadata"
          className="size-full object-cover"
          onError={() => setVideoFailed(true)}
          aria-label={`Preview of ${title}`}
        />
      ) : poster && !imageFailed ? (
        <img src={poster} alt={title} className="size-full object-cover" onError={() => setImageFailed(true)} loading="lazy" />
      ) : (
        <div className="grid size-full place-items-center text-subtle">
          <div className="flex flex-col items-center gap-2 text-xs">
            {mediaUrl ? <Film className="size-8" /> : <ImageOff className="size-8" />}
            Preview unavailable
          </div>
        </div>
      )}
      {!showVideo && mediaUrl && videoFailed && (
        <p className="absolute inset-x-3 bottom-3 rounded-lg border border-line bg-surface/95 px-3 py-2 text-[11px] leading-snug text-muted shadow-soft backdrop-blur">
          This video can't be played here. The link may have expired; fetch the Reel again to refresh it.
        </p>
      )}
    </div>
  );
}
