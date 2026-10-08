import { Copy, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { useClipboard } from '@/hooks/useClipboard';
import type { TranscriptSegment } from '@/types/analysis';
import { formatTimestamp } from '@/utils/format';
import { transcriptToText } from '@/utils/transcript';

/** 0:04 → 00:04 for an even timestamp column. */
const paddedTimestamp = (seconds: number) => formatTimestamp(seconds).padStart(5, '0');

export function TranscriptCard({ transcript }: { transcript: TranscriptSegment[] }) {
  const copy = useClipboard();

  return (
    <Card as="section">
      <CardHeader
        icon={<MessageSquareText className="size-4" />}
        eyebrow={`${transcript.length} ${transcript.length === 1 ? 'segment' : 'segments'}`}
        title="Transcript"
        action={
          transcript.length > 0 && (
            <Button variant="secondary" size="sm" icon={<Copy className="size-4" />} onClick={() => copy(transcriptToText(transcript), 'Transcript copied')}>
              <span className="hidden sm:inline">Copy</span>
            </Button>
          )
        }
      />
      {transcript.length === 0 ? (
        <p className="rounded-xl bg-surface-2/70 px-4 py-6 text-center text-sm text-muted">No spoken dialogue was detected in this Reel.</p>
      ) : (
        <div className="-mx-1">
          <div className="grid grid-cols-[4.5rem_1fr] gap-4 border-b border-line px-1 pb-2 sm:grid-cols-[5.5rem_1fr]" aria-hidden>
            <span className="label">Time</span>
            <span className="label">Dialogue</span>
          </div>
          <ol className="max-h-[34rem] overflow-y-auto">
            {transcript.map((segment, index) => (
              <li
                key={`${segment.start}-${index}`}
                className="grid grid-cols-[4.5rem_1fr] gap-4 border-b border-line/70 px-1 py-3.5 last:border-b-0 sm:grid-cols-[5.5rem_1fr]"
              >
                <span className="pt-0.5 font-mono text-xs text-subtle tabular-nums">{paddedTimestamp(segment.start)}</span>
                <p className="text-[15px] leading-7 break-words text-fg">{segment.text}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  );
}
