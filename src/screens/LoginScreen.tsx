// LoginScreen — sign in or create an account: Sign in with Apple, Google
// (when configured) or a six-digit code sent to an email. No password. The
// first sign-in creates the account; the account itself is the website's
// (the signup row and its token), the same one a purchase opens.
import { useEffect, useRef, useState } from 'react';
import { RC, RADIUS } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { AuthButtons } from '../components/AuthButtons';
import { BackBtn, FieldLabel, Input } from '../components/ui';
import { light } from '../api/light';
import { account } from '../store/account';
import { hapticNotify, hapticSelection } from '../lib/haptics';
import { appleSignInAvailable } from '../lib/auth';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function LoginScreen({ onBack, onDone, initialEmail = '', startWithEmail = false }: { onBack: () => void; onDone: () => void; initialEmail?: string; startWithEmail?: boolean }) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'choose' | 'email' | 'code'>(startWithEmail || !appleSignInAvailable() ? 'email' : 'choose');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  const send = async () => {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) { setErr('Enter a valid email.'); return; }
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

  const back = stage === 'code'
    ? () => { hapticSelection(); setStage('email'); setCode(''); setErr(null); }
    : stage === 'email' && appleSignInAvailable() && !startWithEmail
      ? () => { hapticSelection(); setStage('choose'); setErr(null); }
      : onBack;

  const H = ({ children }: { children: string }) => <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: RC.ink, letterSpacing: -0.7, lineHeight: 1.15 }}>{children}</div>;
  const P = ({ children }: { children: React.ReactNode }) => <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>{children}</div>;
  const Err = () => err ? <div style={{ marginTop: 10, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: '#A12C2C', lineHeight: 1.45 }}>{err}</div> : null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title={stage === 'choose' ? 'Sign in' : stage === 'email' ? 'Your email' : 'Your code'} leading={<BackBtn onClick={back} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 40px' }}>
        {stage === 'choose' && (
          <>
            <H>Sign in or create an account</H>
            <P>One account for your eSIMs, your data left and your travel badges.</P>
            <div style={{ marginTop: 22 }}>
              <AuthButtons onSignedIn={onDone} onEmail={() => { hapticSelection(); setStage('email'); }} />
            </div>
          </>
        )}

        {stage === 'email' && (
          <>
            <H>Your email</H>
            <P>We send a six-digit code there. No password.</P>
            <div style={{ marginTop: 22 }}>
              <FieldLabel>Email</FieldLabel>
              <Input value={email} onChange={setEmail} placeholder="you@example.com" type="email" inputMode="email" />
              <Err />
            </div>
            <div style={{ marginTop: 22 }}>
              <RingoButton loading={busy} onClick={() => void send()}>Send my code</RingoButton>
            </div>
          </>
        )}

        {stage === 'code' && (
          <>
            <H>Check your inbox</H>
            <P>Code sent to <span style={{ color: RC.ink, fontWeight: 600 }}>{email.trim().toLowerCase()}</span>. It works for ten minutes.</P>
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
              <Err />
            </div>
            <div style={{ marginTop: 22 }}>
              <RingoButton loading={busy} disabled={code.length !== 6} onClick={() => void verify()}>Sign in</RingoButton>
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
