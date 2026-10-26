// TabBar.tsx — floating Liquid Glass (iOS 26) tab bar for the top-level
// destinations. A translucent, blurred capsule that hovers over the content.
import type { ReactNode } from 'react';
import { RC, GLASS, TABBAR_MAX } from '../theme';
import { useLayout } from '../lib/layout';

export type TabId = 'store' | 'esim' | 'rewards' | 'help';
type IconKind = 'globe' | 'sim' | 'star' | 'help';

// Wise-style tab icons — friendly, rounded, generous stroke; the ACTIVE state
// solidifies (filled glyph with details knocked out) the way Wise fills its
// selected nav icons. `k` (knock-out) = the pill colour showing through a fill.
function tabIcon(kind: IconKind) {
  return (color: string, active: boolean): ReactNode => {
    const s = { stroke: color, strokeWidth: 2.1, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' as const };
    const k = 'rgba(255,255,255,0.9)'; // knock-out for filled (active) glyphs
    switch (kind) {
      case 'globe':
        return active ? (
          <svg width="24" height="24" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" fill={color} />
            <path d="M3 12h18M12 3c2.5 2.6 4 5.6 4 9s-1.5 6.4-4 9c-2.5-2.6-4-5.6-4-9s1.5-6.4 4-9z" stroke={k} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" {...s} />
            <path d="M3 12h18M12 3c2.5 2.6 4 5.6 4 9s-1.5 6.4-4 9c-2.5-2.6-4-5.6-4-9s1.5-6.4 4-9z" {...s} />
          </svg>
        );
      case 'sim':
        return active ? (
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M7 2.6h6.2L18 7.4v11.4a2.6 2.6 0 0 1-2.6 2.6H7a2.6 2.6 0 0 1-2.6-2.6V5.2A2.6 2.6 0 0 1 7 2.6z" fill={color} />
            <rect x="8" y="11" width="8" height="6" rx="1.4" fill={k} />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M7 2.6h6.2L18 7.4v11.4a2.6 2.6 0 0 1-2.6 2.6H7a2.6 2.6 0 0 1-2.6-2.6V5.2A2.6 2.6 0 0 1 7 2.6z" {...s} />
            <rect x="8" y="11" width="8" height="6" rx="1.4" {...s} />
          </svg>
        );
      case 'star':
        return active ? (
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M12 3.2l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.5l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill={color} stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M12 3.2l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.5l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" {...s} />
          </svg>
        );
      case 'help':
        return active ? (
          <svg width="24" height="24" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" fill={color} />
            <path d="M9.4 9.6a2.7 2.7 0 0 1 5.3.6c0 1.6-2.2 2-2.2 3.4" stroke={k} strokeWidth="1.9" fill="none" strokeLinecap="round" />
            <circle cx="12.5" cy="16.6" r="1" fill={k} />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" {...s} />
            <path d="M9.4 9.6a2.7 2.7 0 0 1 5.3.6c0 1.6-2.2 2-2.2 3.4" {...s} />
            <circle cx="12.5" cy="16.6" r="1" fill={color} />
          </svg>
        );
    }
  };
}

const tabs: { id: TabId; label: string; icon: (c: string, active: boolean) => ReactNode }[] = [
  { id: 'store', label: 'eSIMs', icon: tabIcon('globe') },
  { id: 'esim', label: 'My eSIM', icon: tabIcon('sim') },
  { id: 'rewards', label: 'Rewards', icon: tabIcon('star') },
  { id: 'help', label: 'Help', icon: tabIcon('help') },
];

export function RingoTabBar({
  active,
  onChange,
}: {
  active: string;
  onChange: (id: TabId) => void;
}) {
  const l = useLayout();
  const activeIndex = tabs.findIndex((t) => t.id === active);
  return (
    // Floats over the content; the margins let taps pass through to what's behind.
    <nav
      data-tabbar
      aria-label="Main"
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 50, pointerEvents: 'none',
        // Full width on a phone; held to 480 and centred on a wide screen.
        maxWidth: TABBAR_MAX, marginLeft: 'auto', marginRight: 'auto',
        paddingLeft: l.isCover ? 10 : 14, paddingRight: l.isCover ? 10 : 14,
        paddingBottom: 'max(10px, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        role="tablist"
        style={{
          ...GLASS,
          background: RC.scheme === 'dark' ? 'rgba(26,20,36,0.88)' : GLASS.background,
          border: `1px solid ${RC.line}`,
          borderRadius: 28, pointerEvents: 'auto', overflow: 'hidden',
          position: 'relative', paddingTop: 6, paddingBottom: 6,
          display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
        }}
      >
        {/* One soft orange capsule that slides between tabs. */}
        {activeIndex >= 0 && (
          <div
            aria-hidden
            style={{
              position: 'absolute', top: 6, bottom: 6, left: 0, width: `${100 / tabs.length}%`,
              display: 'flex', alignItems: 'stretch', justifyContent: 'center', pointerEvents: 'none',
              transform: `translateX(${activeIndex * 100}%)`,
              transition: 'transform 0.4s cubic-bezier(0.34, 1.4, 0.64, 1)',
            }}
          >
            <div style={{ width: '86%', borderRadius: 22, background: 'rgba(255,87,36,0.12)' }} />
          </div>
        )}
        {tabs.map((t) => {
          const on = active === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-label={t.label}
              aria-selected={on}
              aria-current={on ? 'page' : undefined}
              className="press"
              onClick={() => onChange(t.id)}
              style={{
                border: 'none', background: 'none', padding: '4px 2px', cursor: 'pointer', position: 'relative',
                minHeight: 52, minWidth: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                color: on ? RC.orangeInk : RC.inkMute,
                fontFamily: 'var(--font)', fontSize: 13, lineHeight: 1.2, fontWeight: on ? 700 : 500,
                transition: 'color .25s ease',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: on ? 'scale(1.06)' : 'scale(1)',
                  transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                {t.icon(on ? RC.inkStrong : RC.inkMute, on)}
              </span>
              <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
