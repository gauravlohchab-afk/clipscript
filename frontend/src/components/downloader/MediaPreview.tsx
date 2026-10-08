import { ArrowRight, BookmarkCheck, Clock, Film, Monitor, Sparkles, User } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Clip } from '@/types/clip';
import type { Media } from '@/types/media';
import { formatDuration, titleCase } from '@/utils/format';
import { DownloadActions } from './DownloadActions';
import { ReelPlayer } from './ReelPlayer';

interface MediaPreviewProps {
  media: Media;
  savedClip: Clip | null;
  analyzing: boolean;
  analyzed: boolean;
  onAnalyze: () => void;
  footer?: ReactNode;
}

function Meta({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-subtle">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-semibold text-fg">{value}</dd>
    </div>
  );
}

export function MediaPreview({ media, savedClip, analyzing, analyzed, onAnalyze, footer }: MediaPreviewProps) {
  const resolution = media.width && media.height ? `${media.width}×${media.height}` : 'Unknown';
  const canAnalyze = Boolean(media.mediaUrl);

  return (
    <section
      className="surface animate-fade-up grid gap-8 p-5 sm:p-8 md:grid-cols-[240px_1fr] md:gap-10 lg:grid-cols-[260px_1fr]"
      aria-label="Media preview"
    >
      <ReelPlayer mediaUrl={media.mediaUrl} thumbnailUrl={media.thumbnailUrl} title={media.title} className="mx-auto max-w-[260px] shadow-soft" />

      <div className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">
            {titleCase(media.platform)} {titleCase(media.type)}
          </Badge>
          {media.provider === 'mock' && <Badge tone="violet">Demo media</Badge>}
          {savedClip && (
            <Link to={`/clips/${savedClip.id}`}>
              <Badge tone="success" icon={<BookmarkCheck className="size-3.5" />}>
                In your library
              </Badge>
            </Link>
          )}
        </div>
        <h2 className="mt-4 font-display text-2xl leading-tight font-bold tracking-[-0.02em] text-fg sm:text-[28px]">{media.title}</h2>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-y border-line py-5 lg:grid-cols-4">
          <Meta icon={<User className="size-3.5" />} label="Creator" value={`@${media.author}`} />
          <Meta icon={<Clock className="size-3.5" />} label="Duration" value={formatDuration(media.duration)} />
          <Meta icon={<Film className="size-3.5" />} label="Type" value={titleCase(media.type)} />
          <Meta icon={<Monitor className="size-3.5" />} label="Source" value={resolution} />
        </dl>

        <div className="mt-6">
          <p className="label mb-3">Download</p>
          <DownloadActions url={media.originalUrl} options={media.downloadOptions} />
        </div>

        <div className="mt-8 flex flex-col gap-4 rounded-2xl bg-surface-2/70 p-4 sm:flex-row sm:items-center sm:p-5">
          <Button
            size="lg"
            onClick={onAnalyze}
            loading={analyzing}
            loadingText="Analyzing…"
            disabled={!canAnalyze}
            icon={<Sparkles className="size-4" />}
            trailingIcon={<ArrowRight className="size-4" />}
            className="w-full sm:w-auto"
          >
            {analyzed ? 'Re-analyze with AI' : 'Analyze with AI'}
          </Button>
          <p className="text-sm leading-relaxed text-muted">
            {canAnalyze
              ? 'Extracts the script, hook, on-screen text, structure, retention patterns and CTA.'
              : 'The video for this Reel is not publicly available, so it cannot be analyzed.'}
          </p>
        </div>
        {footer}
      </div>
    </section>
  );
}
