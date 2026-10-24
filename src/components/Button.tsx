// Button.tsx: the site's buttons (BtnSolid / BtnOutline / BtnPremium).
// Primary: 54 tall, radius 14, 17/700 white on the deeper sunset gradient
// (white holds 4.5:1 at every stop). No arrows or chevrons in labels.
import type { CSSProperties, ReactNode } from 'react';
import { RC, RADIUS, SHADOW_BUTTON, SHADOW_PREMIUM, GRAD_PREMIUM, BUTTON_MAX } from '../theme';
import { haptic } from '../lib/haptics';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'premium' | 'onDark';

interface RingoButtonProps {
  children: ReactNode;
  onClick?: () => void;
  /** Full width (default). On a wide screen pass `capped` to hold it at 420. */
  full?: boolean;
  /**
   * primary: gradient CTA. secondary / ghost: outline (1.5px line, ink2 label).
   * soft: cream fill, orange text. premium: plum gradient (Pioneer / Global).
   * onDark: white fill, ink label, for use on the dark plan-card skins.
   */
  variant?: ButtonVariant;
  /** lg = 54pt (default), sm = 44pt. */
  size?: 'lg' | 'sm';
  icon?: ReactNode;
  disabled?: boolean;
  /** Shows a spinner + blocks taps while an action is in flight. */
  loading?: boolean;
  /** Fully rounded ends (the floating footer on the plans screen). */
  round?: boolean;
  /** Caps the width at 420 and centres it (wide screens). */
  capped?: boolean;
  type?: 'button' | 'submit';
  ariaLabel?: string;
  style?: CSSProperties;
}

export function RingoButton({
  children,
  onClick,
  full = true,
  variant = 'primary',
  size = 'lg',
  icon = null,
  disabled = false,
  loading = false,
  round = false,
  capped = false,
  type = 'button',
  ariaLabel,
  style,
}: RingoButtonProps) {
  const off = disabled || loading;
  const lg = size === 'lg';
  const base: CSSProperties = {
    border: 'none', cursor: off ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font)', fontWeight: 700,
    fontSize: lg ? 17 : 15, letterSpacing: '-0.01em', lineHeight: 1.1,
    minHeight: lg ? 54 : 44,
    padding: lg ? '0 24px' : '0 18px',
    borderRadius: round ? RADIUS.pill : RADIUS.control,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    textAlign: 'center',
    width: full ? '100%' : 'auto',
    maxWidth: capped ? BUTTON_MAX : undefined,
    marginLeft: capped ? 'auto' : undefined,
    marginRight: capped ? 'auto' : undefined,
    boxSizing: 'border-box',
    opacity: disabled ? 0.5 : 1, // loading stays full-strength (it's active, just busy)
  };
  if (variant === 'primary') Object.assign(base, { background: RC.gradCta, color: '#FFFFFF', boxShadow: SHADOW_BUTTON });
  if (variant === 'soft') Object.assign(base, { background: RC.cream, color: RC.orangeInk, fontWeight: 700 });
  if (variant === 'ghost' || variant === 'secondary')
    Object.assign(base, { background: 'transparent', color: RC.ink2, fontWeight: 600, border: `1.5px solid ${RC.lineStrong}` });
  if (variant === 'premium') Object.assign(base, { background: GRAD_PREMIUM, color: '#FFFFFF', boxShadow: SHADOW_PREMIUM });
  if (variant === 'onDark') Object.assign(base, { background: '#FFFFFF', color: '#1A0F2E' });

  return (
    <button
      type={type}
      className={off ? undefined : 'press'}
      onClick={
        off
          ? undefined
          : () => {
              haptic('medium');
              onClick?.();
            }
      }
      style={{ ...base, ...style }}
      disabled={off}
      aria-busy={loading}
      aria-label={ariaLabel}
    >
      {loading ? (
        <span
          aria-hidden
          style={{
            width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
            border: '2px solid currentColor', borderTopColor: 'transparent',
            display: 'inline-block', animation: 'ringoSpin 0.7s linear infinite',
          }}
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
