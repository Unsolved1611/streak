import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Cloud,
  KeyRound,
  Languages,
  Loader2,
  Lock,
  QrCode,
  Save,
  Shield,
  Trash2,
  Upload,
} from 'lucide-react';
import { useT } from '../../i18n/context';
import { downloadBackup, parseImportedJson } from '../../lib/storage';
import { syncErrorKey } from '../../lib/syncError';
import type { VaultStore } from '../../state/useVault';
import type { Language } from '../../types/streak';
import SyncBadge from '../SyncBadge';

interface SettingsTabProps {
  store: VaultStore;
  onOpenPair: () => void;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-11 shrink-0 rounded-full border transition"
      style={{
        borderColor: checked ? 'color-mix(in srgb, var(--tier-accent) 60%, transparent)' : 'var(--tier-line)',
        backgroundColor: checked ? 'color-mix(in srgb, var(--tier-accent) 30%, transparent)' : 'rgba(255,255,255,0.06)',
      }}
    >
      <span
        className="absolute rounded-full transition-all duration-200"
        style={{
          height: 18,
          width: 18,
          left: checked ? 22 : 3,
          top: 2,
          backgroundColor: checked ? 'var(--tier-accent)' : 'var(--tier-muted)',
          boxShadow: checked ? '0 0 12px color-mix(in srgb, var(--tier-accent) 60%, transparent)' : 'none',
        }}
      />
    </button>
  );
}

