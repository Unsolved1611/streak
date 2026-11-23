import { Eye, EyeOff, Lock, Sparkles, Unlock } from 'lucide-react';
import TierGlyph from '../TierGlyph';
import { useT } from '../../i18n/context';
import { formatCountdown } from '../../lib/time';
import { TIERS, TIER_COUNT, tierThresholdLabel, type Tier, type TierProgress } from '../../lib/tiers';

interface VaultTabProps {
  tier: Tier;
  progress: TierProgress;
  peekTier: Tier | null;
  peekSecondsLeft: number;
  onPeek: () => void;
  onStopPeek: () => void;
}

export default function VaultTab({ tier, progress, peekTier, peekSecondsLeft, onPeek, onStopPeek }: VaultTabProps) {
  const { t, lang } = useT();
  const nextLocked = progress.next;
  const peeking = Boolean(peekTier);

  return (
    <div className="rise-in flex flex-col gap-4 lg:mx-auto lg:max-w-3xl">
      <header className="px-1">
        <h1 className="text-xl font-semibold tracking-tight">{t('vault.title')}</h1>
        <p className="mt-1 text-[0.78rem] leading-relaxed text-[color:var(--tier-muted)]">{t('vault.sub')}</p>
      </header>

      {/* peek control */}
      <section
        className="glass relative overflow-hidden px-4 py-3.5"
        style={peeking ? { borderColor: 'var(--tier-line-strong)', boxShadow: 'var(--tier-glow-soft)' } : undefined}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{peeking ? t('vault.peeking', { seconds: peekSecondsLeft }) : t('vault.peek')}</p>
            <p className="mt-0.5 text-[0.7rem] leading-snug text-[color:var(--tier-muted)]">{t('vault.peekHint')}</p>
          </div>
          {peeking ? (
            <button type="button" onClick={onStopPeek} className="btn btn-ghost shrink-0 px-3 py-2 text-xs">
              <EyeOff size={14} /> {t('common.close')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onPeek}
              disabled={!nextLocked}
              className="btn btn-primary shrink-0 px-3 py-2 text-xs"
            >
              <Eye size={14} /> 5s
            </button>
          )}
        </div>
        {peeking && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full transition-[width] duration-1000 ease-linear"
              style={{ width: `${(peekSecondsLeft / 5) * 100}%`, backgroundColor: 'var(--tier-accent)' }}
            />
          </div>
        )}
      </section>

      {/* tier ladder */}
      <section className="grid gap-2.5 md:grid-cols-2">
        {TIERS.map((item) => {
          const unlocked = item.index <= tier.index;
          const isActive = item.index === tier.index;
          const isPeek = peekTier?.id === item.id;
          const secondsNeeded = Math.max(0, item.minSeconds - (progress.current.minSeconds + progress.secondsIntoCurrent));
          return (
            <article
              key={item.id}
              className={`glass relative flex items-center gap-3 px-3.5 py-3 transition ${
                unlocked ? '' : 'opacity-90'
              } ${isPeek ? 'scale-[1.005]' : ''}`}
              style={{
                borderColor: isActive || isPeek ? 'var(--tier-line-strong)' : undefined,
                boxShadow: isActive ? 'var(--tier-glow-soft)' : isPeek ? '0 0 26px -6px var(--tier-accent)' : undefined,
                backgroundImage: unlocked
                  ? `radial-gradient(120% 140% at 0% 0%, ${item.palette.halo[0]} 0%, transparent 55%)`
                  : undefined,
              }}
            >
              <div className="relative shrink-0">
                <TierGlyph tier={item} size={54} locked={!unlocked} />
                {!unlocked && (
                  <span className="absolute inset-0 grid place-items-center">
                    <Lock size={15} className="text-white/70" />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold" style={{ color: unlocked ? item.palette.ring : 'var(--tier-muted)' }}>
                    {unlocked ? item.name[lang] : t('vault.mystery')}
                  </h3>
                  {isActive && (
                    <span className="chip shrink-0 px-1.5 py-0 text-[0.55rem]" style={{ color: item.palette.accent }}>
                      <Sparkles size={9} /> {t('vault.current')}
                    </span>
                  )}
                  {isPeek && (
                    <span className="chip shrink-0 px-1.5 py-0 text-[0.55rem]">
                      <Eye size={9} /> peek
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[0.72rem] text-[color:var(--tier-muted)]">
                  {unlocked ? item.motto[lang] : t('vault.mysteryBody')}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-[0.62rem] font-medium uppercase tracking-[0.1em]">
                  {unlocked ? (
                    <span className="flex items-center gap-1 text-[color:var(--tier-accent)]">
                      <Unlock size={10} /> {t('vault.unlocked')} · {tierThresholdLabel(item)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[color:var(--tier-muted)]">
                      <Lock size={10} /> {t('vault.unlockAt', { time: formatCountdown(secondsNeeded) })}
                    </span>
                  )}
                </div>
              </div>

              <span className="shrink-0 font-mono text-[0.62rem] text-[color:var(--tier-muted)]">
                {String(item.index + 1).padStart(2, '0')}/{TIER_COUNT}
              </span>
            </article>
          );
        })}
      </section>

      <p className="px-1 pb-2 text-center text-[0.66rem] leading-relaxed text-[color:var(--tier-muted)]">
        {lang === 'es'
          ? 'El rango se calcula en vivo: si la racha se rompe, todo vuelve a la primera brasa.'
          : 'Rank is computed live: if the streak breaks, everything drops back to the first ember.'}
      </p>
    </div>
  );
}
