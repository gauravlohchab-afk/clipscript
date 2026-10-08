export function formatTimestamp(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '—';
  const seconds = Math.round(totalSeconds);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function titleCase(value: string): string {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export type ScoreTone = 'excellent' | 'good' | 'fair' | 'weak';

export function scoreTone(score: number): ScoreTone {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'weak';
}

export const scoreLabel: Record<ScoreTone, string> = {
  excellent: 'Excellent',
  good: 'Strong',
  fair: 'Average',
  weak: 'Needs work',
};

/** Score colors, tuned for contrast on light surfaces. */
export const scoreToneColor: Record<ScoreTone, string> = {
  excellent: '#c026d3',
  good: '#7c3aed',
  fair: '#d97706',
  weak: '#dc2626',
};
