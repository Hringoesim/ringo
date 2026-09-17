// LoginScreen — email, then the six-digit code we send to it. Proving the
// inbox is what opens the account: the plan on it, its data left, and the
// install details by email. No password. The account itself is the
// website's (the signup row and its token), the same one a purchase opens.
import { useEffect, useRef, useState } from 'react';
import { RC, RADIUS } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn, FieldLabel, Input } from '../components/ui';
import { light } from '../api/light';
import { account } from '../store/account';
import { hapticNotify, hapticSelection } from '../lib/haptics';
import { signInWithApple, signInWithGoogle, appleSignInAvailable, googleSignInAvailable } from '../lib/auth';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function LoginScreen({ onBack, onDone, initialEmail = '' }: { onBack: () => void; onDone: () => void; initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  // Apple and Google: the system sheet, then the same account. Apple is
  // offered wherever Google is (App Review guideline 4.8), and first.
  const social = async (which: 'apple' | 'google') => {
    setErr(null); setBusy(true);
    try {
      const r = await (which === 'apple' ? signInWithApple() : signInWithGoogle());
      if (r.ok) { hapticNotify('success'); onDone(); return; }
      if (!r.cancelled) { setErr(r.error); hapticNotify('error'); }
    } finally { setBusy(false); }
  };

  const send = async () => {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) { setErr('Enter the email you bought with.'); return; }
    setErr(null); setBusy(true);
    try {
      const r = await light.loginStart(e);
      setWait(r.retry_after || 60);
      setStage('code');
      setTimeout(() => codeRef.current?.focus(), 200);
    } catch (ex) {
      setErr((ex as Error).message || 'Could not send the code.');
      hapticNotify('error');
    } finally { setBusy(false); }
  };

  const verify = async () => {
    const c = code.replace(/\D/g, '');
    if (c.length !== 6) { setErr('The code is six digits.'); return; }
    setErr(null); setBusy(true);
    try {
      const r = await light.loginVerify(email.trim().toLowerCase(), c);
      account.set({ userId: r.user_id, t: r.t, email: r.email, purchaseRef: null });
      hapticNotify('success');
      onDone();
    } catch (ex) {
      setErr((ex as Error).message || 'That code did not match.');
      hapticNotify('error');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Log in" leading={<BackBtn onClick={stage === 'code' ? () => { hapticSelection(); setStage('email'); setCode(''); setErr(null); } : onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 40px' }}>
        {stage === 'email' ? (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: RC.ink, letterSpacing: -0.7, lineHeight: 1.15 }}>Log in to Ringo</div>
            <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>Your eSIMs, your data left and your travel badges. No password to remember.</div>
            {appleSignInAvailable() && (
              <div style={{ marginTop: 22, display: 'grid', gap: 10 }}>
                <button className="press" disabled={busy} onClick={() => void social('apple')} aria-label="Sign in with Apple" style={{ height: 52, borderRadius: RADIUS.md, border: 'none', background: '#000', color: '#fff', fontFamily: '-apple-system, var(--font)', fontSize: 17, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }}></span> Sign in with Apple
                </button>
                {googleSignInAvailable() && (
                  <button className="press" disabled={busy} onClick={() => void social('google')} aria-label="Sign in with Google" style={{ height: 52, borderRadius: RADIUS.md, border: `1.5px solid ${RC.line}`, background: '#fff', color: RC.ink, fontFamily: 'var(--font)', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer' }}>
                    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.7-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
                    Sign in with Google
                  </button>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0 0' }}>
                  <div style={{ flex: 1, height: 1, background: RC.line }} />
                  <span style={{ fontFamily: 'var(--font)', fontSize: 12.5, color: RC.inkMute }}>or with your email</span>
                  <div style={{ flex: 1, height: 1, background: RC.line }} />
                </div>
              </div>
            )}
            <div style={{ marginTop: 18 }}>
              <FieldLabel>Email</FieldLabel>
              <Input value={email} onChange={setEmail} placeholder="you@example.com" type="email" inputMode="email" />
              {err && <div style={{ marginTop: 10, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: '#A12C2C', lineHeight: 1.45 }}>{err}</div>}
            </div>
            <div style={{ marginTop: 22 }}>
              <RingoButton loading={busy} onClick={() => void send()}>Send me a code</RingoButton>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: RC.ink, letterSpacing: -0.7, lineHeight: 1.15 }}>Check your inbox</div>
            <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
              We sent a code to <span style={{ color: RC.ink, fontWeight: 600 }}>{email.trim().toLowerCase()}</span>. It works for ten minutes.
            </div>
            <div style={{ marginTop: 22 }}>
              <FieldLabel>Six-digit code</FieldLabel>
              <input
                ref={codeRef}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                style={{ width: '100%', height: 58, padding: '0 16px', borderRadius: RADIUS.md, background: RC.paper, border: `1.5px solid ${code.length === 6 ? RC.inkStrong : RC.line}`, outline: 'none', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 26, fontWeight: 700, letterSpacing: 8, color: RC.ink, textAlign: 'center' }}
              />
              {err && <div style={{ marginTop: 10, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: '#A12C2C', lineHeight: 1.45 }}>{err}</div>}
            </div>
            <div style={{ marginTop: 22 }}>
              <RingoButton loading={busy} disabled={code.length !== 6} onClick={() => void verify()}>Log in</RingoButton>
            </div>
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <button className="press" disabled={wait > 0 || busy} onClick={() => void send()} style={{ border: 'none', background: 'transparent', cursor: wait > 0 ? 'default' : 'pointer', fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 600, color: wait > 0 ? RC.inkMute : RC.inkStrong }}>
                {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
