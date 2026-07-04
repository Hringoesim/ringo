// Wordmark.tsx — the Ringo wordmark rendered as live display text (Syne), plus
// the ownable orbit "Ring-o" mark. Restraint is the trust signal: the wordmark
// is SOLID espresso ink almost everywhere; the sunset gradient is reserved for
// the landing hero lockup (variant="hero") and the ring mark / app icon.
import { RC } from '../theme';

interface RingoWordmarkProps {
  size?: number;
  /** 'solid' (default) fills with `color`; 'hero' fills the word with RC.grad. */
  variant?: 'solid' | 'hero';
  color?: string;
}

export function RingoWordmark({ size = 28, variant = 'solid', color = RC.ink }: RingoWordmarkProps) {
  const hero = variant === 'hero';
  return (
    <span
      style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: size,
        letterSpacing: -0.5,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'baseline',
        background: hero ? RC.grad : 'none',
        WebkitBackgroundClip: hero ? 'text' : 'unset',
        WebkitTextFillColor: hero ? 'transparent' : color,
        color: hero ? 'transparent' : color,
      }}
    >
      Ringo
    </span>
  );
}

// RingMark — an incomplete orbit ring (a circle with a ~40° gap in the upper
// right), echoing the SaturnWorld globe and literally reading as the "o" in
// Ring-o. Single sunset-gradient stroke. Ownable, scales cleanly to an app icon.
export function RingMark({ size = 22, stroke = 2 }: { size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ringoGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF8A3D" />
          <stop offset="0.48" stopColor="#F0566B" />
          <stop offset="1" stopColor="#C74B8E" />
        </linearGradient>
      </defs>
      {/* r=9 → circumference ≈ 56.5; dash 50.2 + gap 6.3 leaves a ~40° opening,
          rotated so the gap sits in the upper-right. */}
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="url(#ringoGrad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray="50.2 6.3"
        transform="rotate(-52 12 12)"
      />
    </svg>
  );
}
