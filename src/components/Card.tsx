// Card.tsx — card surface with subtle warm shadow.
import type { CSSProperties, ReactNode } from 'react';
import { RC, SHADOW_CARD } from '../theme';

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
        background: RC.paper, borderRadius: 20,
        boxShadow: SHADOW_CARD,
        border: `1px solid ${RC.line}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
