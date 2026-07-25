// OtpScreen — ONE 6-digit code box (user call: a single field, not six), with
// real verification (code match + expiry + resend) and the sign-in stepper.
import { useRef, useState } from 'react';
import { RC } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn } from '../components/ui';

interface VerifyOutcome {
  ok: boolean;
  error?: string;
}

interface OtpScreenProps {
  phone: string;
  /** Demo code surfaced because there's no SMS gateway yet (mock mode only). */
  devCode?: string;
  onBack: () => void;
  onVerify: (code: string) => VerifyOutcome | Promise<VerifyOutcome>;
  onResend: () => ({ devCode: string } | null) | Promise<{ devCode: string } | null>;
}

/** The always-visible sign-in stepper: details → code → in. */
export function FlowSteps({ active }: { active: 1 | 2 }) {
  const steps = ['Your details', 'Email code', 'You’re in'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = n < active;
        const now = n === active;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: done || now ? RC.grad : RC.cream,
                  color: done || now ? '#FFFFFF' : RC.inkMute,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 700,
                }}
              >
                {done ? '✓' : n}
              </span>
              <span style={{ fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: now ? 700 : 500, color: now ? RC.ink : RC.inkMute, whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 1.5, background: done ? RC.inkStrong : RC.line, minWidth: 10 }} />}
          </div>
        );
      })}
    </div>
  );
}

export function OtpScreen({ phone, devCode, onBack, onVerify, onResend }: OtpScreenProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [hint, setHint] = useState(devCode || '');
  const [sent, setSent] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isEmail = phone.includes('@');

  const [busy, setBusy] = useState(false);
  const ok = code.length === 6;

  const submit = async (value?: string) => {
    const full = value ?? code;
    if (busy || full.length !== 6) return;
    setBusy(true);
    const res = await onVerify(full);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'That code didn’t match. Check the newest email.');
      setCode('');
      inputRef.current?.focus();
    }
  };

  const resend = async () => {
    const r = await onResend();
    setHint(r ? r.devCode : '');
    setError('');
    setCode('');
    setSent(true);
    setTimeout(() => setSent(false), 4000);
    inputRef.current?.focus();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="" leading={<BackBtn onClick={onBack} />} />
      <div
        className="no-bar"
        style={{ flex: 1, overflowY: 'auto', padding: '0 24px 220px' }}
        onFocus={(e) => {
          const t = e.target as HTMLElement;
          if (t.tagName === 'INPUT') setTimeout(() => t.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
        }}
      >
        <FlowSteps active={2} />
        <div
          style={{
            width: 64, height: 64, borderRadius: 20, background: RC.gradSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="14" rx="3" stroke={RC.inkStrong} strokeWidth="2" />
            <path d="M3.5 7l8.5 6 8.5-6" stroke={RC.inkStrong} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: RC.ink, letterSpacing: -0.8, lineHeight: 1.1 }}>
          Enter your code.
        </div>
        <div style={{ marginTop: 8, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
          We just {isEmail ? 'emailed' : 'texted'} a 6-digit code to{' '}
          <strong style={{ color: RC.ink, fontWeight: 600 }}>{phone}</strong>.{' '}
          {isEmail ? 'It can take a minute — check spam too.' : 'It expires in 10 minutes.'}
        </div>

        {hint && (
          <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 12, background: RC.cream, fontFamily: 'var(--font)', fontSize: 12.5, color: RC.ink }}>
            <strong style={{ color: RC.inkStrong, fontWeight: 600 }}>Demo</strong> · no delivery connected yet — your code is{' '}
            <strong style={{ color: RC.inkStrong, fontWeight: 700, letterSpacing: 1 }}>{hint}</strong>
          </div>
        )}

        {/* ONE box for the whole code — paste-friendly, auto-submits at 6. */}
        <input
          ref={inputRef}
          value={code}
          autoFocus
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 6);
            setCode(v);
            setError('');
            if (v.length === 6) void submit(v);
          }}
          onKeyDown={(e) => { if (e.key === 'Enter' && ok) void submit(); }}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="••••••"
          style={{
            marginTop: 22, width: '100%', height: 64, textAlign: 'center',
            fontFamily: 'var(--font)', fontSize: 28, fontWeight: 700, color: RC.ink,
            background: RC.paper,
            border: `1.5px solid ${error ? '#E5431A' : code ? RC.inkStrong : RC.line}`,
            borderRadius: 16, outline: 'none', letterSpacing: 10,
          }}
        />

        {error && (
          <div style={{ marginTop: 12, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 500, color: '#E5431A', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 16, fontFamily: 'var(--font)', fontSize: 13, color: RC.inkMute, textAlign: 'center' }}>
          {sent ? (
            <span style={{ color: '#1F7A4E', fontWeight: 600 }}>New code sent ✓</span>
          ) : (
            <>
              Didn’t get it?{' '}
              <span onClick={resend} style={{ color: RC.inkStrong, fontWeight: 600, cursor: 'pointer' }}>Resend code</span>
            </>
          )}
        </div>
      </div>

      <div
        style={{
          padding: '14px 24px 24px', borderTop: `1px solid ${RC.line}`,
          background: RC.glass,
        }}
      >
        <RingoButton disabled={!ok || busy} loading={busy} onClick={() => void submit()}>
          {busy ? 'Verifying…' : 'Verify and continue'}
        </RingoButton>
      </div>
    </div>
  );
}
