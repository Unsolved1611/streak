import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { AlertTriangle, Loader2, QrCode, ShieldAlert, Smartphone, Sparkles } from 'lucide-react';
import Modal from './Modal';
import { useT } from '../i18n/context';
import { buildPairUrl } from '../lib/pairing';
import { syncErrorKey } from '../lib/syncError';
import type { SyncCredentials } from '../types/streak';

interface PairingModalProps {
  open: boolean;
  onClose: () => void;
  credentials: SyncCredentials | null;
  /** Creates (or adopts) the private gist so the QR always carries a gist id. */
  onEnsureGist: () => Promise<boolean>;
  syncError: string | null;
}

export default function PairingModal({ open, onClose, credentials, onEnsureGist, syncError }: PairingModalProps) {
  const { t } = useT();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);

  const hasGist = Boolean(credentials?.token && credentials.gistId);

  useEffect(() => {
    if (!open || !credentials?.token || !credentials.gistId) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    const url = buildPairUrl(window.location.origin, window.location.pathname, credentials);
    QRCode.toDataURL(url, {
      width: 560,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0b0c12', light: '#ffffff' },
    })
      .then((value) => {
        if (!cancelled) setDataUrl(value);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, credentials]);

  const handleCreateGist = async () => {
    setCreating(true);
    await onEnsureGist();
    setCreating(false);
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="pair-title">
      <div className="flex flex-col gap-4 p-5 pt-6">
        <header className="flex items-center gap-2">
          <QrCode size={18} style={{ color: 'var(--tier-accent)' }} />
          <h2 id="pair-title" className="text-base font-semibold">
            {t('pair.title')}
          </h2>
        </header>
        <p className="text-[0.78rem] leading-relaxed text-[color:var(--tier-muted)]">{t('pair.sub')}</p>

        {!credentials?.token ? (
          <p className="rounded-xl border border-dashed border-[color:var(--tier-line-strong)] px-3 py-6 text-center text-[0.78rem] text-[color:var(--tier-muted)]">
            {t('pair.needsCreds')}
          </p>
        ) : !hasGist ? (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-400/35 bg-amber-500/10 px-3.5 py-3">
            <p className="text-[0.76rem] leading-relaxed text-amber-100/90">{t('pair.needsGist')}</p>
            {syncError && syncError !== 'no-gist' && (
              <p className="flex items-start gap-1.5 text-[0.72rem] text-rose-200">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {t(syncErrorKey(syncError))}
              </p>
            )}
            <button
              type="button"
              onClick={() => void handleCreateGist()}
              disabled={creating}
              className="btn btn-primary w-full py-2.5 text-sm"
            >
              {creating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {creating ? t('pair.creating') : t('pair.createGist')}
            </button>
          </div>
        ) : (
          <>
            <div className="mx-auto w-full max-w-[280px] rounded-2xl bg-white p-3 shadow-[0_0_40px_-10px_rgba(255,255,255,0.35)]">
              {dataUrl ? (
                <img src={dataUrl} alt={t('pair.title')} className="h-auto w-full rounded-lg" />
              ) : (
                <div className="flex aspect-square items-center justify-center">
                  <Smartphone className="animate-pulse text-slate-400" />
                </div>
              )}
            </div>
            <p className="text-center font-mono text-[0.66rem] text-[color:var(--tier-muted)]">
              {t('settings.connectedAs', { id: credentials.gistId ?? '' })}
            </p>
          </>
        )}

        <div className="flex items-start gap-2 rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2.5">
          <ShieldAlert size={15} className="mt-0.5 shrink-0 text-amber-300" />
          <p className="text-[0.72rem] leading-relaxed text-amber-100/90">{t('pair.warning')}</p>
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-[0.72rem] text-rose-300">
            <AlertTriangle size={12} /> {t('error.generic')}
          </p>
        )}

        <button type="button" onClick={onClose} className="btn btn-ghost w-full py-2.5 text-sm">
          {t('pair.done')}
        </button>
      </div>
    </Modal>
  );
}
