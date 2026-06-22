// OtpScreen — 6-digit OTP with auto-focus advance.
import { useRef, useState } from 'react';
import { RC } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn } from '../components/ui';

interface OtpScreenProps {
  phone: string;
  onBack: () => void;
  onContinue: () => void;
}

export function OtpScreen({ phone, onBack, onContinue }: OtpScreenProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const set = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...code];
    next[i] = v;
    setCode(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
    if (!v && i > 0) refs.current[i - 1]?.focus();
  };
  const full = code.join('');
  const ok = full.length === 6;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="" leading={<BackBtn onClick={onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '0 24px 16px' }}>
        <div
          style={{
            width: 64, height: 64, borderRadius: 20, background: RC.gradSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <rect x="6" y="3" width="12" height="18" rx="3" stroke={RC.inkStrong} strokeWidth="2" />
            <path d="M10 7h4" stroke={RC.inkStrong} strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="17" r="1" fill={RC.inkStrong} />
          </svg>
        </div>
        <div style={{ fontFamily: 'Poppins', fontSize: 30, fontWeight: 600, color: RC.ink, letterSpacing: -0.6, lineHeight: 1.1 }}>
          Enter the 6-digit code.
        </div>
        <div style={{ marginTop: 8, fontFamily: 'Poppins', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
          We just texted it to <strong style={{ color: RC.ink, fontWeight: 600 }}>{phone}</strong>. Code expires in 10 minutes.
        </div>

        <div style={{ marginTop: 30, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
          {code.map((c, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={c}
              onChange={(e) => set(i, e.target.value.slice(-1))}
              inputMode="numeric"
              maxLength={1}
              style={{
                height: 60, textAlign: 'center',
                fontFamily: 'Poppins', fontSize: 24, fontWeight: 600, color: RC.ink,
                background: RC.paper, border: `1.5px solid ${c ? RC.inkStrong : RC.line}`,
                borderRadius: 14, outline: 'none', letterSpacing: -0.4,
              }}
            />
          ))}
        </div>

        <div style={{ marginTop: 18, fontFamily: 'Poppins', fontSize: 13, color: RC.inkMute, textAlign: 'center' }}>
          Didn’t get it?{' '}
          <span style={{ color: RC.inkStrong, fontWeight: 600, cursor: 'pointer' }}>Resend</span> ·{' '}
          <span style={{ color: RC.inkStrong, fontWeight: 600, cursor: 'pointer' }}>Call instead</span>
        </div>
      </div>

      <div
        style={{
          padding: '14px 24px 24px', borderTop: `1px solid ${RC.line}`,
          background: 'rgba(255,246,239,0.92)', backdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        <RingoButton disabled={!ok} onClick={onContinue}>Verify and continue</RingoButton>
      </div>
    </div>
  );
}
