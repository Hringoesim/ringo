// LoginScreen: sign in or create an account. Sign in with Apple, Google
// (when configured) or a six-digit code sent to an email. No password. The
// first sign-in creates the account; the account itself is the website's
// (the signup row and its token), the same one a purchase opens.
//
// Layout: a readable column (max 560) on every width; on a wide screen
// (iPhone Duo open) the photo sits beside the sign-in choices.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RC, RADIUS, TYPE, typeFor, hexA } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { AuthButtons } from '../components/AuthButtons';
import { BackBtn, FieldLabel, Input, TextLink, ErrorBox, PhotoCard } from '../components/ui';
import { light } from '../api/light';
import { account } from '../store/account';
import { bundledPictureFor, pictureFor } from '../data/destinations';
import { hapticNotify, hapticSelection } from '../lib/haptics';
import { appleSignInAvailable } from '../lib/auth';
import { useLayout, contentColumn, readColumn } from '../lib/layout';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function LoginScreen({ onBack, onDone, initialEmail = '', startWithEmail = false }: { onBack: () => void; onDone: () => void; initialEmail?: string; startWithEmail?: boolean }) {
  const l = useLayout();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [codeFocus, setCodeFocus] = useState(false);
  const [stage, setStage] = useState<'choose' | 'email' | 'code'>(startWithEmail || !appleSignInAvailable() ? 'email' : 'choose');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  const focusCode = () => window.setTimeout(() => { if (alive.current) codeRef.current?.focus(); }, 200);

  const send = async () => {
    if (busy) return;
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) { setErr('Enter a valid email.'); return; }
    setErr(null); setBusy(true);
    try {
      const r = await light.loginStart(e);
      if (!alive.current) return;
      setWait(r.retry_after || 60);
      setStage('code');
      focusCode();
    } catch (ex) {
      if (!alive.current) return;
      setErr((ex as Error).message || 'Could not send the code.');
      hapticNotify('error');
    } finally { if (alive.current) setBusy(false); }
  };

  const verify = async () => {
    if (busy) return;
    const c = code.replace(/\D/g, '');
    if (c.length !== 6) { setErr('The code is six digits.'); return; }
    setErr(null); setBusy(true);
    try {
      const r = await light.loginVerify(email.trim().toLowerCase(), c);
      account.set({ userId: r.user_id, t: r.t, email: r.email, purchaseRef: null });
      hapticNotify('success');
      onDone();
    } catch (ex) {
      if (!alive.current) return;
      setErr((ex as Error).message || 'That code did not match.');
      hapticNotify('error');
    } finally { if (alive.current) setBusy(false); }
  };

  const back = stage === 'code'
    ? () => { hapticSelection(); setStage('email'); setCode(''); setErr(null); }
    : stage === 'email' && appleSignInAvailable() && !startWithEmail
      ? () => { hapticSelection(); setStage('choose'); setErr(null); }
      : onBack;

  const title = (children: string, sub: ReactNode) => (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ margin: 0, ...typeFor('display', l.size), color: RC.ink }}>{children}</h2>
      <p style={{ margin: '8px 0 0', ...TYPE.body, color: RC.ink2 }}>{sub}</p>
    </div>
  );
  const errBox = err ? <ErrorBox style={{ marginTop: 12 }}>{err}</ErrorBox> : null;
  const picture = bundledPictureFor('japan') ?? pictureFor('japan');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Sign in" leading={<BackBtn onClick={back} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', paddingBottom: 'max(40px, calc(env(safe-area-inset-bottom, 0px) + 24px))' }}>
        {stage === 'choose' && (
          <div style={{ ...contentColumn(l, l.isWide ? 880 : 560), paddingTop: 4 }}>
            <div style={l.isWide ? { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 28, alignItems: 'center' } : undefined}>
              <PhotoCard
                id="signin"
                name="Your trips, one account"
                photo={picture}
                eager
                aspect={l.isWide ? '4 / 3' : l.isCover ? '2 / 1' : '16 / 9'}
                style={{ marginBottom: l.isWide ? 0 : 24 }}
              />
              <div>
                {title('Sign in or create an account', 'Your eSIMs, your data and your travel badges in one place.')}
                <AuthButtons onSignedIn={onDone} onEmail={() => { hapticSelection(); setErr(null); setStage('email'); }} />
              </div>
            </div>
          </div>
        )}

        {stage === 'email' && (
          <div style={{ ...readColumn(l), paddingTop: 4 }}>
            {title('Your email', 'We send a six digit code there. No password.')}
            <FieldLabel htmlFor="login-email">Email</FieldLabel>
            <Input id="login-email" name="email" autoComplete="email" value={email} onChange={(v) => { setEmail(v); if (err) setErr(null); }} placeholder="you@example.com" type="email" inputMode="email" invalid={Boolean(err)} onEnter={() => void send()} />
            {errBox}
            <div style={{ marginTop: 24 }}>
              <RingoButton loading={busy} onClick={() => void send()}>Send my code</RingoButton>
            </div>
            {/* App Review is given a fixed code, and the field for it used to
                sit behind a send that their address cannot receive. */}
            <div style={{ marginTop: 28, textAlign: 'center' }}>
              <TextLink
                onClick={() => {
                  if (!EMAIL_RE.test(email.trim().toLowerCase())) { setErr('Enter a valid email.'); return; }
                  hapticSelection(); setErr(null); setStage('code');
                  focusCode();
                }}
              >
                I already have a code
              </TextLink>
            </div>
          </div>
        )}

        {stage === 'code' && (
          <div style={{ ...readColumn(l), paddingTop: 4 }}>
            {title('Check your inbox', <>Code sent to <span style={{ color: RC.ink, fontWeight: 600, overflowWrap: 'anywhere' }}>{email.trim().toLowerCase()}</span>. It works for ten minutes.</>)}
            <FieldLabel htmlFor="login-code">Six digit code</FieldLabel>
            <input
              id="login-code"
              ref={codeRef}
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); if (err) setErr(null); }}
              onFocus={() => setCodeFocus(true)}
              onBlur={() => setCodeFocus(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6) void verify(); }}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              aria-invalid={Boolean(err) || undefined}
              className="ringo-input"
              style={{
                width: '100%', height: 60, padding: '0 16px', boxSizing: 'border-box', borderRadius: RADIUS.control, background: RC.paper,
                border: `1.5px solid ${err ? RC.error : codeFocus ? RC.inkStrong : RC.lineStrong}`,
                boxShadow: codeFocus ? `0 0 0 3px ${hexA('#FF5724', 0.14)}` : 'none',
                outline: 'none', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 26, fontWeight: 700,
                letterSpacing: 8, color: RC.ink, textAlign: 'center',
              }}
            />
            {errBox}
            <div style={{ marginTop: 24 }}>
              <RingoButton loading={busy} disabled={code.length !== 6} onClick={() => void verify()}>Sign in</RingoButton>
            </div>
            <div style={{ marginTop: 28, textAlign: 'center' }}>
              {wait > 0 ? (
                <p aria-live="polite" style={{ margin: 0, ...TYPE.small, fontWeight: 500, color: RC.ink2 }}>Send a new code in {wait}s</p>
              ) : (
                <TextLink disabled={busy} onClick={() => void send()}>Send a new code</TextLink>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
