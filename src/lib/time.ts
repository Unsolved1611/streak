/** Pure time / duration helpers (unit tested). */

export interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

export const HOUR = 3600;
export const DAY = 86_400;

/** Seconds elapsed since an ISO start, clamped at 0 (never negative on clock skew). */
export function elapsedSeconds(startIso: string | null | undefined, now: number = Date.now()): number {
  if (!startIso) return 0;
  const start = Date.parse(startIso);
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((now - start) / 1000));
}

export function splitDuration(totalSeconds: number): DurationParts {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  return {
    days: Math.floor(safe / DAY),
    hours: Math.floor((safe % DAY) / HOUR),
    minutes: Math.floor((safe % HOUR) / 60),
    seconds: safe % 60,
    totalSeconds: safe,
  };
}

const pad2 = (n: number): string => String(Math.max(0, Math.floor(n))).padStart(2, '0');

/**
 * `DD : HH : MM : SS` — the live precision counter.
 * Days are zero-padded to 2 but may grow past 99 naturally.
 */
export function formatDuration(totalSeconds: number): string {
  const { days, hours, minutes, seconds } = splitDuration(totalSeconds);
  return [pad2(days), pad2(hours), pad2(minutes), pad2(seconds)].join(' : ');
}

/** Compact human string used in loss-aversion copy: `14d 06h 32m`. */
export function formatCompact(totalSeconds: number): string {
  const { days, hours, minutes } = splitDuration(totalSeconds);
  if (days > 0) return `${days}d ${pad2(hours)}h`;
  if (hours > 0) return `${hours}h ${pad2(minutes)}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${Math.max(0, Math.floor(totalSeconds))}s`;
}

/** Full sentence-ish duration: `2 days 14 h 06 min` / `2 días 14 h 06 min`. */
export function formatHuman(totalSeconds: number, lang: 'es' | 'en' = 'en'): string {
  const { days, hours, minutes, seconds } = splitDuration(totalSeconds);
  const d = lang === 'es' ? 'd' : 'd';
  const h = 'h';
  const m = lang === 'es' ? 'min' : 'min';
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}${d}`);
  if (days > 0 || hours > 0) parts.push(`${pad2(hours)}${h}`);
  parts.push(`${pad2(minutes)}${m}`);
  if (days === 0 && hours === 0) parts.push(`${pad2(seconds)}s`);
  return parts.join(' ');
}

/** Countdown style: `3d 04h 12m` with days omitted when zero. */
export function formatCountdown(totalSeconds: number): string {
  const { days, hours, minutes, seconds } = splitDuration(totalSeconds);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (days > 0 || hours > 0) parts.push(`${pad2(hours)}h`);
  parts.push(`${pad2(minutes)}m`);
  parts.push(`${pad2(seconds)}s`);
  return parts.join(' ');
}

export function isoNow(now: number = Date.now()): string {
  return new Date(now).toISOString();
}

/** Returns a defensive copy of a date at local midnight, used by the heatmap. */
export function startOfLocalDay(date: Date): Date {
  const copy = new Date(date.getTime());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, amount: number): Date {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + amount);
  return copy;
}
