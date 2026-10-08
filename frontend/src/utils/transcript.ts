import type { TranscriptSegment } from '@/types/analysis';
import { formatTimestamp } from './format';

export function transcriptToText(segments: TranscriptSegment[]): string {
  return segments.map((segment) => `[${formatTimestamp(segment.start)}] ${segment.text}`).join('\n');
}
