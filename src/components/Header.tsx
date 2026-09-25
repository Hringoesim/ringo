// Header.tsx — top header bar used on most screens.
import type { ReactNode } from 'react';
import { RC, TAP } from '../theme';

interface RingoHeaderProps {
  title?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export function RingoHeader({ title, leading, trailing }: RingoHeaderProps) {
  return (
    <div
      style={{
        // Adapts to any device's notch/Dynamic Island; never less than the base.
        padding: 'max(54px, calc(env(safe-area-inset-top, 0px) + 12px)) 20px 14px',
        // A fixed 44pt row with equal side columns: the title sits on the same
        // line, dead centre, on every screen, whether or not a slot is filled.
        display: 'grid', gridTemplateColumns: `minmax(${TAP}px, 1fr) auto minmax(${TAP}px, 1fr)`,
        alignItems: 'center', gap: 12, minHeight: TAP,
      }}
    >
      <div style={{ height: TAP, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>{leading}</div>
      <div
        style={{
          textAlign: 'center', fontFamily: 'var(--font)',
          fontWeight: 600, fontSize: 16, color: RC.ink, letterSpacing: -0.2,
        }}
      >
        {title}
      </div>
      <div style={{ height: TAP, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{trailing}</div>
    </div>
  );
}
