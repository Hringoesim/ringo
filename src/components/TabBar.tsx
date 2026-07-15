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
  const activeIndex = tabs.findIndex((t) => t.id === active);
  return (
    <div
      style={{
        // Adapts to the home-indicator inset on any device; never less than 24px.
        paddingTop: 10, paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))',
        position: 'relative', background: RC.glassBar,
        borderTop: `1px solid ${RC.line}`,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
      }}
    >
      {/* One gradient pill that MORPHS between tabs (slides), not a per-icon fade. */}
      {activeIndex >= 0 && (
        <div
          style={{
            position: 'absolute', top: 8, left: 0, width: '25%', height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
            transform: `translateX(${activeIndex * 100}%)`,
            transition: 'transform 0.36s cubic-bezier(0.34, 1.4, 0.64, 1)',
          }}
        >
          <div style={{ width: 46, height: 30, borderRadius: 11, background: RC.gradSoft }} />
        </div>
      )}
      {tabs.map((t) => {
        const on = active === t.id;
        return (
          <button
            key={t.id}
            className="press"
            onClick={() => onChange(t.id)}
            style={{
              border: 'none', background: 'none', padding: 0, cursor: 'pointer', position: 'relative',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              color: on ? RC.inkStrong : RC.inkMute,
              fontFamily: 'var(--font)', fontSize: 11, fontWeight: on ? 600 : 500,
              transition: 'color .25s ease',
            }}
          >
            <span
              style={{
                width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: on ? 'scale(1.06)' : 'scale(1)',
                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
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
