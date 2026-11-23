import type { ReactNode } from 'react';
import type { Tier } from '../lib/tiers';
import { formatCountdown } from '../lib/time';

interface ProgressRailProps {
  /** 0..1 to the next tier */
  progress: number;
  nextTier: Tier | null;
  secondsToNext: number;
  nextLabel: string;
  toNextLabel: string;
  maxLabel: string;
  lang: 'es' | 'en';
  overall?: number;
  overallLabel?: string;
}

export default function ProgressRail({
  progress,
  nextTier,
  secondsToNext,
  nextLabel,
  toNextLabel,
  maxLabel,
  lang,
  overall,
  overallLabel,
}: ProgressRailProps): ReactNode {
  const pct = Math.round(progress * 100);
  return (
    <div className="w-full">
      <div className="mb-2 flex items-baseline justify-between gap-3 text-[0.72rem]">
        <span className={`font-medium text-[color:var(--tier-text)] ${nextTier ? 'truncate' : 'leading-snug'}`}>
          {nextTier ? nextLabel.replace('{tier}', nextTier.name[lang]) : maxLabel}
        </span>
        {nextTier && (
          <span className="shrink-0 font-mono text-[0.7rem] tabular-nums text-[color:var(--tier-muted)]">
            {toNextLabel.replace('{time}', formatCountdown(secondsToNext))}
          </span>
        )}
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-black/40 ring-1 ring-inset ring-white/5">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${Math.max(pct, progress > 0 ? 2 : 0)}%`,
            backgroundImage:
              'linear-gradient(90deg, color-mix(in srgb, var(--tier-accent) 55%, transparent), var(--tier-accent), var(--tier-accent-2))',
            boxShadow: '0 0 14px color-mix(in srgb, var(--tier-accent) 60%, transparent)',
          }}
        />
        <div className="absolute inset-0 opacity-40 [background-image:repeating-linear-gradient(90deg,transparent_0_7px,rgba(0,0,0,0.35)_7px_8px)]" />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[0.62rem] text-[color:var(--tier-muted)]">
        <span className="font-mono tabular-nums">{pct}%</span>
        {typeof overall === 'number' && overallLabel && (
          <span className="truncate">
            {overallLabel} {Math.round(overall * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
