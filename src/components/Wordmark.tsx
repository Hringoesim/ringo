// Wordmark.tsx — Ringo wordmark, Poppins SemiBold with the gradient as fill.
import { RC } from '../theme';

interface RingoWordmarkProps {
  size?: number;
  gradient?: boolean;
  color?: string;
  dot?: boolean;
}

export function RingoWordmark({
  size = 28,
  gradient = true,
  color = RC.inkStrong,
  dot = true,
}: RingoWordmarkProps) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline' }}>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800, fontSize: size, letterSpacing: -0.5,
          lineHeight: 1, display: 'inline-flex', alignItems: 'baseline',
          background: gradient ? RC.grad : 'none',
          WebkitBackgroundClip: gradient ? 'text' : 'unset',
          WebkitTextFillColor: gradient ? 'transparent' : color,
          color: gradient ? 'transparent' : color,
        }}
      >
        Ringo
      </span>
      {dot && (
        <span
          style={{
            display: 'inline-block', width: size * 0.18, height: size * 0.18, borderRadius: '50%',
            background: gradient ? RC.grad : color,
            marginLeft: size * 0.07, transform: `translateY(-${size * 0.04}px)`,
          }}
        />
      )}
    </span>
  );
}
