import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Hides the built-in close button (for forced-flow modals). */
  hideClose?: boolean;
  labelledBy?: string;
  panelClassName?: string;
  /** Renders a full-bleed sheet instead of a floating card. */
  variant?: 'card' | 'sheet';
}

export default function Modal({
  open,
  onClose,
  children,
  hideClose = false,
  labelledBy,
  panelClassName = '',
  variant = 'card',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !hideClose) onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, hideClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div
        className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-md"
        onClick={hideClose ? undefined : onClose}
        aria-hidden="true"
      />
      <div
        className={`modal-in relative z-10 w-full ${
          variant === 'sheet'
            ? 'h-[100dvh] max-h-[100dvh] rounded-none'
            : 'max-h-[92dvh] rounded-t-3xl sm:max-w-lg sm:rounded-3xl'
        } overflow-y-auto overscroll-contain border border-[color:var(--tier-line-strong)] bg-[color:var(--tier-bg)]/95 shadow-2xl ${panelClassName}`}
        style={{
          backgroundImage:
            'radial-gradient(90% 60% at 50% -10%, var(--tier-halo-1) 0%, transparent 60%), linear-gradient(180deg, color-mix(in srgb, var(--tier-bg) 92%, black), var(--tier-bg-to))',
        }}
      >
        {!hideClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full border border-[color:var(--tier-line)] bg-black/30 text-[color:var(--tier-muted)] transition hover:text-[color:var(--tier-text)]"
          >
            <X size={16} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
