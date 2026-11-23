import { describe, expect, it } from 'vitest';
import { DAY, HOUR, elapsedSeconds, formatCompact, formatDuration, formatHuman, splitDuration } from './time';

describe('formatDuration', () => {
  it('formats DD : HH : MM : SS with zero padding', () => {
    expect(formatDuration(0)).toBe('00 : 00 : 00 : 00');
    expect(formatDuration(59)).toBe('00 : 00 : 00 : 59');
    expect(formatDuration(61)).toBe('00 : 00 : 01 : 01');
    expect(formatDuration(HOUR + 62)).toBe('00 : 01 : 01 : 02');
    expect(formatDuration(14 * DAY + 6 * HOUR + 32 * 60 + 11)).toBe('14 : 06 : 32 : 11');
  });

  it('keeps counting days past 99', () => {
    expect(formatDuration(120 * DAY).startsWith('120 :')).toBe(true);
  });

  it('never renders negative time', () => {
    expect(formatDuration(-500)).toBe('00 : 00 : 00 : 00');
  });
});

describe('splitDuration', () => {
  it('splits into calendar-style parts', () => {
    expect(splitDuration(90061)).toEqual({ days: 1, hours: 1, minutes: 1, seconds: 1, totalSeconds: 90061 });
  });

  it('handles NaN defensively', () => {
    expect(splitDuration(Number.NaN).totalSeconds).toBe(0);
  });
});

describe('formatCompact / formatHuman', () => {
  it('prefers days then hours then minutes', () => {
    expect(formatCompact(14 * DAY + 6 * HOUR)).toBe('14d 06h');
    expect(formatCompact(5 * HOUR + 9 * 60)).toBe('5h 09m');
    expect(formatCompact(90)).toBe('1m');
    expect(formatCompact(9)).toBe('9s');
  });

  it('builds a human readable duration', () => {
    expect(formatHuman(2 * DAY + 14 * HOUR + 6 * 60, 'en')).toBe('2d 14h 06min');
    expect(formatHuman(45, 'es')).toBe('00min 45s');
  });
});

describe('elapsedSeconds', () => {
  const now = Date.parse('2026-01-10T12:00:00.000Z');

  it('returns 0 for null or invalid starts', () => {
    expect(elapsedSeconds(null, now)).toBe(0);
    expect(elapsedSeconds('not-a-date', now)).toBe(0);
  });

  it('floors the difference to whole seconds', () => {
    expect(elapsedSeconds('2026-01-09T12:00:00.000Z', now)).toBe(DAY);
    expect(elapsedSeconds('2026-01-10T11:59:59.100Z', now)).toBe(0);
  });

  it('clamps negative (future start / clock skew) to zero', () => {
    expect(elapsedSeconds('2026-01-11T12:00:00.000Z', now)).toBe(0);
  });
});
