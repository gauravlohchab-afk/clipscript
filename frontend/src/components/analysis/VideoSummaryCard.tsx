import { Calendar, Clock, ExternalLink, User } from 'lucide-react';
import { ReelPlayer } from '@/components/downloader/ReelPlayer';
import { Badge } from '@/components/ui/Badge';
import { ScorePill } from '@/components/ui/ScoreRing';
import type { AnalysisDossier } from '@/types/clip';
import { formatDate, formatDuration, titleCase } from '@/utils/format';

/** Sidebar: the video itself, plus who made it and when it was analyzed. The summary lives in the Overview card. */
export function VideoSummaryCard({ dossier }: { dossier: AnalysisDossier }) {
  const { media, analysis, meta } = dossier;
  return (
    <section className="surface overflow-hidden p-3" aria-label="Video summary">
      <ReelPlayer mediaUrl={media.mediaUrl} thumbnailUrl={dossier.thumbnailData ?? media.thumbnailUrl} title={media.title} className="mx-auto max-w-[300px]" />
      <div className="space-y-4 px-2 pt-5 pb-3">
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">
            {titleCase(media.platform)} {titleCase(media.type)}
          </Badge>
          <ScorePill score={analysis.scores.overall} label="Overall" />
        </div>
        <h2 className="font-display text-[17px] leading-snug font-bold tracking-tight text-fg">{media.title}</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted">
            <User className="size-4 text-subtle" />
            <dt className="sr-only">Creator</dt>
            <dd className="truncate">@{media.author}</dd>
          </div>
          <div className="flex items-center gap-2 text-muted">
            <Clock className="size-4 text-subtle" />
            <dt className="sr-only">Duration</dt>
            <dd>{formatDuration(media.duration)}</dd>
          </div>
          <div className="flex items-center gap-2 text-muted">
            <Calendar className="size-4 text-subtle" />
            <dt className="sr-only">Analyzed</dt>
            <dd>Analyzed {formatDate(meta.analyzedAt)}</dd>
          </div>
        </dl>
        <a
          href={media.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-600"
        >
          View on Instagram <ExternalLink className="size-3.5" />
        </a>
        {meta.provider === 'mock' && (
          <p className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] leading-snug text-violet-800">
            Demo analysis from the development AI provider. Add a Gemini API key on the server for real analysis.
          </p>
        )}
      </div>
    </section>
  );
}
