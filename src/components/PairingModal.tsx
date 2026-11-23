import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { AlertTriangle, QrCode, ShieldAlert, Smartphone } from 'lucide-react';
import Modal from './Modal';
import { useT } from '../i18n/context';
import { buildPairUrl } from '../lib/pairing';
import type { SyncCredentials } from '../types/streak';

interface PairingModalProps {
  open: boolean;
  onClose: () => void;
  credentials: SyncCredentials | null;
}

export default function PairingModal({ open, onClose, credentials }: PairingModalProps) {
  const { t } = useT();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || !credentials?.token) {
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

        {credentials?.token ? (
          <div className="mx-auto w-full max-w-[280px] rounded-2xl bg-white p-3 shadow-[0_0_40px_-10px_rgba(255,255,255,0.35)]">
            {dataUrl ? (
              <img src={dataUrl} alt={t('pair.title')} className="h-auto w-full rounded-lg" />
            ) : (
              <div className="flex aspect-square items-center justify-center">
                <Smartphone className="animate-pulse text-slate-400" />
              </div>
            )}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-[color:var(--tier-line-strong)] px-3 py-6 text-center text-[0.78rem] text-[color:var(--tier-muted)]">
            {t('pair.needsCreds')}
          </p>
        )}

        {credentials?.gistId && (
          <p className="text-center font-mono text-[0.66rem] text-[color:var(--tier-muted)]">
            {t('settings.connectedAs', { id: credentials.gistId })}
          </p>
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
