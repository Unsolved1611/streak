import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Flame, ShieldCheck, Wind } from 'lucide-react';
import Modal from './Modal';
import { useT } from '../i18n/context';
import { computeMetrics } from '../lib/stats';
import { formatCompact, formatHuman } from '../lib/time';
import type { Tier } from '../lib/tiers';
import type { StreakData } from '../types/streak';

interface ResetRitualModalProps {
  open: boolean;
  onClose: () => void;
  onOpenShield: () => void;
  data: StreakData;
  tier: Tier;
  now: number;
  onReset: (note: string) => void;
}

const HOLD_MS = 3000;

export default function ResetRitualModal({ open, onClose, onOpenShield, data, tier, now, onReset }: ResetRitualModalProps) {
  const { t, lang } = useT();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [hold, setHold] = useState(0);
  const [holding, setHolding] = useState(false);
  const [typed, setTyped] = useState('');
  const [note, setNote] = useState('');
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const advanceTimer = useRef<number | null>(null);

  const metrics = computeMetrics(data, now);
  const confirmWord = t('reset.confirmWord');
  const typedOk = ['RESET', 'REINICIAR'].includes(typed.trim().toUpperCase());

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setHold(0);
    setHolding(false);
    setTyped('');
    setNote('');
  }, [open]);

  const stopHold = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setHolding(false);
    setHold(0);
  }, []);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    },
    [],
  );

  // Typed confirmation is the accessible alternative to the 3s hold.
  useEffect(() => {
    if (step !== 2 || !typedOk) return;
    advanceTimer.current = window.setTimeout(() => {
      setStep(3);
      setHold(0);
    }, 600);
    return () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    };
  }, [typedOk, step]);

  const startHold = () => {
    if (step !== 2 || holding) return;
    setHolding(true);
    startRef.current = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - startRef.current) / HOLD_MS);
      setHold(p);
      if (p >= 1) {
        stopHold();
        setStep(3);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const handleReset = () => {
    onReset(note.trim());
    onClose();
  };

  const losses = [
    t('reset.loseDuration', { duration: formatCompact(metrics.currentSeconds) }),
    t('reset.loseTier', { tier: tier.name[lang] }),
    t('reset.loseAura', { aura: tier.aura[lang] }),
    t('reset.loseRecord', { record: formatCompact(metrics.longestSeconds) }),
  ];

  return (
    <Modal open={open} onClose={onClose} labelledBy="reset-title">
      {/* drain wash: the UI literally loses colour as the seal is held */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[60]"
        style={{
          backdropFilter: `grayscale(${hold.toFixed(3)}) brightness(${(1 - 0.3 * hold).toFixed(3)})`,
          WebkitBackdropFilter: `grayscale(${hold.toFixed(3)}) brightness(${(1 - 0.3 * hold).toFixed(3)})`,
          background: `radial-gradient(circle at 50% 40%, rgba(10,11,16,${(hold * 0.55).toFixed(2)}), rgba(0,0,0,${(hold * 0.75).toFixed(2)}))`,
          opacity: hold > 0 ? 1 : 0,
          transition: holding ? 'opacity 120ms linear' : 'opacity 500ms ease',
        }}
      />

      <div className="flex flex-col gap-4 p-5 pt-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--tier-muted)]">
            {t('reset.step', { n: step })}
          </p>
          <div className="flex gap-1">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className="h-1 w-6 rounded-full transition-colors"
                style={{ backgroundColor: n <= step ? 'var(--tier-accent)' : 'var(--tier-line)' }}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <h2 id="reset-title" className="flex items-center gap-2 text-base font-semibold text-rose-200">
              <AlertTriangle size={17} /> {t('reset.title')}
            </h2>
            <p className="text-[0.8rem] leading-relaxed text-[color:var(--tier-text)]/85">{t('reset.step1')}</p>

            <ul className="flex flex-col gap-2">
              {losses.map((loss) => (
                <li
                  key={loss}
                  className="flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-500/[0.07] px-3 py-2.5 text-[0.8rem] leading-snug text-rose-100/90"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                  {loss}
                </li>
              ))}
            </ul>

            <p className="text-[0.76rem] leading-relaxed text-[color:var(--tier-muted)]">{t('reset.step1Body')}</p>

            <button type="button" onClick={onOpenShield} className="btn btn-primary w-full gap-2 py-3 text-sm">
              <Wind size={16} /> {t('reset.shieldCta')}
            </button>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-[color:var(--tier-muted)] underline decoration-dotted underline-offset-4 hover:text-rose-300"
              >
                {t('reset.continue')}
              </button>
              <button type="button" onClick={onClose} className="btn btn-ghost px-3 py-1.5 text-[0.72rem]">
                <ShieldCheck size={13} /> {t('reset.cancel')}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 id="reset-title" className="text-base font-semibold">
                {t('reset.step2')}
              </h2>
              <p className="mt-1 text-[0.76rem] leading-relaxed text-[color:var(--tier-muted)]">
                {hold > 0 ? t('reset.draining') : t('reset.step1Body')}
              </p>
            </div>

            <button
              type="button"
              onPointerDown={startHold}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  startHold();
                }
              }}
              onKeyUp={(e) => {
                if (e.key === ' ' || e.key === 'Enter') stopHold();
              }}
              className="btn relative w-full select-none overflow-hidden border border-rose-400/40 py-4 text-sm font-semibold text-rose-100"
              style={{ touchAction: 'none', backgroundColor: 'rgba(244,63,94,0.12)' }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0"
                style={{ width: `${hold * 100}%`, backgroundColor: 'rgba(244,63,94,0.35)', transition: holding ? 'none' : 'width 300ms ease' }}
              />
              <span className="relative flex items-center gap-2">
                <Flame size={16} />
                {holding ? t('reset.holding', { s: Math.max(0, Math.ceil((1 - hold) * 3)) }) : t('reset.hold')}
              </span>
            </button>

            <div className="flex items-center gap-2">
              <div className="divider flex-1" />
              <span className="text-[0.62rem] uppercase tracking-[0.14em] text-[color:var(--tier-muted)]">
                {t('reset.orType', { word: confirmWord })}
              </span>
              <div className="divider flex-1" />
            </div>

            <input
              className="field text-center font-mono text-base uppercase tracking-[0.3em]"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmWord}
              aria-label={t('reset.orType', { word: confirmWord })}
              autoComplete="off"
              spellCheck={false}
            />

            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => setStep(1)} className="btn btn-ghost px-3 py-1.5 text-[0.72rem]">
                <ArrowLeft size={13} /> {t('common.back')}
              </button>
              <button type="button" onClick={onClose} className="btn btn-primary px-4 py-2 text-xs">
                <ShieldCheck size={14} /> {t('reset.cancel')}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3">
            <h2 id="reset-title" className="text-base font-semibold">
              {t('reset.step3')}
            </h2>
            <p className="text-[0.76rem] leading-relaxed text-[color:var(--tier-muted)]">{t('reset.step3Body')}</p>
            <div className="rounded-xl border border-[color:var(--tier-line)] bg-black/25 px-3 py-2.5 text-[0.78rem]">
              <p className="text-[color:var(--tier-muted)]">
                {t('history.duration')}: <span className="font-semibold text-[color:var(--tier-text)]">{formatHuman(metrics.currentSeconds, lang)}</span>
              </p>
              <p className="mt-0.5 text-[color:var(--tier-muted)]">
                {t('history.peak')}: <span className="font-semibold text-[color:var(--tier-text)]">{tier.name[lang]}</span>
              </p>
            </div>
            <label className="label" htmlFor="reset-note">
              {t('reset.noteLabel')}
            </label>
            <textarea
              id="reset-note"
              className="field min-h-[84px] resize-y leading-relaxed"
              value={note}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('reset.notePlaceholder')}
            />
            <button
              type="button"
              onClick={handleReset}
              className="btn w-full border border-rose-400/45 bg-rose-500/25 py-3 text-sm font-semibold text-rose-100"
            >
              <Flame size={15} /> {t('reset.archive')}
            </button>
            <button type="button" onClick={onClose} className="btn btn-ghost w-full py-2.5 text-xs">
              <ShieldCheck size={14} /> {t('reset.cancel')}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
