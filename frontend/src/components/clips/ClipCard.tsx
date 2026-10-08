import { Bookmark, BookmarkCheck, Clock, ImageOff, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Clip } from '@/types/clip';
import { assetUrl } from '@/utils/assetUrl';
import { cn } from '@/utils/cn';
import { clipThumbnail } from '@/utils/dossier';
import { formatDate, formatDuration, scoreTone, scoreToneColor } from '@/utils/format';

interface ClipCardProps {
  clip: Clip;
  onToggleSaved: (clip: Clip) => void;
  onDelete: (clip: Clip) => void;
  /** Label for the save toggle when the clip is saved (e.g. "Remove" on Saved Clips). */
  savedLabel?: string;
  busy?: boolean;
}

function Stat({ label, score }: { label: string; score: number }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-subtle">{label}</p>
      <p className="font-display text-lg leading-tight font-bold tabular-nums" style={{ color: scoreToneColor[scoreTone(score)] }}>
        {Math.round(score)}
      </p>
    </div>
  );
}

export function ClipCard({ clip, onToggleSaved, onDelete, savedLabel = 'Saved', busy }: ClipCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const thumbnail = assetUrl(clipThumbnail(clip));

  return (
    <article className="group surface relative flex flex-col overflow-hidden p-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <Link to={`/clips/${clip.id}`} className="relative block aspect-[4/5] overflow-hidden rounded-xl bg-surface-2" aria-label={`Open analysis: ${clip.title}`}>
        {thumbnail && !imageFailed ? (
          <img
            src={thumbnail}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid size-full place-items-center text-subtle">
            <ImageOff className="size-8" />
          </div>
        )}
        <span className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 rounded-full bg-[#17171c]/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
          <Clock className="size-3" /> {formatDuration(clip.duration)}
        </span>
      </Link>

      <div className="flex flex-1 flex-col px-2 pt-4 pb-1.5">
        <Link to={`/clips/${clip.id}`} className="line-clamp-2 font-display leading-snug font-bold tracking-tight text-fg transition-colors hover:text-brand-700">
          {clip.title}
        </Link>
        <p className="mt-1 truncate text-sm text-muted">@{clip.author}</p>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
          <Stat label="Hook" score={clip.scores.hook} />
          <Stat label="Overall" score={clip.scores.overall} />
          <div className="min-w-0">
            <p className="text-[11px] text-subtle">Added</p>
            <p className="truncate pt-1 text-xs font-medium text-fg">{formatDate(clip.createdAt)}</p>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-end gap-1 pt-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => onToggleSaved(clip)}
            className={cn(
              'inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition-colors disabled:opacity-50',
              clip.isSaved ? 'bg-brand-50 text-brand-700 hover:bg-brand-100' : 'text-muted hover:bg-surface-2 hover:text-fg',
            )}
            aria-pressed={clip.isSaved}
            title={clip.isSaved ? 'Remove from Saved Clips' : 'Add to Saved Clips'}
          >
            {clip.isSaved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
            {clip.isSaved ? savedLabel : 'Save'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(clip)}
            className="grid size-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            aria-label={`Delete ${clip.title}`}
            title="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
