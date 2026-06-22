// Device.tsx — Ringo iPhone frame (warm-toned, no black/grey UI).
// Hardware (dynamic island) stays black; all UI text/icons are warm.
import type { ReactNode } from 'react';
import { RC } from '../theme';

// Warm status bar — never black
export function RingoStatusBar({ time = '9:41' }: { time?: string }) {
  const c = RC.ink;
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 32px 8px', boxSizing: 'border-box',
        position: 'relative', zIndex: 20, width: '100%',
        fontFamily: 'Poppins, system-ui',
      }}
    >
      <span style={{ fontWeight: 600, fontSize: 16, color: c, letterSpacing: 0.2 }}>{time}</span>
      <div style={{ width: 120 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* signal */}
        <svg width="17" height="11" viewBox="0 0 17 11" aria-hidden="true">
          <rect x="0" y="7" width="3" height="4" rx="0.6" fill={c} />
          <rect x="4.5" y="5" width="3" height="6" rx="0.6" fill={c} />
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.6" fill={c} />
          <rect x="13.5" y="0" width="3" height="11" rx="0.6" fill={c} />
        </svg>
        {/* wifi */}
        <svg width="15" height="11" viewBox="0 0 17 12" aria-hidden="true">
          <path d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z" fill={c} />
          <path d="M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z" fill={c} />
          <circle cx="8.5" cy="10.5" r="1.4" fill={c} />
        </svg>
        {/* battery */}
        <svg width="26" height="12" viewBox="0 0 26 12" aria-hidden="true">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke={c} strokeOpacity="0.45" fill="none" />
          <rect x="2" y="2" width="19" height="8" rx="1.8" fill={c} />
          <path d="M24 4v4c0.7-0.3 1.3-1.1 1.3-2S24.7 4.3 24 4z" fill={c} fillOpacity="0.5" />
        </svg>
      </div>
    </div>
  );
}

interface RingoDeviceProps {
  children: ReactNode;
  width?: number;
  height?: number;
  bg?: string;
  statusTime?: string;
}

// Device frame — accepts children spanning full bleed (status bar floats over).
export function RingoDevice({
  children,
  width = 390,
  height = 844,
  bg = RC.bg,
  statusTime = '9:41',
}: RingoDeviceProps) {
  const dark = RC.scheme === 'dark';
  const caseColor = dark ? '#100B18' : '#FFF7EE';
  const ringColor = dark ? 'rgba(255,255,255,0.10)' : 'rgba(208,80,0,0.18)';
  const frameShadow = dark
    ? `0 60px 120px -30px rgba(0,0,0,0.65), 0 30px 60px -20px rgba(0,0,0,0.5), 0 0 0 1.5px ${ringColor}, 0 0 0 12px ${caseColor}`
    : `0 60px 120px -30px rgba(208,80,0,0.30), 0 30px 60px -20px rgba(208,80,0,0.18), 0 0 0 1.5px ${ringColor}, 0 0 0 12px ${caseColor}`;
  return (
    <div
      style={{
        width, height, borderRadius: 54, position: 'relative', overflow: 'hidden',
        background: bg,
        boxShadow: frameShadow,
        fontFamily: 'Poppins, system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <div
        style={{
          position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
          width: 120, height: 34, borderRadius: 20, background: '#1a0a02', zIndex: 50,
        }}
      />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, pointerEvents: 'none' }}>
        <RingoStatusBar time={statusTime} />
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 60,
          height: 30, display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
          paddingBottom: 8, pointerEvents: 'none',
        }}
      >
        <div style={{ width: 130, height: 5, borderRadius: 100, background: 'rgba(92,42,14,0.35)' }} />
      </div>
    </div>
  );
}
