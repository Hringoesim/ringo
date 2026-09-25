// TabBar.tsx — floating Liquid Glass (iOS 26) tab bar for the top-level
// destinations. A translucent, blurred capsule that hovers over the content.
import type { ReactNode } from 'react';
import { RC, GLASS, COLUMN_MAX } from '../theme';

export type TabId = 'store' | 'esim' | 'help';
type IconKind = 'globe' | 'sim' | 'help';

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
          <svg width="21" height="21" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" fill={color} />
            <path d="M3 12h18M12 3c2.5 2.6 4 5.6 4 9s-1.5 6.4-4 9c-2.5-2.6-4-5.6-4-9s1.5-6.4 4-9z" stroke={k} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="21" height="21" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" {...s} />
            <path d="M3 12h18M12 3c2.5 2.6 4 5.6 4 9s-1.5 6.4-4 9c-2.5-2.6-4-5.6-4-9s1.5-6.4 4-9z" {...s} />
          </svg>
        );
      case 'sim':
        return active ? (
          <svg width="21" height="21" viewBox="0 0 24 24">
            <path d="M7 2.6h6.2L18 7.4v11.4a2.6 2.6 0 0 1-2.6 2.6H7a2.6 2.6 0 0 1-2.6-2.6V5.2A2.6 2.6 0 0 1 7 2.6z" fill={color} />
            <rect x="8" y="11" width="8" height="6" rx="1.4" fill={k} />
          </svg>
        ) : (
          <svg width="21" height="21" viewBox="0 0 24 24">
            <path d="M7 2.6h6.2L18 7.4v11.4a2.6 2.6 0 0 1-2.6 2.6H7a2.6 2.6 0 0 1-2.6-2.6V5.2A2.6 2.6 0 0 1 7 2.6z" {...s} />
            <rect x="8" y="11" width="8" height="6" rx="1.4" {...s} />
          </svg>
        );
      case 'help':
        return active ? (
          <svg width="21" height="21" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" fill={color} />
            <path d="M9.4 9.6a2.7 2.7 0 0 1 5.3.6c0 1.6-2.2 2-2.2 3.4" stroke={k} strokeWidth="1.9" fill="none" strokeLinecap="round" />
            <circle cx="12.5" cy="16.6" r="1" fill={k} />
          </svg>
        ) : (
          <svg width="21" height="21" viewBox="0 0 24 24">
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
  { id: 'help', label: 'Help', icon: tabIcon('help') },
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
    // Floats over the content; the margins let taps pass through to what's behind.
    <div
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 50, pointerEvents: 'none',
        // Same centred column as the screens on an iPad; full width on a phone.
        maxWidth: COLUMN_MAX, marginLeft: 'auto', marginRight: 'auto',
        paddingLeft: 14, paddingRight: 14,
        paddingBottom: 'max(10px, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        style={{
          ...GLASS, borderRadius: 30, pointerEvents: 'auto', overflow: 'hidden',
          position: 'relative', paddingTop: 9, paddingBottom: 9,
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        }}
      >
        {/* One gradient pill that MORPHS between tabs (slides), not a per-icon fade. */}
        {activeIndex >= 0 && (
          <div
            style={{
              position: 'absolute', top: 7, left: 0, width: '33.333%', height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
              transform: `translateX(${activeIndex * 100}%)`,
              transition: 'transform 0.4s cubic-bezier(0.34, 1.4, 0.64, 1)',
            }}
          >
            <div style={{ width: '74%', height: 34, borderRadius: 15, background: RC.gradSoft }} />
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
                {t.icon(on ? RC.inkStrong : RC.inkMute, on)}
              </span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
