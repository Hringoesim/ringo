// TabBar.tsx — warm bottom tab bar for the top-level destinations.
import type { ReactNode } from 'react';
import { RC } from '../theme';

type TabId = 'home' | 'browse' | 'numbers' | 'plan';
type IconKind = 'home' | 'globe' | 'phone' | 'card';

function tabIcon(kind: IconKind) {
  return (color: string): ReactNode => {
    switch (kind) {
      case 'home':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 11l9-7 9 7v9a2 2 0 01-2 2h-4v-6h-6v6H5a2 2 0 01-2-2v-9z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        );
      case 'globe':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
            <path d="M3 12h18M12 3c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.5-4-9s1.5-6.5 4-9z" stroke={color} strokeWidth="1.8" />
          </svg>
        );
      case 'phone':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="6" y="3" width="12" height="18" rx="3" stroke={color} strokeWidth="1.8" />
            <circle cx="12" cy="17.5" r="0.9" fill={color} />
          </svg>
        );
      case 'card':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="6" width="18" height="13" rx="3" stroke={color} strokeWidth="1.8" />
            <path d="M3 11h18" stroke={color} strokeWidth="1.8" />
          </svg>
        );
    }
  };
}

const tabs: { id: TabId; label: string; icon: (c: string) => ReactNode }[] = [
  { id: 'home', label: 'Home', icon: tabIcon('home') },
  { id: 'browse', label: 'Browse', icon: tabIcon('globe') },
  { id: 'numbers', label: 'Numbers', icon: tabIcon('phone') },
  { id: 'plan', label: 'Plan', icon: tabIcon('card') },
];

export function RingoTabBar({
  active,
  onChange,
}: {
  active: string;
  onChange: (id: TabId) => void;
}) {
  return (
    <div
      style={{
        height: 84, paddingTop: 10, paddingBottom: 30, position: 'relative',
        background: 'rgba(255,246,239,0.82)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: `1px solid ${RC.line}`,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
      }}
    >
      {tabs.map((t) => {
        const on = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              border: 'none', background: 'none', padding: 0, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              color: on ? RC.inkStrong : RC.inkMute,
              fontFamily: 'Poppins', fontSize: 11, fontWeight: on ? 600 : 500,
            }}
          >
            <span
              style={{
                width: 28, height: 28, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: on ? RC.gradSoft : 'transparent',
              }}
            >
              {t.icon(on ? RC.inkStrong : RC.inkMute)}
            </span>
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
