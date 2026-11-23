import { useEffect } from 'react';
import { Check } from 'lucide-react';

interface ToastProps {
  message: { id: number; text: string } | null;
  onDismiss: () => void;
}

export default function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, 3200);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.9rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
      <div
        key={message.id}
        className="modal-in pointer-events-auto flex max-w-sm items-center gap-2 rounded-full border border-[color:var(--tier-line-strong)] px-4 py-2.5 text-[0.78rem] shadow-xl backdrop-blur-md"
        style={{ backgroundColor: 'color-mix(in srgb, var(--tier-bg) 88%, black)', color: 'var(--tier-text)' }}
        role="status"
      >
        <Check size={14} style={{ color: 'var(--tier-accent)' }} />
        <span>{message.text}</span>
      </div>
    </div>
  );
}
