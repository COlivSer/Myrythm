import { Calendar, Home, BarChart3, Wrench, Settings } from 'lucide-react';

export type TabKey = 'today' | 'calendar' | 'insights' | 'toolkit' | 'settings';

interface BottomNavProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

const TABS: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: 'today', label: 'Today', icon: Home },
  { key: 'calendar', label: 'Calendar', icon: Calendar },
  { key: 'insights', label: 'Insights', icon: BarChart3 },
  { key: 'toolkit', label: 'Toolkit', icon: Wrench },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 44px)' }}
    >
      <div className="bg-white border-t rounded-t-2xl shadow-[0_-2px_8px_rgba(0,0,0,0.06)]" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onChange(tab.key)}
                className="flex-1 flex flex-col items-center gap-1 py-3 tap-target"
                style={{ minHeight: '56px' }}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 2}
                  color={isActive ? 'var(--color-primary)' : 'var(--color-text-muted)'}
                />
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
