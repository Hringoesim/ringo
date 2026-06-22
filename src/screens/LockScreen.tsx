// LockScreen — Face ID / Touch ID unlock for returning users.
import { useCallback, useEffect, useState } from 'react';
import { RC, hexA } from '../theme';
import { tierFor, USER } from '../data/tiers';
import { LOGO_SRC } from '../assets';

type Phase = 'idle' | 'scanning' | 'success';

function FaceIdGlyph({ color, scanning }: { color: string; scanning: boolean }) {
  return (
    <div style={{ position: 'relative', width: 62, height: 62 }}>
      <svg width="62" height="62" viewBox="0 0 62 62" fill="none">
        {/* corners */}
        <path d="M4 18V10a6 6 0 016-6h8" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <path d="M44 4h8a6 6 0 016 6v8" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <path d="M58 44v8a6 6 0 01-6 6h-8" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <path d="M18 58h-8a6 6 0 01-6-6v-8" stroke={color} strokeWidth="3" strokeLinecap="round" />
        {/* eyes */}
        <path d="M22 24v5M40 24v5" stroke={color} strokeWidth="3" strokeLinecap="round" />
        {/* nose */}
        <path d="M31 28v7l-3 2" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {/* smile */}
        <path d="M23 42c2.4 2.6 5 3.8 8 3.8s5.6-1.2 8-3.8" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
      {scanning && (
        <div
          style={{
            position: 'absolute', left: 4, right: 4, top: '50%', height: 2, borderRadius: 2,
            background: color, boxShadow: `0 0 8px ${color}`,
            animation: 'ringoFaceScan 1.1s ease-in-out infinite',
          }}
        />
      )}
    </div>
  );
}

export function LockScreen({
  userName = 'there',
  onUnlock,
  onSwitchAccount,
}: {
  userName?: string;
  onUnlock: () => void;
  onSwitchAccount: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const tier = tierFor(USER.score || 0);
  const c1 = tier ? tier.c1 : '#F08038';
  const c2 = tier ? tier.c2 : '#ED4D8E';

  const authenticate = useCallback(() => {
    if (phase !== 'idle') return;
    setPhase('scanning');
    setTimeout(() => setPhase('success'), 1300);
    setTimeout(() => onUnlock(), 2050);
  }, [phase, onUnlock]);

  // Auto-prompt on mount, like iOS apps do
  useEffect(() => {
    const t = setTimeout(authenticate, 600);
    return () => clearTimeout(t);
  }, [authenticate]);

  return (
    <div
      style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: `radial-gradient(680px 520px at 50% 26%, ${hexA(c2, 0.16)}, transparent 68%), ${RC.bg}`,
      }}
    >
      {/* Brand */}
      <div style={{ marginTop: 96, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <img
          src={LOGO_SRC}
          alt="Ringo"
          style={{ height: 48, width: 'auto', filter: `drop-shadow(0 14px 26px ${hexA(c2, 0.28)})` }}
        />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Poppins', fontSize: 13, fontWeight: 500, color: RC.inkMute, letterSpacing: 0.3 }}>
            Welcome back
          </div>
          <div style={{ fontFamily: 'Poppins', fontSize: 26, fontWeight: 600, color: RC.ink, letterSpacing: -0.5, lineHeight: 1.1, marginTop: 2 }}>
            {userName}
          </div>
        </div>
      </div>

      {/* Face ID glyph */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <button
          onClick={authenticate}
          aria-label="Unlock with Face ID"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, position: 'relative', width: 128, height: 128 }}
        >
          {/* scanning halo */}
          <div
            style={{
              position: 'absolute', inset: -8, borderRadius: 32,
              border: `2px solid ${c2}`,
              opacity: phase === 'scanning' ? 0.6 : 0,
              animation: phase === 'scanning' ? 'ringoScan 1.1s ease-in-out infinite' : 'none',
            }}
          />
          <div
            style={{
              width: 128, height: 128, borderRadius: 32,
              background: phase === 'success' ? `linear-gradient(135deg, ${c1}, ${c2})` : RC.paper,
              border: phase === 'success' ? 'none' : `1px solid ${RC.line}`,
              boxShadow: phase === 'success'
                ? `0 24px 48px -20px ${hexA(c2, 0.55)}`
                : '0 12px 30px -18px rgba(208,80,0,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .4s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            {phase === 'success' ? (
              <svg width="58" height="58" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#FFFDFB" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <FaceIdGlyph color={c2} scanning={phase === 'scanning'} />
            )}
          </div>
        </button>
        <div style={{ fontFamily: 'Poppins', fontSize: 14, fontWeight: 500, color: RC.inkMute, height: 20 }}>
          {phase === 'idle' && 'Tap to unlock with Face ID'}
          {phase === 'scanning' && 'Looking for you…'}
          {phase === 'success' && 'Unlocked'}
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ width: '100%', padding: '0 24px 38px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          onClick={authenticate}
          style={{
            height: 50, border: `1.5px solid ${RC.lineStrong}`, background: 'transparent',
            borderRadius: 999, cursor: 'pointer',
            fontFamily: 'Poppins', fontSize: 14, fontWeight: 600, color: RC.inkStrong,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="5" y="11" width="14" height="9" rx="2.5" stroke={RC.inkStrong} strokeWidth="2" />
            <path d="M8 11V8a4 4 0 018 0v3" stroke={RC.inkStrong} strokeWidth="2" strokeLinecap="round" />
          </svg>
          Use passcode
        </button>
        <button
          onClick={onSwitchAccount}
          style={{
            height: 44, border: 'none', background: 'transparent', cursor: 'pointer',
            fontFamily: 'Poppins', fontSize: 13, fontWeight: 500, color: RC.inkMute,
          }}
        >
          Not {userName}? Sign in to another account
        </button>
      </div>

      <style>{`
        @keyframes ringoScan {
          0%,100% { transform:scale(1);   opacity:0.25; }
          50%     { transform:scale(1.06); opacity:0.7; }
        }
        @keyframes ringoFaceScan {
          0%   { transform:translateY(-38px); opacity:0; }
          15%  { opacity:1; }
          85%  { opacity:1; }
          100% { transform:translateY(38px); opacity:0; }
        }
      `}</style>
    </div>
  );
}
