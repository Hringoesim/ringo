// Card.tsx: the one card surface. RADIUS.card, 1px RC.line border,
// SHADOW_CARD (see cardSurface in theme.ts). Pads 16 by default so text never
// touches the edge; list cards whose rows carry their own padding pass 0.
import type { CSSProperties, ReactNode } from 'react';
import { cardSurface } from '../theme';

interface RingoCardProps {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
  /** Inner padding. Defaults to 16; a `padding` in `style` still wins. */
  padding?: CSSProperties['padding'];
}

export function RingoCard({ children, style = {}, onClick, padding = 16 }: RingoCardProps) {
  return (
    <div onClick={onClick} style={{ ...cardSurface(), padding, ...style }}>
      {children}
    </div>
  );
}
