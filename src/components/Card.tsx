// Card.tsx — card surface with subtle warm shadow.
import type { CSSProperties, ReactNode } from 'react';
import { RC } from '../theme';

interface RingoCardProps {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
}

export function RingoCard({ children, style = {}, onClick }: RingoCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: RC.paper, borderRadius: 24,
        boxShadow: '0 1px 0 rgba(208,80,0,0.04), 0 8px 28px -16px rgba(208,80,0,0.18)',
        border: `1px solid ${RC.line}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
