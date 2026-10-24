// Card.tsx: the one card surface, matched to ringoesim.com: white, radius 24,
// 1.5px hairline, soft shadow. Pads 16 by default so text never touches the
// edge; list cards whose rows carry their own padding pass 0. A tappable card
// (onClick) is a real button for VoiceOver and the keyboard, and its border
// turns orange while pressed.
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { cardSurface } from '../theme';

interface RingoCardProps {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
  /** Inner padding. Defaults to 16; a `padding` in `style` still wins. */
  padding?: CSSProperties['padding'];
  /** Accessible name when the card is tappable. */
  ariaLabel?: string;
  /** Clip children (a card that carries a photo). */
  clip?: boolean;
}

export function RingoCard({ children, style = {}, onClick, padding = 16, ariaLabel, clip = false }: RingoCardProps) {
  const tappable = !!onClick;
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };
  return (
    <div
      onClick={onClick}
      onKeyDown={tappable ? onKey : undefined}
      role={tappable ? 'button' : undefined}
      tabIndex={tappable ? 0 : undefined}
      aria-label={ariaLabel}
      className={tappable ? 'card-press' : undefined}
      style={{ ...cardSurface(), padding, overflow: clip ? 'hidden' : undefined, cursor: tappable ? 'pointer' : undefined, ...style }}
    >
      {children}
    </div>
  );
}
