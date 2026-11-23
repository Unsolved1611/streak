import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Sparkles } from 'lucide-react';
import BottomNav, { type TabId } from './components/BottomNav';
import OnboardingModal from './components/OnboardingModal';
import PairingModal from './components/PairingModal';
import ParticleField from './components/ParticleField';
import ResetRitualModal from './components/ResetRitualModal';
import SyncBadge from './components/SyncBadge';
import Toast from './components/Toast';
import UrgeShieldModal from './components/UrgeShieldModal';
import DashboardTab from './components/tabs/DashboardTab';
import HistoryTab from './components/tabs/HistoryTab';
import SettingsTab from './components/tabs/SettingsTab';
import VaultTab from './components/tabs/VaultTab';
import { I18nContext } from './i18n/context';
import { translate } from './i18n/translations';
import { elapsedSeconds } from './lib/time';
import { getTierProgress, tierCssVars, type Tier } from './lib/tiers';
import { useNow } from './lib/useNow';
import { useVault } from './state/useVault';

const PEEK_SECONDS = 5;

export default function App() {
  const store = useVault();
  const now = useNow(1000);
  const lang = store.data.preferences.language;

  const [tab, setTab] = useState<TabId>('dashboard');
  const [peekTier, setPeekTier] = useState<Tier | null>(null);
  const [peekLeft, setPeekLeft] = useState(PEEK_SECONDS);
  const [shieldOpen, setShieldOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [pairOpen, setPairOpen] = useState(false);

  const t = useCallback(
    (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  );
  const i18n = useMemo(() => ({ lang, t }), [lang, t]);

  const elapsed = elapsedSeconds(store.data.activeChallengeStart, now);
  const progress = getTierProgress(elapsed);
  const activeTier = progress.current;
  const displayTier = peekTier ?? activeTier;

  // Theme: every tier swaps the CSS variable palette + ambient canvas.
  useEffect(() => {
    const root = document.documentElement;
    const vars = tierCssVars(displayTier);
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
    root.dataset.tier = displayTier.id;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    themeColor?.setAttribute('content', displayTier.palette.bg);
  }, [displayTier]);

  useEffect(() => {
    document.title = store.data.preferences.customTitle || 'Vault';
    document.documentElement.lang = lang;
  }, [store.data.preferences.customTitle, lang]);

  // 5-second peek countdown
  useEffect(() => {
    if (!peekTier) return;
    const id = window.setInterval(() => setPeekLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [peekTier]);

  useEffect(() => {
    if (peekTier && peekLeft <= 0) setPeekTier(null);
  }, [peekTier, peekLeft]);

  const startPeek = () => {
    if (!progress.next) return;
    setPeekLeft(PEEK_SECONDS);
    setPeekTier(progress.next);
  };

  const stopPeek = () => {
    setPeekTier(null);
    setPeekLeft(PEEK_SECONDS);
  };

  const syncLabels = {
    synced: t('sync.synced'),
    syncing: t('sync.syncing'),
    local: t('sync.localOnly'),
    idle: t('sync.localOnly'),
    error: t('sync.error'),
  };

  return (
    <I18nContext.Provider value={i18n}>
      <div className="app-bg relative min-h-[100dvh] overflow-x-hidden">
        <ParticleField config={displayTier.particles} tierId={displayTier.id} />

        <div className="relative z-10 mx-auto w-full max-w-lg px-3.5 pt-safe pb-nav sm:px-5 lg:max-w-4xl lg:px-8">
          <header className="flex items-start justify-between gap-3 pb-1 pt-2">
            <div className="min-w-0">
              <p className="truncate text-[0.55rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--tier-muted)]">
                {t('app.tagline')}
              </p>
              <h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-[color:var(--tier-text)]">
                {store.data.preferences.customTitle || 'Vault'}
              </h1>
            </div>
            <SyncBadge status={store.syncStatus} labels={syncLabels} onClick={() => void store.syncNow()} title={t('sync.now')} />
          </header>

          {peekTier && (
            <div
              className="mb-3 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[0.7rem] backdrop-blur-md"
              style={{
                borderColor: 'var(--tier-line-strong)',
                backgroundColor: 'color-mix(in srgb, var(--tier-accent) 12%, transparent)',
                color: 'var(--tier-text)',
              }}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <Eye size={13} className="shrink-0" style={{ color: 'var(--tier-accent)' }} />
                <span className="truncate">
                  {t('vault.peeking', { seconds: peekLeft })} · {peekTier.name[lang]}
                </span>
              </span>
              <button type="button" onClick={stopPeek} className="shrink-0 font-semibold uppercase tracking-[0.1em] text-[color:var(--tier-accent)]">
                {peekLeft}s
              </button>
            </div>
          )}

          <main className="mt-2">
            {tab === 'dashboard' && (
              <DashboardTab
                data={store.data}
                now={now}
                tier={activeTier}
                progress={progress}
                onOpenShield={() => setShieldOpen(true)}
                onOpenReset={() => setResetOpen(true)}
                onStart={store.startChallenge}
                onOpenPair={() => setPairOpen(true)}
              />
            )}

            {tab === 'vault' && (
              <VaultTab
                tier={activeTier}
                progress={progress}
                peekTier={peekTier}
                peekSecondsLeft={peekLeft}
                onPeek={startPeek}
                onStopPeek={stopPeek}
              />
            )}

            {tab === 'history' && (
              <HistoryTab
                data={store.data}
                now={now}
                tier={activeTier}
                onClearHistory={store.clearHistory}
                onGoDashboard={() => setTab('dashboard')}
              />
            )}

            {tab === 'settings' && <SettingsTab store={store} onOpenPair={() => setPairOpen(true)} />}
          </main>

          <footer className="mt-6 flex items-center justify-center gap-1.5 pb-2 text-center text-[0.58rem] uppercase tracking-[0.18em] text-[color:var(--tier-muted)]/70">
            <Sparkles size={10} />
            {lang === 'es' ? 'Sin servidores · solo tu dispositivo' : 'No servers · your device only'}
          </footer>
        </div>

        <BottomNav
          active={tab}
          onChange={setTab}
          labels={{
            dashboard: t('nav.dashboard'),
            vault: t('nav.vault'),
            history: t('nav.history'),
            settings: t('nav.settings'),
          }}
        />

        <UrgeShieldModal
          open={shieldOpen}
          onClose={() => setShieldOpen(false)}
          data={store.data}
          tier={activeTier}
          now={now}
          onResist={store.resistUrge}
        />

        <ResetRitualModal
          open={resetOpen}
          onClose={() => setResetOpen(false)}
          onOpenShield={() => {
            setResetOpen(false);
            setShieldOpen(true);
          }}
          data={store.data}
          tier={activeTier}
          now={now}
          onReset={(note) => {
            store.resetChallenge(note);
            store.notify('reset.done');
            setTab('dashboard');
          }}
        />

        <PairingModal open={pairOpen} onClose={() => setPairOpen(false)} credentials={store.credentials} />

        <OnboardingModal
          open={store.needsOnboarding && store.hydrated}
          defaultTitle={store.data.preferences.customTitle}
          onComplete={store.completeOnboarding}
          onConnectCloud={store.connectCloud}
          onLanguage={(next) => store.updatePreferences({ language: next })}
        />

        <Toast
          message={store.toast ? { id: store.toast.id, text: t(store.toast.key, store.toast.vars) } : null}
          onDismiss={store.dismissToast}
        />
      </div>
    </I18nContext.Provider>
  );
}
