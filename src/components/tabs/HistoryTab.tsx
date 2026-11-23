import { useState } from 'react';
import { Archive, Clock, Flame, Trash2, TrendingUp } from 'lucide-react';
import TierGlyph from '../TierGlyph';
import { useT } from '../../i18n/context';
import { bestRun, computeMetrics } from '../../lib/stats';
import { formatCompact, formatDuration } from '../../lib/time';
import { tierFromHistoryId, type Tier } from '../../lib/tiers';
import type { StreakData } from '../../types/streak';

interface HistoryTabProps {
  data: StreakData;
  now: number;
  tier: Tier;
  onClearHistory: () => void;
  onGoDashboard: () => void;
}

function formatDate(iso: string, lang: 'es' | 'en'): string {
  const date = new Date(iso);
  return date.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function HistoryTab({ data, now, tier, onClearHistory, onGoDashboard }: HistoryTabProps) {
  const { t, lang } = useT();
  const [confirming, setConfirming] = useState(false);
  const metrics = computeMetrics(data, now);
  const best = bestRun(data);
  const latestFirst = data.history;

  return (
    <div className="rise-in flex flex-col gap-4 lg:mx-auto lg:max-w-2xl">
      <header className="px-1">
        <h1 className="text-xl font-semibold tracking-tight">{t('history.title')}</h1>
        <p className="mt-1 text-[0.78rem] leading-relaxed text-[color:var(--tier-muted)]">{t('history.sub')}</p>
      </header>

      <section className="grid grid-cols-3 gap-2.5">
        {[
          { icon: Archive, value: String(metrics.totalRuns), label: t('history.totalRuns') },
          { icon: TrendingUp, value: best ? formatCompact(best.durationSeconds) : '—', label: t('history.best') },
          { icon: Clock, value: formatCompact(metrics.totalSeconds), label: t('history.totalTime') },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="glass px-3 py-3">
            <Icon size={13} className="text-[color:var(--tier-muted)]" />
            <p className="stat-value mt-1.5 text-base">{value}</p>
            <p className="mt-0.5 text-[0.58rem] font-semibold uppercase leading-tight tracking-[0.1em] text-[color:var(--tier-muted)]">
              {label}
            </p>
          </div>
        ))}
      </section>

      {data.activeChallengeStart && (
        <section className="glass px-3.5 py-3" style={{ borderColor: 'var(--tier-line-strong)' }}>
          <div className="flex items-center gap-3">
            <TierGlyph tier={tier} size={40} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--tier-accent)]">
                <Flame size={11} /> {t('history.ongoing')}
              </p>
              <p className="stat-value mt-0.5 text-sm">{formatDuration(metrics.currentSeconds)}</p>
            </div>
            <span className="chip shrink-0">{formatCompact(metrics.currentSeconds)}</span>
          </div>
        </section>
      )}

      {latestFirst.length === 0 ? (
        <section className="glass flex flex-col items-center gap-3 px-4 py-10 text-center">
          <Archive size={26} className="text-[color:var(--tier-muted)]" />
          <p className="max-w-[30ch] text-[0.8rem] leading-relaxed text-[color:var(--tier-muted)]">{t('history.empty')}</p>
          <button type="button" onClick={onGoDashboard} className="btn btn-ghost px-4 py-2 text-xs">
            {t('history.emptyCta')}
          </button>
        </section>
      ) : (
        <section className="flex flex-col gap-2.5">
          {latestFirst.map((entry) => {
            const runTier = tierFromHistoryId(entry.maxTierId);
            return (
              <article key={entry.id} className="glass px-3.5 py-3">
                <div className="flex items-start gap-3">
                  <TierGlyph tier={runTier} size={40} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="stat-value text-sm">{formatCompact(entry.durationSeconds)}</p>
                      <span className="shrink-0 font-mono text-[0.6rem] text-[color:var(--tier-muted)]">
                        {formatDate(entry.startedAt, lang)} → {formatDate(entry.endedAt, lang)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[0.68rem] text-[color:var(--tier-muted)]">
                      {runTier.name[lang]} · {t('history.peak')}
                    </p>
                    {entry.note && (
                      <p className="mt-2 rounded-lg bg-black/25 px-2.5 py-1.5 text-[0.72rem] leading-relaxed text-[color:var(--tier-text)]/80">
                        <span className="text-[color:var(--tier-muted)]">{t('history.note')}: </span>
                        {entry.note}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {latestFirst.length > 0 && (
        <div className="flex flex-col items-center gap-2 pb-2">
          {confirming ? (
            <div className="glass flex w-full flex-col gap-2 px-3 py-3">
              <p className="text-[0.76rem] text-[color:var(--tier-muted)]">{t('history.clearConfirm')}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClearHistory();
                    setConfirming(false);
                  }}
                  className="btn flex-1 border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-xs text-rose-200"
                >
                  {t('common.delete')}
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="btn btn-ghost flex-1 px-3 py-2 text-xs">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1.5 text-[0.66rem] font-medium uppercase tracking-[0.14em] text-[color:var(--tier-muted)] transition hover:text-rose-300"
            >
              <Trash2 size={12} /> {t('history.clear')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
