/** Derived metrics: streaks, records, heatmap cells. Pure + unit tested. */

import type { HistoryEntry, StreakData } from '../types/streak';
import { elapsedSeconds } from './time';
import { localDayKey } from './time';

export interface Interval {
  start: number;
  end: number;
}

export interface VaultMetrics {
  currentSeconds: number;
  longestSeconds: number;
  totalSeconds: number;
  /** number of calendar days touched by any run */
  cleanDays: number;
  totalRuns: number;
  urgesResisted: number;
  isActive: boolean;
}

export function runIntervals(data: StreakData, now: number = Date.now()): Interval[] {
  const intervals: Interval[] = [];
  for (const entry of data.history) {
    const start = Date.parse(entry.startedAt);
    const end = Date.parse(entry.endedAt);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) intervals.push({ start, end });
  }
  if (data.activeChallengeStart) {
    const start = Date.parse(data.activeChallengeStart);
    if (Number.isFinite(start)) intervals.push({ start, end: Math.max(start, now) });
  }
  return intervals;
}

export function computeMetrics(data: StreakData, now: number = Date.now()): VaultMetrics {
  const currentSeconds = elapsedSeconds(data.activeChallengeStart, now);
  const historySeconds = data.history.reduce((sum, h) => sum + Math.max(0, h.durationSeconds), 0);
  const longestHistory = data.history.reduce((max, h) => Math.max(max, Math.max(0, h.durationSeconds)), 0);
  const intervals = runIntervals(data, now);

  return {
    currentSeconds,
    longestSeconds: Math.max(longestHistory, currentSeconds),
    totalSeconds: historySeconds + currentSeconds,
    cleanDays: countCleanDays(intervals),
    totalRuns: data.history.length,
    urgesResisted: data.urgesResisted,
    isActive: Boolean(data.activeChallengeStart),
  };
}

/** Unique local calendar days covered by at least one clean interval. */
export function countCleanDays(intervals: Interval[]): number {
  const days = new Set<string>();
  for (const { start, end } of intervals) {
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const stop = new Date(end);
    let guard = 0;
    while (cursor.getTime() <= stop.getTime() && guard < 20_000) {
      if (cursor.getTime() + 86_400_000 > start) days.add(localDayKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }
  }
  return days.size;
}

export interface HeatCell {
  key: string;
  date: Date;
  /** 0..1 share of the day covered by a clean run */
  intensity: number;
  isToday: boolean;
  isFuture: boolean;
}

export const HEATMAP_WEEKS = 18;

/**
 * GitHub-style calendar: columns are weeks (Sunday first), rows are weekdays.
 * `weeks` columns ending with the current week.
 */
export function buildHeatmap(data: StreakData, now: number = Date.now(), weeks: number = HEATMAP_WEEKS): HeatCell[][] {
  const intervals = runIntervals(data, now);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const endOfToday = new Date(today.getTime() + 86_400_000);
  const windowStart = new Date(today.getTime() - (weeks * 7 - 1) * 86_400_000);
  // Align to the Sunday of the first week.
  const gridStart = new Date(windowStart.getTime() - new Date(windowStart).getDay() * 86_400_000);

  const columns: HeatCell[][] = [];
  let cursor = new Date(gridStart.getTime());

  for (let w = 0; w < weeks + 1; w += 1) {
    const column: HeatCell[] = [];
    for (let d = 0; d < 7; d += 1) {
      const dayStart = new Date(cursor.getTime());
      const dayEnd = new Date(dayStart.getTime() + 86_400_000);
      let coveredMs = 0;
      for (const interval of intervals) {
        const overlap = Math.min(dayEnd.getTime(), interval.end) - Math.max(dayStart.getTime(), interval.start);
        if (overlap > 0) coveredMs += overlap;
      }
      column.push({
        key: localDayKey(dayStart),
        date: dayStart,
        intensity: Math.min(1, coveredMs / 86_400_000),
        isToday: localDayKey(dayStart) === localDayKey(new Date(now)),
        isFuture: dayStart.getTime() > endOfToday.getTime(),
      });
      cursor = new Date(cursor.getTime() + 86_400_000);
    }
    columns.push(column);
  }

  // Keep only the columns that can contain data (drop fully future leading/trailing blanks).
  return columns.filter((col) => col.some((cell) => !cell.isFuture && cell.date.getTime() + 86_400_000 > windowStart.getTime()));
}

export function bestRun(data: StreakData): HistoryEntry | null {
  return data.history.reduce<HistoryEntry | null>((best, entry) => {
    if (!best) return entry;
    return entry.durationSeconds > best.durationSeconds ? entry : best;
  }, null);
}
