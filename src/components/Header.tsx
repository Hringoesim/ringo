// Header.tsx — top header bar used on most screens.
import type { ReactNode } from 'react';
import { RC } from '../theme';

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
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}
    >
      <div style={{ minWidth: 36 }}>{leading}</div>
      <div
        style={{
          flex: 1, textAlign: 'center', fontFamily: 'var(--font)',
          fontWeight: 600, fontSize: 16, color: RC.ink, letterSpacing: -0.2,
        }}
      >
        {title}
      </div>
      <div style={{ minWidth: 36, display: 'flex', justifyContent: 'flex-end' }}>{trailing}</div>
    </div>
  );
}
