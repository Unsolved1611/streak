import { useCallback, useEffect, useRef, useState } from 'react';
import { Heart, Play, ShieldCheck, Wind, X } from 'lucide-react';
import AuraRelic from './AuraRelic';
import Modal from './Modal';
import { useT } from '../i18n/context';
import { computeMetrics } from '../lib/stats';
import { formatHuman } from '../lib/time';
import type { Tier } from '../lib/tiers';
import type { StreakData } from '../types/streak';

interface UrgeShieldModalProps {
  open: boolean;
  onClose: () => void;
  data: StreakData;
  tier: Tier;
  now: number;
  onResist: () => void;
}

const PHASES = [
  { key: 'inhale', seconds: 4, scale: 1.32 },
  { key: 'hold', seconds: 7, scale: 1.32 },
  { key: 'exhale', seconds: 8, scale: 0.88 },
] as const;

export default function UrgeShieldModal({ open, onClose, data, tier, now, onResist }: UrgeShieldModalProps) {
  const { t, lang } = useT();
  const discreet = data.preferences.discreetMode;
  const metrics = computeMetrics(data, now);

  const [running, setRunning] = useState(true);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(PHASES[0].seconds);
  const [cycles, setCycles] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [carried, setCarried] = useState(0);
  const pulseTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhaseIndex(0);
    setSecondsLeft(PHASES[0].seconds);
    setCycles(0);
    setRunning(true);
    setCarried(0);
  }, [open]);

  useEffect(() => {
    if (!open || !running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((value) => (value > 0 ? value - 1 : value));
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, running, phaseIndex]);

  useEffect(() => {
    if (!open || !running || secondsLeft > 0) return;
    const next = (phaseIndex + 1) % PHASES.length;
    if (next === 0) setCycles((c) => c + 1);
    setPhaseIndex(next);
    setSecondsLeft(PHASES[next].seconds);
  }, [secondsLeft, phaseIndex, open, running]);

  useEffect(
    () => () => {
      if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    },
    [],
  );

  const handleResist = useCallback(() => {
    onResist();
    setCarried((c) => c + 1);
    setPulse(true);
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => setPulse(false), 1200);
  }, [onResist]);

  const phase = PHASES[phaseIndex];
  const phaseLabel = phase.key === 'inhale' ? t('shield.inhale') : phase.key === 'hold' ? t('shield.hold') : t('shield.exhale');
  const ringRadius = 86;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const phaseProgress = (phase.seconds - secondsLeft) / phase.seconds;

  return (
    <Modal open={open} onClose={onClose} variant="sheet" labelledBy="shield-title" hideClose>
      <div
        className="relative flex min-h-full flex-col px-5 pb-8 pt-6"
        style={{
          backgroundImage:
            'radial-gradient(80% 45% at 50% 0%, var(--tier-halo-1) 0%, transparent 60%), radial-gradient(70% 40% at 50% 100%, var(--tier-halo-2) 0%, transparent 65%)',
        }}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--tier-muted)]">
              <Wind size={12} /> {discreet ? t('discreet.shield') : t('shield.title')}
            </p>
            <h2 id="shield-title" className="mt-1 text-lg font-semibold leading-snug">
              {t('shield.sub')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('shield.leave')}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[color:var(--tier-line)] text-[color:var(--tier-muted)]"
          >
            <X size={16} />
          </button>
        </header>

        {/* at stake */}
        <section className="mt-4 flex items-center gap-3 rounded-2xl border border-[color:var(--tier-line-strong)] bg-black/25 px-3 py-3">
          <div className="w-[74px] shrink-0">
            <AuraRelic tier={tier} interactive={false} className="w-full" />
          </div>
          <div className="min-w-0">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-rose-200/80">{t('shield.atStake')}</p>
            <p className="stat-value mt-1 text-base">{formatHuman(metrics.currentSeconds, lang)}</p>
            <p className="mt-0.5 text-[0.72rem] leading-snug text-[color:var(--tier-muted)]">
              {t('shield.atStakeBody', { duration: formatHuman(metrics.currentSeconds, lang), tier: tier.name[lang] })}
            </p>
            <p className="mt-1.5 text-[0.7rem] leading-snug" style={{ color: tier.palette.ring }}>
              {tier.atRisk[lang]}
            </p>
          </div>
        </section>

        {/* breathing orb */}
        <section className="mt-5 flex flex-col items-center">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--tier-muted)]">{t('shield.breathe')}</p>
          <div className="relative mt-3 grid h-[196px] w-[196px] place-items-center">
            <svg viewBox="0 0 196 196" className="absolute inset-0 h-full w-full -rotate-90">
              <circle cx="98" cy="98" r={ringRadius} fill="none" stroke="var(--tier-line)" strokeWidth="2" />
              <circle
                cx="98"
                cy="98"
                r={ringRadius}
                fill="none"
                stroke="var(--tier-accent)"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                strokeDashoffset={ringCircumference * (1 - phaseProgress)}
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 600ms ease' }}
              />
            </svg>

            <div
              className="absolute rounded-full"
              style={{
                width: 140,
                height: 140,
                background:
                  'radial-gradient(circle at 38% 32%, color-mix(in srgb, var(--tier-accent) 60%, transparent), color-mix(in srgb, var(--tier-accent-2) 28%, transparent) 55%, transparent 75%)',
                boxShadow: '0 0 60px -10px color-mix(in srgb, var(--tier-accent) 70%, transparent)',
                border: '1px solid color-mix(in srgb, var(--tier-accent) 40%, transparent)',
                transform: `scale(${running ? phase.scale : 1})`,
                transition: `transform ${running ? phase.seconds : 1}s cubic-bezier(0.36, 0, 0.64, 1), border-color 600ms ease`,
              }}
            >
              <div className="grid h-full w-full place-items-center">
                <div className="text-center">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--tier-text)]/90">{phaseLabel}</p>
                  <p className="timer mt-0.5 font-mono text-2xl font-semibold">{secondsLeft}</p>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-[0.7rem] text-[color:var(--tier-muted)]">{t('shield.breatheHint')}</p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRunning((v) => !v)}
              className="btn btn-ghost px-3 py-1.5 text-[0.68rem]"
            >
              <Play size={11} /> {running ? t('shield.stopBreathe') : t('shield.startBreathe')}
            </button>
            {cycles > 0 && <span className="text-[0.68rem] text-[color:var(--tier-muted)]">{t('shield.cycles', { n: cycles })}</span>}
          </div>
        </section>

        {/* pledge */}
        <section className="mt-5 rounded-2xl border border-[color:var(--tier-line)] bg-black/20 px-3.5 py-3">
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--tier-muted)]">
            {discreet ? t('discreet.pledge') : t('shield.pledge')}
          </p>
          {data.personalPledge ? (
            <p className="mt-1.5 border-l-2 pl-3 text-[0.86rem] leading-relaxed italic" style={{ borderColor: 'var(--tier-accent)' }}>
              “{data.personalPledge}”
            </p>
          ) : (
            <p className="mt-1 text-[0.76rem] text-[color:var(--tier-muted)]">{t('shield.pledgeEmpty')}</p>
          )}
        </section>

        {/* resist */}
        <div className="relative mt-5">
          {pulse && <span className="plus-one pointer-events-none absolute inset-x-0 -top-2 mx-auto w-fit text-sm font-bold" style={{ color: 'var(--tier-accent)' }}>+1</span>}
          <button
            type="button"
            onClick={handleResist}
            className={`btn btn-primary w-full gap-2 py-3.5 text-sm ${pulse ? 'relic-tap-pulse' : ''}`}
          >
            <Heart size={16} /> {discreet ? t('discreet.resisted') : t('shield.resisted')}
            <span className="rounded-full bg-black/15 px-1.5 py-0.5 text-[0.62rem] font-bold">+1</span>
          </button>
          <p className="mt-2 text-center text-[0.68rem] text-[color:var(--tier-muted)]">
            {t('shield.total', { n: metrics.urgesResisted + carried })}
            {carried > 0 && <span className="ml-1.5 font-semibold" style={{ color: 'var(--tier-accent)' }}>{t('shield.resistedPlus')}</span>}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mx-auto mt-4 flex items-center gap-1.5 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[color:var(--tier-muted)]"
        >
          <ShieldCheck size={12} /> {t('shield.leave')}
        </button>
      </div>
    </Modal>
  );
}
