// Header.tsx: the top bar used on pushed screens (44pt row, safe-area top,
// centred 17/700 title). Tab root screens use <ScreenTitle> from ui.tsx (the
// large title) instead of a centred title.
import type { ReactNode } from 'react';
import { RC, TAP } from '../theme';
import { useLayout } from '../lib/layout';

interface RingoHeaderProps {
  title?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export function RingoHeader({ title, leading, trailing }: RingoHeaderProps) {
  const l = useLayout();
  return (
    <div
      style={{
        // Adapts to any device's notch/Dynamic Island; never less than the base.
        padding: `max(54px, calc(env(safe-area-inset-top, 0px) + 12px)) ${l.gutter}px 12px`,
        // A fixed 44pt row with equal side columns: the title sits on the same
        // line, dead centre, on every screen, whether or not a slot is filled.
        display: 'grid', gridTemplateColumns: `minmax(${TAP}px, 1fr) minmax(0, auto) minmax(${TAP}px, 1fr)`,
        alignItems: 'center', gap: 12, minHeight: TAP,
      }}
    >
      <div style={{ height: TAP, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>{leading}</div>
      <h1
        style={{
          margin: 0, textAlign: 'center', fontFamily: 'var(--font)',
          fontWeight: 700, fontSize: 17, lineHeight: 1.25, color: RC.ink, letterSpacing: '-0.02em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
        }}
      >
        {title}
      </h1>
      <div style={{ height: TAP, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{trailing}</div>
    </div>
  );
}
