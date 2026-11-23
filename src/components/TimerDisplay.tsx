import { splitDuration } from '../lib/time';

interface TimerDisplayProps {
  seconds: number;
  /** compact shrinks the digits for very small screens / secondary spots */
  compact?: boolean;
}

const pad = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, '0');

export default function TimerDisplay({ seconds, compact = false }: TimerDisplayProps) {
  const { days, hours, minutes, seconds: secs } = splitDuration(seconds);
  const groups = [
    { value: pad(days), label: 'DD' },
    { value: pad(hours), label: 'HH' },
    { value: pad(minutes), label: 'MM' },
    { value: pad(secs), label: 'SS' },
  ];

  return (
    <div
      className="flex w-full items-start justify-center gap-[2px] sm:gap-2"
      role="timer"
      aria-live="off"
      aria-label={`${days} days ${hours} hours ${minutes} minutes ${seconds % 60} seconds`}
    >
      {groups.map((group, index) => (
        <div key={group.label} className="flex items-start">
          <div className="flex flex-col items-center">
            <span
              className="timer font-mono font-semibold leading-none text-[color:var(--tier-text)]"
              style={{ fontSize: compact ? 'clamp(1.45rem, 7.5vw, 2rem)' : 'clamp(2.1rem, 11.5vw, 3.4rem)' }}
            >
              {group.value}
            </span>
            <span
              className="mt-1.5 text-[0.55rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--tier-muted)]"
              style={{ fontSize: compact ? '0.5rem' : undefined }}
            >
              {group.label}
            </span>
          </div>
          {index < groups.length - 1 && (
            <span
              className="timer px-0.5 font-mono leading-none text-[color:var(--tier-accent)] opacity-40"
              style={{ fontSize: compact ? 'clamp(1.25rem, 6vw, 1.7rem)' : 'clamp(1.8rem, 9vw, 2.7rem)' }}
            >
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
