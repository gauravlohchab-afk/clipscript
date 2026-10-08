import { cn } from '@/utils/cn';
import { scoreLabel, scoreTone, scoreToneColor as toneColor } from '@/utils/format';

interface ScoreRingProps {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
  showTone?: boolean;
  className?: string;
}

export function ScoreRing({ score, size = 72, stroke = 6, label, showTone = false, className }: ScoreRingProps) {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const tone = scoreTone(value);

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="#efeff3" strokeWidth={stroke} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={toneColor[tone]}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - value / 100)}
            style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)' }}
          />
        </svg>
        <span
          className="absolute inset-0 grid place-items-center font-display font-bold tracking-tight text-fg tabular-nums"
          style={{ fontSize: size * 0.3 }}
          aria-label={`${label ?? 'Score'}: ${value} out of 100`}
        >
          {value}
        </span>
      </div>
      {(label || showTone) && (
        <div className="text-center leading-tight">
          {label && <p className="text-xs font-medium text-muted">{label}</p>}
          {showTone && <p className="mt-0.5 text-[11px] font-medium" style={{ color: toneColor[tone] }}>{scoreLabel[tone]}</p>}
        </div>
      )}
    </div>
  );
}

/** "92/100" with the number in the score's tone color. Size it with `className` (font size). */
export function ScoreValue({ score, className }: { score: number; className?: string }) {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <span className={cn('inline-flex items-baseline font-display font-bold tracking-tight tabular-nums', className)} aria-label={`${value} out of 100`}>
      <span style={{ color: toneColor[scoreTone(value)] }}>{value}</span>
      <span className="ml-0.5 text-[0.5em] font-semibold text-subtle">/100</span>
    </span>
  );
}

export function ScorePill({ score, label }: { score: number; label?: string }) {
  const tone = scoreTone(score);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/95 px-2.5 py-1 text-xs font-semibold text-fg tabular-nums shadow-hairline backdrop-blur">
      <span className="size-1.5 rounded-full" style={{ backgroundColor: toneColor[tone] }} aria-hidden />
      {label && <span className="font-medium text-muted">{label}</span>}
      {Math.round(score)}
    </span>
  );
}
