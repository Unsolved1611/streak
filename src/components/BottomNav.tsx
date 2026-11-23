import { Gem, History, LayoutDashboard, Settings } from 'lucide-react';

export type TabId = 'dashboard' | 'vault' | 'history' | 'settings';

interface BottomNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  labels: Record<TabId, string>;
}

const TABS: { id: TabId; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'vault', icon: Gem },
  { id: 'history', icon: History },
  { id: 'settings', icon: Settings },
];

export default function BottomNav({ active, onChange, labels }: BottomNavProps) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-lg px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2"
    >
      <div className="glass glass-shimmer flex items-stretch gap-1 rounded-2xl border-[color:var(--tier-line-strong)] px-1.5 py-1.5">
        {TABS.map(({ id, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className="tab-btn"
              data-active={isActive}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={19} strokeWidth={isActive ? 2.2 : 1.7} />
              <span className="truncate">{labels[id]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
