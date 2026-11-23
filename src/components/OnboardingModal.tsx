import { useState } from 'react';
import { ArrowLeft, ArrowRight, Cloud, Loader2, Shield, Sparkles } from 'lucide-react';
import Modal from './Modal';
import { useT } from '../i18n/context';
import type { SyncCredentials } from '../types/streak';

interface OnboardingModalProps {
  open: boolean;
  defaultTitle: string;
  onComplete: (opts: { pledge?: string; title?: string; discreet?: boolean; start: boolean }) => void;
  onConnectCloud: (credentials: SyncCredentials) => Promise<boolean>;
  onLanguage: (lang: 'es' | 'en') => void;
}

export default function OnboardingModal({ open, defaultTitle, onComplete, onConnectCloud, onLanguage }: OnboardingModalProps) {
  const { t, lang } = useT();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState(defaultTitle);
  const [discreet, setDiscreet] = useState(false);
  const [pledge, setPledge] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [pledgeTouched, setPledgeTouched] = useState(false);
  const [token, setToken] = useState('');
  const [gistId, setGistId] = useState('');
  const [busy, setBusy] = useState(false);

  const finish = async (start: boolean) => {
    setBusy(true);
    if (token.trim()) {
      // Pulling the vault first means onboarding never overwrites cloud data.
      await onConnectCloud({ token, gistId: gistId.trim() || null });
    }
    onComplete({
      pledge: pledgeTouched ? pledge : undefined,
      title: titleTouched ? title : undefined,
      discreet,
      start,
    });
    setBusy(false);
  };

  return (
    <Modal open={open} onClose={() => undefined} hideClose labelledBy="onboard-title">
      <div className="flex flex-col gap-4 p-5 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className="h-1 w-7 rounded-full transition-colors"
                style={{ backgroundColor: n <= step ? 'var(--tier-accent)' : 'var(--tier-line)' }}
              />
            ))}
          </div>
          <div className="flex gap-1 rounded-full border border-[color:var(--tier-line)] p-0.5">
            {(['es', 'en'] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onLanguage(code)}
                className="rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.08em] transition"
                style={{
                  backgroundColor: lang === code ? 'color-mix(in srgb, var(--tier-accent) 20%, transparent)' : 'transparent',
                  color: lang === code ? 'var(--tier-accent)' : 'var(--tier-muted)',
                }}
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        {step === 1 && (
          <>
            <div>
              <p className="flex items-center gap-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--tier-muted)]">
                <Sparkles size={11} /> {t('onboard.step', { n: 1, total: 3 })}
              </p>
              <h2 id="onboard-title" className="mt-1.5 text-xl font-semibold leading-tight">
                {t('onboard.title')}
              </h2>
              <p className="mt-2 text-[0.8rem] leading-relaxed text-[color:var(--tier-muted)]">{t('onboard.sub')}</p>
            </div>

            <div>
              <label className="label" htmlFor="onboard-title-input">
                {t('onboard.nameLabel')}
              </label>
              <input
                id="onboard-title-input"
                className="field"
                value={title}
                maxLength={48}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitleTouched(true);
                }}
                placeholder="Vault"
              />
            </div>

            <button
              type="button"
              onClick={() => setDiscreet((v) => !v)}
              className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition"
              style={{
                borderColor: discreet ? 'color-mix(in srgb, var(--tier-accent) 60%, transparent)' : 'var(--tier-line)',
                backgroundColor: discreet ? 'color-mix(in srgb, var(--tier-accent) 10%, transparent)' : 'transparent',
              }}
            >
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Shield size={13} /> {t('onboard.discreet')}
                </p>
                <p className="mt-0.5 text-[0.68rem] text-[color:var(--tier-muted)]">{t('onboard.discreetHint')}</p>
              </div>
              <span
                className="h-3 w-3 shrink-0 rounded-full border"
                style={{ borderColor: 'var(--tier-accent)', backgroundColor: discreet ? 'var(--tier-accent)' : 'transparent' }}
              />
            </button>

            <button type="button" onClick={() => setStep(2)} className="btn btn-primary w-full py-3 text-sm">
              {t('common.continue')} <ArrowRight size={15} />
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--tier-muted)]">
                {t('onboard.step', { n: 2, total: 3 })}
              </p>
              <h2 id="onboard-title" className="mt-1.5 text-lg font-semibold leading-tight">
                {t('onboard.pledgeLabel')}
              </h2>
            </div>
            <textarea
              className="field min-h-[120px] resize-y leading-relaxed"
              value={pledge}
              maxLength={2000}
              onChange={(e) => {
                setPledge(e.target.value);
                setPledgeTouched(true);
              }}
              placeholder={t('onboard.pledgePlaceholder')}
              autoFocus
            />
            <p className="text-[0.7rem] leading-snug text-[color:var(--tier-muted)]">{t('onboard.pledgeHint')}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)} className="btn btn-ghost px-3 py-3 text-xs">
                <ArrowLeft size={14} />
              </button>
              <button type="button" onClick={() => setStep(3)} className="btn btn-primary flex-1 py-3 text-sm">
                {t('common.continue')} <ArrowRight size={15} />
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--tier-muted)]">
                {t('onboard.step', { n: 3, total: 3 })}
              </p>
              <h2 id="onboard-title" className="mt-1.5 flex items-center gap-2 text-lg font-semibold leading-tight">
                <Cloud size={17} /> {t('onboard.cloudTitle')}
              </h2>
              <p className="mt-2 text-[0.76rem] leading-relaxed text-[color:var(--tier-muted)]">{t('onboard.cloudBody')}</p>
            </div>
            <div>
              <label className="label" htmlFor="onboard-token">
                {t('settings.token')} <span className="lowercase tracking-normal">({t('common.optional')})</span>
              </label>
              <input
                id="onboard-token"
                className="field font-mono text-[0.76rem]"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={t('settings.tokenPlaceholder')}
                autoComplete="off"
                spellCheck={false}
              />
              <p className="mt-1 text-[0.66rem] leading-snug text-[color:var(--tier-muted)]">{t('settings.tokenHint')}</p>
            </div>
            <div>
              <label className="label" htmlFor="onboard-gist">
                {t('settings.gistId')} <span className="lowercase tracking-normal">({t('common.optional')})</span>
              </label>
              <input
                id="onboard-gist"
                className="field font-mono text-[0.76rem]"
                value={gistId}
                onChange={(e) => setGistId(e.target.value)}
                placeholder={t('settings.gistIdPlaceholder')}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(2)} className="btn btn-ghost px-3 py-3 text-xs">
                <ArrowLeft size={14} />
              </button>
              <button type="button" onClick={() => void finish(true)} disabled={busy} className="btn btn-primary flex-1 py-3 text-sm">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} {t('onboard.start')}
              </button>
            </div>
            <button
              type="button"
              onClick={() => void finish(false)}
              disabled={busy}
              className="text-center text-[0.68rem] uppercase tracking-[0.14em] text-[color:var(--tier-muted)] underline decoration-dotted underline-offset-4"
            >
              {t('onboard.skip')}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
