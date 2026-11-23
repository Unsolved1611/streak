import { useMemo } from 'react';
import { buildHeatmap } from '../lib/stats';
import type { StreakData } from '../types/streak';

interface HeatmapProps {
  data: StreakData;
  now: number;
  lessLabel: string;
  moreLabel: string;
}

export default function Heatmap({ data, now, lessLabel, moreLabel }: HeatmapProps) {
  const columns = useMemo(() => buildHeatmap(data, now), [data, now]);

  return (
    <div>
      <div className="mx-auto flex max-w-[430px] gap-[3px] overflow-hidden">
        {columns.map((column, colIndex) => (
          <div key={`col-${colIndex}`} className="flex min-w-0 flex-1 flex-col gap-[3px]">
            {column.map((cell) => {
              const level = cell.intensity <= 0 ? 0 : cell.intensity < 0.25 ? 1 : cell.intensity < 0.6 ? 2 : cell.intensity < 0.99 ? 3 : 4;
              const background =
                level === 0
                  ? 'color-mix(in srgb, var(--tier-line) 65%, transparent)'
                  : `color-mix(in srgb, var(--tier-accent) ${level === 4 ? 95 : 22 + level * 19}%, transparent)`;
              return (
                <div
                  key={cell.key}
                  title={`${cell.key} · ${Math.round(cell.intensity * 100)}%`}
                  className="aspect-square w-full rounded-[2.5px] transition-colors duration-500"
                  style={{
                    backgroundColor: background,
                    boxShadow: level >= 3 ? '0 0 8px color-mix(in srgb, var(--tier-accent) 35%, transparent)' : undefined,
                    outline: cell.isToday ? '1px solid color-mix(in srgb, var(--tier-accent) 80%, transparent)' : undefined,
                    outlineOffset: '1px',
                    opacity: cell.isFuture ? 0.18 : 1,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mx-auto mt-2.5 flex max-w-[430px] items-center justify-end gap-1.5 text-[0.6rem] text-[color:var(--tier-muted)]">
        <span>{lessLabel}</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className="h-2.5 w-2.5 rounded-[2px]"
            style={{
              backgroundColor:
                level === 0
                  ? 'color-mix(in srgb, var(--tier-line) 65%, transparent)'
                  : `color-mix(in srgb, var(--tier-accent) ${level === 4 ? 95 : 22 + level * 19}%, transparent)`,
            }}
          />
        ))}
        <span>{moreLabel}</span>
      </div>
    </div>
  );
}
