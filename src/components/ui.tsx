// ui.tsx — small shared building blocks used across screens.
import { useState, type CSSProperties, type ReactNode } from 'react';
import { RC, RADIUS, hexA } from '../theme';

export function BackBtn({ onClick }: { onClick?: () => void }) {
  return (
    <button
      className="press"
      onClick={onClick}
      aria-label="Back"
      style={{
        width: 40, height: 40, borderRadius: '50%',
        background: RC.cream, border: `1.5px solid ${RC.lineStrong}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', boxShadow: '0 4px 12px -6px rgba(34,26,20,0.16)',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 2L4 8l6 6" stroke={RC.inkStrong} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font)', fontSize: 11, fontWeight: 600, color: RC.inkMute,
        letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

interface InputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: 'text' | 'tel' | 'numeric' | 'email' | 'none' | 'search' | 'url' | 'decimal';
}

export function Input({ value, onChange, placeholder, type = 'text', inputMode }: InputProps) {
  const [focused, setFocused] = useState(false);
  const active = focused || !!value;
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      type={type}
      inputMode={inputMode}
      style={{
        width: '100%', height: 54, padding: '0 16px', boxSizing: 'border-box',
        borderRadius: RADIUS.md, background: RC.paper,
        border: `1.5px solid ${active ? RC.inkStrong : RC.line}`,
        // Soft ember focus ring — clear interactive feedback, smoothly eased.
        boxShadow: focused ? `0 0 0 3px ${hexA(RC.inkStrong, 0.12)}` : 'none',
        outline: 'none', fontFamily: 'var(--font)', fontSize: 16, fontWeight: 500,
        color: RC.ink, letterSpacing: -0.1,
        transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
      }}
    />
  );
}

export function SectionTitle({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        padding: '8px 0 10px', fontFamily: 'var(--font)', fontSize: 11, fontWeight: 600,
        color: RC.inkMute, letterSpacing: 0.6, textTransform: 'uppercase', ...style,
      }}
    >
      {children}
    </div>
  );
}

type RowIconKind = 'speed' | 'call' | 'hotspot' | 'sos';

function rowIcon(k: RowIconKind) {
  switch (k) {
    case 'speed':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M3 12a9 9 0 0118 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 12l5-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'call':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M5 4h4l2 5-3 2a12 12 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case 'hotspot':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <path d="M8 16a5 5 0 010-8M16 8a5 5 0 010 8M5 19a9 9 0 010-14M19 5a9 9 0 010 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'sos':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path d="M9 10c.5-1 1.5-1.5 3-1.5 1.5 0 2.3.7 2.3 1.7 0 1-.7 1.5-2 1.8-1 .2-1.5.5-1.5 1.2v.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="16" r="0.9" fill="currentColor" />
        </svg>
      );
  }
}

export function Row({
  icon,
  title,
  sub,
  last,
  onClick,
  trailing,
  active,
}: {
  icon: RowIconKind;
  title: string;
  sub: string;
  last?: boolean;
  onClick?: () => void;
  trailing?: ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={onClick ? 'press' : undefined}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
        borderBottom: last ? 'none' : `1px solid ${RC.line}`,
        cursor: onClick ? 'pointer' : 'default',
        background: active ? RC.cream : 'transparent',
      }}
    >
      <div
        style={{
          width: 36, height: 36, borderRadius: 12,
          background: active ? RC.grad : RC.cream,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: active ? '#FFFDFB' : RC.inkStrong,
        }}
      >
        {rowIcon(icon)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: RC.ink }}>{title}</div>
        <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute }}>{sub}</div>
      </div>
      {trailing}
    </div>
  );
}

export function Step({
  num,
  title,
  sub,
  last,
}: {
  num: string;
  title: string;
  sub: string;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px',
        borderBottom: last ? 'none' : `1px solid ${RC.line}`,
      }}
    >
      <div
        style={{
          width: 30, height: 30, borderRadius: '50%', background: RC.grad,
          color: '#FFFDFB', fontFamily: 'var(--font)', fontWeight: 700, fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        {num}
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: RC.ink }}>{title}</div>
        <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute }}>{sub}</div>
      </div>
    </div>
  );
}
