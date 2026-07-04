// Wordmark.tsx — the approved Ringo logo, exactly as on ringoesim.com: the word
// "Ringo" in Syne 800, -1px tracking. White (with a soft shadow) on dark/sunset
// surfaces; the brand gradient on light surfaces.
import { RC } from '../theme';

export function RingoWordmark({ size = 26, light = false }: { size?: number; light?: boolean }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: size,
        letterSpacing: -1,
        lineHeight: 1,
        display: 'inline-block',
        ...(light
          ? { color: '#FFFFFF', textShadow: '0 2px 20px rgba(0,0,0,0.20)' }
          : {
              background: RC.grad,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
            }),
      }}
    >
      Ringo
    </span>
  );
}