export default function SettingsTab({ store, onOpenPair }: SettingsTabProps) {
  const { t, lang } = useT();
  const { data, credentials, syncStatus, syncError } = store;
  const prefs = data.preferences;

  const [title, setTitle] = useState(prefs.customTitle);
  const [pledge, setPledge] = useState(data.personalPledge);
  const [token, setToken] = useState(credentials?.token ?? '');
  const [gistId, setGistId] = useState(credentials?.gistId ?? '');
  const [showToken, setShowToken] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [importError, setImportError] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setToken(credentials?.token ?? '');
    setGistId(credentials?.gistId ?? '');
  }, [credentials?.token, credentials?.gistId]);

  useEffect(() => {
    setTitle(prefs.customTitle);
  }, [prefs.customTitle]);

  useEffect(() => {
    setPledge(data.personalPledge);
  }, [data.personalPledge]);

  const handleConnect = async () => {
    if (!token.trim()) return;
    setConnecting(true);
    await store.connectCloud({ token, gistId: gistId.trim() || null });
    setConnecting(false);
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseImportedJson(text);
      store.importData(parsed);
      setImportError(false);
    } catch {
      setImportError(true);
    }
  };

  return (
    <div className="rise-in flex flex-col gap-4 lg:mx-auto lg:max-w-2xl">
      <header className="px-1">
        <h1 className="text-xl font-semibold tracking-tight">{t('settings.title')}</h1>
        <p className="mt-1 text-[0.78rem] leading-relaxed text-[color:var(--tier-muted)]">{t('settings.sub')}</p>
      </header>

      {/* identity */}
      <section className="glass flex flex-col gap-3 px-4 py-4">
        <h2 className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--tier-muted)]">
          <Shield size={12} /> {t('settings.profile')}
        </h2>

        <div>
          <label className="label" htmlFor="custom-title">
            {t('settings.titleField')}
          </label>
          <div className="flex gap-2">
            <input
              id="custom-title"
              className="field"
              value={title}
              maxLength={48}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title !== prefs.customTitle && store.updatePreferences({ customTitle: title.trim() || prefs.customTitle })}
              placeholder="Vault"
            />
            <button
              type="button"
              onClick={() => store.updatePreferences({ customTitle: title.trim() || prefs.customTitle })}
              className="btn btn-ghost shrink-0 px-3"
              aria-label={t('common.save')}
            >
              <Save size={15} />
            </button>
          </div>
          <p className="mt-1 text-[0.68rem] leading-snug text-[color:var(--tier-muted)]">{t('settings.titleHint')}</p>
        </div>

        <div>
          <span className="label flex items-center gap-1.5">
            <Languages size={11} /> {t('settings.language')}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(['es', 'en'] as Language[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => store.updatePreferences({ language: code })}
                className="rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition"
                style={{
                  borderColor: lang === code ? 'color-mix(in srgb, var(--tier-accent) 65%, transparent)' : 'var(--tier-line)',
                  backgroundColor: lang === code ? 'color-mix(in srgb, var(--tier-accent) 14%, transparent)' : 'transparent',
                  color: lang === code ? 'var(--tier-accent)' : 'var(--tier-muted)',
                }}
              >
                {code === 'es' ? 'Español' : 'English'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--tier-line)] px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium">{t('settings.discreet')}</p>
            <p className="mt-0.5 text-[0.68rem] leading-snug text-[color:var(--tier-muted)]">{t('settings.discreetDesc')}</p>
          </div>
          <Toggle checked={prefs.discreetMode} onChange={(v) => store.updatePreferences({ discreetMode: v })} label={t('settings.discreet')} />
        </div>
      </section>

      {/* pledge */}
      <section className="glass flex flex-col gap-2 px-4 py-4">
        <label className="label" htmlFor="pledge">
          {t('settings.pledge')}
        </label>
        <textarea
          id="pledge"
          className="field min-h-[92px] resize-y leading-relaxed"
          value={pledge}
          maxLength={2000}
          onChange={(e) => setPledge(e.target.value)}
          placeholder={t('settings.pledgePlaceholder')}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.68rem] leading-snug text-[color:var(--tier-muted)]">{t('settings.pledgeHint')}</p>
          <button
            type="button"
            onClick={() => store.setPledge(pledge)}
            className="btn btn-ghost shrink-0 px-3 py-1.5 text-xs"
          >
            <Save size={13} /> {t('common.save')}
          </button>
        </div>
      </section>

      {/* cloud sync */}
      <section className="glass flex flex-col gap-3 px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--tier-muted)]">
              <Cloud size={12} /> {t('settings.cloud')}
            </h2>
            <p className="mt-1 text-[0.7rem] leading-snug text-[color:var(--tier-muted)]">{t('settings.cloudSub')}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {credentials ? (
              <span className="chip" style={{ color: 'var(--tier-accent)' }}>
                <CheckCircle2 size={10} /> {t('settings.connected')}
              </span>
            ) : (
              <span className="chip">{t('settings.notConnected')}</span>
            )}
            <SyncBadge
              status={syncStatus}
              labels={{
                synced: t('sync.synced'),
                syncing: t('sync.syncing'),
                local: t('sync.localOnly'),
                idle: t('sync.localOnly'),
                error: t('sync.error'),
              }}
              onClick={() => void store.syncNow()}
              title={t('sync.now')}
            />
          </div>
        </div>

        <div>
          <label className="label flex items-center gap-1.5" htmlFor="gh-token">
            <KeyRound size={11} /> {t('settings.token')}
          </label>
          <div className="relative">
            <input
              id="gh-token"
              className="field pr-10 font-mono text-[0.78rem]"
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t('settings.tokenPlaceholder')}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              aria-label={showToken ? t('settings.hideToken') : t('settings.showToken')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[color:var(--tier-muted)] hover:text-[color:var(--tier-text)]"
            >
              {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="mt-1 flex items-start gap-1 text-[0.66rem] leading-snug text-[color:var(--tier-muted)]">
            <Lock size={10} className="mt-0.5 shrink-0" /> {t('settings.tokenHint')}
          </p>
        </div>

        <div>
          <label className="label" htmlFor="gh-gist">
            {t('settings.gistId')}
          </label>
          <input
            id="gh-gist"
            className="field font-mono text-[0.78rem]"
            value={gistId}
            onChange={(e) => setGistId(e.target.value)}
            placeholder={t('settings.gistIdPlaceholder')}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {syncError && (
          <p className="flex items-start gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-2 text-[0.72rem] text-rose-200">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {t(syncErrorKey(store.syncError))}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleConnect()}
            disabled={!token.trim() || connecting}
            className="btn btn-primary flex-1 px-3 py-2 text-xs"
          >
            {connecting ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
            {credentials ? t('settings.update') : t('settings.connect')}
          </button>
          <button type="button" onClick={onOpenPair} disabled={!credentials} className="btn btn-ghost px-3 py-2 text-xs">
            <QrCode size={14} /> {t('settings.pair')}
          </button>
          {credentials && (
            <button
              type="button"
              onClick={store.disconnectCloud}
              className="btn border border-rose-400/30 px-3 py-2 text-xs text-rose-200/90"
            >
              {t('settings.disconnect')}
            </button>
          )}
        </div>
        <p className="text-[0.64rem] leading-snug text-[color:var(--tier-muted)]">{t('settings.pairHint')}</p>
      </section>

      {/* backup */}
      <section className="glass flex flex-col gap-2.5 px-4 py-4">
        <div>
          <h2 className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--tier-muted)]">
            {t('settings.backup')}
          </h2>
          <p className="mt-1 text-[0.7rem] leading-snug text-[color:var(--tier-muted)]">{t('settings.backupSub')}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => downloadBackup(data)} className="btn btn-ghost flex-1 px-3 py-2 text-xs">
            <Download size={14} /> {t('settings.export')}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-ghost flex-1 px-3 py-2 text-xs">
            <Upload size={14} /> {t('settings.import')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImport(file);
              e.target.value = '';
            }}
          />
        </div>
        {importError && (
          <p className="flex items-center gap-1.5 text-[0.72rem] text-rose-300">
            <AlertTriangle size={12} /> {t('settings.importErr')}
          </p>
        )}
      </section>

      {/* privacy */}
      <section className="px-1">
        <h2 className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--tier-muted)]">{t('settings.privacy')}</h2>
        <p className="mt-1 text-[0.7rem] leading-relaxed text-[color:var(--tier-muted)]">{t('settings.privacyBody')}</p>
      </section>

      {/* danger */}
      <section className="glass flex flex-col gap-2 border-rose-400/20 px-4 py-4">
        <h2 className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-rose-300/80">{t('settings.danger')}</h2>
        <p className="text-[0.7rem] leading-snug text-[color:var(--tier-muted)]">{t('settings.resetAllDesc')}</p>
        {confirmWipe ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                store.wipeLocal();
                setConfirmWipe(false);
                setToken('');
                setGistId('');
              }}
              className="btn flex-1 border border-rose-400/40 bg-rose-500/20 px-3 py-2 text-xs text-rose-100"
            >
              <Trash2 size={13} /> {t('settings.resetAllConfirm')}
            </button>
            <button type="button" onClick={() => setConfirmWipe(false)} className="btn btn-ghost flex-1 px-3 py-2 text-xs">
              {t('common.cancel')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmWipe(true)}
            className="flex w-fit items-center gap-1.5 text-[0.66rem] font-medium uppercase tracking-[0.14em] text-rose-300/80 hover:text-rose-300"
          >
            <Trash2 size={12} /> {t('settings.resetAll')}
          </button>
        )}
      </section>
    </div>
  );
}
