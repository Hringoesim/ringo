// Button.tsx — reusable warm primary button (gradient) and variants.
import type { CSSProperties, ReactNode } from 'react';
import { RC } from '../theme';
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
    fontFamily: 'Poppins', fontWeight: 600,
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
      boxShadow: '0 14px 28px -8px rgba(230,36,154,0.52), 0 5px 12px -4px rgba(255,94,30,0.45)',
    });
  if (variant === 'soft') Object.assign(base, { background: RC.cream, color: RC.inkStrong });
  if (variant === 'ghost')
    Object.assign(base, {
      background: 'transparent', color: RC.inkStrong, border: `1.5px solid ${RC.lineStrong}`,
    });

  return (
    <button
      className="press"
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
