// Button.tsx — reusable warm primary button (gradient) and variants.
import type { CSSProperties, ReactNode } from 'react';
import { RC, SHADOW_BUTTON } from '../theme';
import { haptic } from '../lib/haptics';

interface RingoButtonProps {
  children: ReactNode;
  onClick?: () => void;
  full?: boolean;
  variant?: 'primary' | 'soft' | 'ghost';
  size?: 'lg' | 'sm';
  icon?: ReactNode;
  disabled?: boolean;
}

export function RingoButton({
  children,
  onClick,
  full = true,
  variant = 'primary',
  size = 'lg',
  icon = null,
  disabled = false,
}: RingoButtonProps) {
  const base: CSSProperties = {
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font)', fontWeight: 600,
    fontSize: size === 'lg' ? 16 : 14, letterSpacing: -0.1,
    height: size === 'lg' ? 56 : 44,
    padding: '0 22px',
    borderRadius: 999,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: full ? '100%' : 'auto',
    opacity: disabled ? 0.5 : 1,
  };
  if (variant === 'primary')
    Object.assign(base, {
      background: RC.grad, color: '#FFFFFF',
      boxShadow: SHADOW_BUTTON,
    });
  if (variant === 'soft') Object.assign(base, { background: RC.cream, color: RC.inkStrong });
  if (variant === 'ghost')
    Object.assign(base, {
      background: 'transparent', color: RC.inkStrong, border: `1.5px solid ${RC.lineStrong}`,
    });

  return (
    <button
      className={disabled ? undefined : 'press'}
      onClick={
        disabled
          ? undefined
          : () => {
              haptic('medium');
              onClick?.();
            }
      }
      style={base}
      disabled={disabled}
    >
      {icon}
      {children}
    </button>
  );
}
