import { AlertTriangle, CloudOff, Cloud, Check, Loader2 } from 'lucide-react';
import type { SyncStatus } from '../types/streak';

interface SyncBadgeProps {
  status: SyncStatus;
  labels: Record<SyncStatus, string>;
  onClick?: () => void;
  title?: string;
}

const iconFor = (status: SyncStatus) => {
  switch (status) {
    case 'syncing':
      return <Loader2 size={12} className="animate-spin" />;
    case 'synced':
      return <Check size={12} />;
    case 'error':
      return <AlertTriangle size={12} />;
    case 'idle':
      return <Cloud size={12} />;
    default:
      return <CloudOff size={12} />;
  }
};

export default function SyncBadge({ status, labels, onClick, title }: SyncBadgeProps) {
  const tone =
    status === 'error'
      ? 'border-rose-400/40 text-rose-300'
      : status === 'synced'
        ? 'text-[color:var(--tier-accent)]'
        : 'text-[color:var(--tier-muted)]';

  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? labels[status]}
      aria-label={labels[status]}
      className={`chip transition ${tone} ${onClick ? 'hover:brightness-125' : 'cursor-default'}`}
      style={{ backgroundColor: status === 'error' ? 'rgba(244,63,94,0.12)' : undefined }}
    >
      {iconFor(status)}
      <span className="tracking-[0.08em]">{labels[status]}</span>
    </button>
  );
}
