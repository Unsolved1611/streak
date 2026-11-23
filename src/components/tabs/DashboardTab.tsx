import { Clock, Flame, Gem, HeartPulse, QrCode, ShieldCheck, Sparkles, TrendingUp, Wind } from 'lucide-react';
import AuraRelic from '../AuraRelic';
import Heatmap from '../Heatmap';
import ProgressRail from '../ProgressRail';
import TimerDisplay from '../TimerDisplay';
import { useT } from '../../i18n/context';
import { computeMetrics } from '../../lib/stats';
import { formatCompact, formatHuman } from '../../lib/time';
import { TIER_COUNT, type Tier, type TierProgress } from '../../lib/tiers';
import type { StreakData } from '../../types/streak';

interface DashboardTabProps {
  data: StreakData;
  now: number;
  tier: Tier;
  progress: TierProgress;
  onOpenShield: () => void;
  onOpenReset: () => void;
  onStart: () => void;
  onOpenPair: () => void;
}

function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  if (hours >= 100) return Math.round(hours).toLocaleString();
  if (hours >= 10) return hours.toFixed(1);
  return hours.toFixed(hours < 1 ? 2 : 1);
}

export default function DashboardTab({
  data,
  now,
  tier,
  progress,
  onOpenShield,
  onOpenReset,
  onStart,
  onOpenPair,
}: DashboardTabProps) {
  const { t, lang } = useT();
  const discreet = data.preferences.discreetMode;
  const metrics = computeMetrics(data, now);
  const isActive = Boolean(data.activeChallengeStart);

  const stats = [
    {
      icon: Clock,
      value: formatHours(metrics.totalSeconds),
      label: t('dash.stat.reclaimed'),
      suffix: t('common.hoursShort'),
    },
    { icon: TrendingUp, value: formatCompact(metrics.longestSeconds), label: t('dash.stat.longest') },
    {
      icon: ShieldCheck,
      value: String(metrics.urgesResisted),
      label: discreet ? t('discreet.urges') : t('dash.stat.urges'),
    },
    { icon: Flame, value: String(metrics.cleanDays), label: t('dash.stat.cleanDays') },
  ];

  return (
    <div className="rise-in flex flex-col gap-4 lg:grid lg:grid-cols-5 lg:items-start lg:gap-4">
      {/* ---------------- centerpiece ---------------- */}
      <section className="glass glass-shimmer relative overflow-hidden px-4 pb-5 pt-4 sm:px-6 lg:col-span-3 lg:row-span-4 lg:row-start-1">
        <div className="flex items-center justify-between gap-2">
          <span className="chip">
            <Sparkles size={11} />
            {t('vault.tierN', { n: tier.index + 1, total: TIER_COUNT })}
          </span>
          <button type="button" onClick={onOpenPair} className="chip transition hover:brightness-125" aria-label={t('dash.shareQr')}>
            <QrCode size={11} />
            <span className="hidden sm:inline">{t('dash.shareQr')}</span>
          </button>
        </div>

        <div className="mx-auto mt-1 w-[76%] max-w-[280px]">
          <AuraRelic tier={tier} progress={progress.progress} />
        </div>

        <div className="mt-1 text-center">
          <h2
            className="text-lg font-semibold tracking-[0.16em] uppercase text-[color:var(--tier-text)]"
            style={{ textShadow: '0 0 24px color-mix(in srgb, var(--tier-accent) 55%, transparent)' }}
          >
            {tier.name[lang]}
          </h2>
          <p className="mx-auto mt-1 max-w-[26ch] text-[0.74rem] leading-snug text-[color:var(--tier-muted)]">{tier.motto[lang]}</p>
        </div>

        <div className="mt-4">
          <TimerDisplay seconds={metrics.currentSeconds} />
        </div>

        <div className="mt-3.5">
          <ProgressRail
            progress={progress.progress}
            nextTier={progress.next}
            secondsToNext={progress.secondsToNext}
            nextLabel={t('dash.nextTier')}
            toNextLabel={t('dash.toNext')}
            maxLabel={t('dash.maxTier')}
            lang={lang}
            overall={progress.overallProgress}
            overallLabel={t('dash.overall')}
          />
        </div>

        {!isActive && (
          <div className="mt-4 rounded-2xl border border-dashed border-[color:var(--tier-line-strong)] p-3 text-center">
            <p className="text-sm font-semibold">{t('dash.start.title')}</p>
            <p className="mt-1 text-[0.74rem] text-[color:var(--tier-muted)]">{t('dash.start.body')}</p>
            <button type="button" onClick={onStart} className="btn btn-primary mt-3 px-5 py-2 text-sm">
              <Flame size={16} /> {t('dash.start.cta')}
            </button>
          </div>
        )}
      </section>

      {/* ---------------- urge shield ---------------- */}
      <button
        type="button"
        onClick={onOpenShield}
        className="group relative w-full overflow-hidden rounded-2xl p-[1px] text-left transition active:scale-[0.99] lg:col-span-2 lg:row-start-1"
        style={{
          backgroundImage:
            'linear-gradient(120deg, color-mix(in srgb, var(--tier-accent) 75%, transparent), color-mix(in srgb, var(--tier-accent-2) 60%, transparent) 65%, color-mix(in srgb, var(--tier-accent-3) 45%, transparent))',
          boxShadow: 'var(--tier-glow-soft)',
        }}
      >
        <div
          className="relative flex items-center gap-3 rounded-2xl px-4 py-3.5 backdrop-blur-md"
          style={{ backgroundColor: 'color-mix(in srgb, var(--tier-bg) 90%, black)' }}
        >
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
            style={{
              background: 'radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--tier-accent) 40%, transparent), transparent 72%)',
              border: '1px solid color-mix(in srgb, var(--tier-accent) 50%, transparent)',
            }}
          >
            <Wind size={20} style={{ color: 'var(--tier-accent)' }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--tier-text)' }}>
              {discreet ? t('discreet.shield') : t('dash.shield')}
            </p>
            <p className="truncate text-[0.72rem]" style={{ color: 'var(--tier-muted)' }}>
              {discreet ? t('discreet.shieldSub') : t('dash.shieldSub')}
            </p>
          </div>
          <HeartPulse size={16} className="shrink-0" style={{ color: 'var(--tier-accent)' }} />
        </div>
      </button>

      {/* ---------------- stats ---------------- */}
      <section className="grid grid-cols-2 gap-3 lg:col-span-2 lg:row-start-2">
        {stats.map(({ icon: Icon, value, label, suffix }) => (
          <div key={label} className="glass px-3.5 py-3">
            <div className="flex items-center gap-1.5 text-[color:var(--tier-muted)]">
              <Icon size={13} />
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.12em]">{label}</span>
            </div>
            <p className="stat-value mt-1.5 flex items-baseline gap-1 text-xl text-[color:var(--tier-text)]">
              {value}
              {suffix && <span className="text-[0.65rem] font-medium text-[color:var(--tier-muted)]">{suffix}</span>}
            </p>
          </div>
        ))}
      </section>

      {/* ---------------- heatmap ---------------- */}
      <section className="glass px-4 py-4 lg:col-span-5 lg:row-start-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <Gem size={14} className="text-[color:var(--tier-accent)]" /> {t('dash.heatmap.title')}
            </h3>
            <p className="mt-0.5 text-[0.7rem] text-[color:var(--tier-muted)]">{t('dash.heatmap.sub')}</p>
          </div>
          <span className="chip shrink-0">{metrics.cleanDays}</span>
        </div>
        <Heatmap data={data} now={now} lessLabel={t('dash.heatmap.less')} moreLabel={t('dash.heatmap.more')} />
      </section>

      {/* ---------------- pledge ---------------- */}
      <section className="glass px-4 py-4 lg:col-span-2 lg:row-start-3">
        <h3 className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--tier-muted)]">
          {discreet ? t('discreet.pledge') : t('dash.pledgeTitle')}
        </h3>
        {data.personalPledge ? (
          <p className="mt-2 border-l-2 pl-3 text-[0.86rem] leading-relaxed italic text-[color:var(--tier-text)]" style={{ borderColor: 'var(--tier-accent)' }}>
            “{data.personalPledge}”
          </p>
        ) : (
          <p className="mt-1.5 text-[0.76rem] leading-relaxed text-[color:var(--tier-muted)]">{t('dash.pledgeEmpty')}</p>
        )}
      </section>

      {/* ---------------- at stake + reset ---------------- */}
      <section className="flex flex-col gap-2 pb-1 lg:col-span-2 lg:row-start-4">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--tier-line)] px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--tier-muted)]">{t('dash.atStake')}</p>
            <p className="truncate text-[0.8rem] text-[color:var(--tier-text)]">
              {formatHuman(metrics.currentSeconds, lang)} · {tier.name[lang]}
            </p>
          </div>
          {metrics.longestSeconds > 0 && metrics.currentSeconds >= metrics.longestSeconds && (
            <span className="chip shrink-0">
              <TrendingUp size={11} /> {t('dash.recordBadge')}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenReset}
          className="self-center px-2 py-1 text-[0.66rem] font-medium uppercase tracking-[0.14em] text-[color:var(--tier-muted)] underline decoration-dotted underline-offset-4 transition hover:text-rose-300"
        >
          {discreet ? t('discreet.reset') : t('reset.trigger')}
        </button>
      </section>
    </div>
  );
}
