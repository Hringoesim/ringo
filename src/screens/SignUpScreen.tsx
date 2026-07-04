// SignUpScreen — YC-style: clean, one decision per screen. Apple sign-in is the
// primary action; email + optional phone fall below an "or use email" divider.
import { useState } from 'react';
import { RC } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn, FieldLabel, Input } from '../components/ui';
import { RingoWordmark } from '../components/Wordmark';

interface SignUpScreenProps {
  onBack: () => void;
  onEmailAuth: (v: { name: string; email: string; password: string }) => void | Promise<void>;
  onAppleSignIn: () => void | Promise<void>;
  onGoogleSignIn: () => void | Promise<void>;
  onForgotPassword?: (email: string) => Promise<{ ok: boolean; error?: string }>;
  mode?: 'create' | 'login';
}

export function SignUpScreen({ onBack, onEmailAuth, onAppleSignIn, onGoogleSignIn, onForgotPassword, mode = 'create' }: SignUpScreenProps) {
  const login = mode === 'login';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(true);
  const emailOk = /\S+@\S+\.\S+/.test(email);
  const passOk = password.length >= 8;
  const canSubmit = emailOk && passOk && (login || agree);

  const [busy, setBusy] = useState<'apple' | 'google' | 'email' | null>(null);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const fail: Record<string, string> = {
    apple: 'Apple sign-in isn’t connected yet. Use email below for now.',
    google: 'Google sign-in isn’t connected yet. Use email below for now.',
    email: login ? 'Couldn’t log you in. Check your details.' : 'Couldn’t create your account. Try again.',
  };
  const run = async (kind: 'apple' | 'google' | 'email', fn: () => void | Promise<void>) => {
    if (busy) return;
    setErr('');
    setNote('');
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      // Surface the real provider error (helps diagnose Apple/Google on device)
      // rather than always hiding it behind the generic fallback copy.
      const m = e instanceof Error && e.message ? e.message : '';
      setErr(m || fail[kind]);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="" leading={<BackBtn onClick={onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '0 24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <RingoWordmark size={28} />
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: RC.ink, letterSpacing: -0.6, lineHeight: 1.1, textWrap: 'pretty' }}>
          {login ? 'Log in to Ringo.' : 'Create your Ringo account.'}
        </div>
        <div style={{ marginTop: 8, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
          {login
            ? 'Welcome back. Use the email and password you signed up with.'
            : 'Set up in seconds — no SMS code needed. You can add or port a number once you’re in.'}
        </div>

        {err && (
          <div style={{ marginTop: 16, padding: '11px 14px', borderRadius: 12, background: 'rgba(229,67,26,0.10)', border: '1px solid rgba(229,67,26,0.22)', fontFamily: 'var(--font)', fontSize: 12.5, color: '#B7341A', lineHeight: 1.45 }}>
            {err}
          </div>
        )}
        {note && (
          <div style={{ marginTop: 16, padding: '11px 14px', borderRadius: 12, background: 'rgba(46,164,79,0.10)', border: '1px solid rgba(46,164,79,0.25)', fontFamily: 'var(--font)', fontSize: 12.5, color: '#1F7A38', lineHeight: 1.45 }}>
            {note}
          </div>
        )}

        {/* Sign in with Apple — primary, top of stack (white on dark, black on light) */}
        <button
          disabled={!!busy}
          onClick={() => run('apple', onAppleSignIn)}
          style={{
            marginTop: err ? 12 : 24, width: '100%', height: 54, borderRadius: 16, border: 'none',
            background: RC.scheme === 'dark' ? '#FFFFFF' : '#000',
            color: RC.scheme === 'dark' ? '#000' : '#FFFFFF',
            fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, letterSpacing: -0.1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: busy ? 'default' : 'pointer', opacity: busy && busy !== 'apple' ? 0.5 : 1,
            boxShadow: '0 8px 22px -12px rgba(0,0,0,0.45)',
          }}
        >
          {busy === 'apple' ? (
            'Connecting…'
          ) : (
            <>
              {/* Official Apple logo (Apple Human Interface Guidelines mark). */}
              <svg width="15" height="18" viewBox="0 0 384 512" fill={RC.scheme === 'dark' ? '#000' : '#FFFFFF'} style={{ transform: 'translateY(-1px)' }} aria-hidden="true">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-20.6-29.4-51.7-45.6-92.8-48.8-39-3-81.5 22.9-97 22.9-16.4 0-54-22.4-83.2-21.9-42.9.6-82.5 25-104.6 63.4-44.6 77.4-11.4 191.8 31.9 254.6 21.2 30.8 46.3 65.3 79.5 64.1 31.9-1.3 43.9-20.7 82.5-20.7 38.5 0 49.4 20.7 83.2 20 34.4-.6 56.1-31.1 77-62 24.3-35.6 34.3-70.1 34.8-71.9-.7-.3-66.8-25.6-67.5-101.6zM256.3 89.5c17.4-21.1 29.1-50.4 25.9-79.5-25 1-55.3 16.6-73.3 37.7-16.1 18.7-30.2 48.6-26.4 77.2 27.9 2.2 56.4-14.2 73.8-35.4z" />
              </svg>
              {login ? 'Sign in with Apple' : 'Sign up with Apple'}
            </>
          )}
        </button>

        {/* Continue with Google */}
        <button
          disabled={!!busy}
          onClick={() => run('google', onGoogleSignIn)}
          style={{
            marginTop: 10, width: '100%', height: 54, borderRadius: 16,
            border: `1.5px solid ${RC.lineStrong}`, background: RC.paper, color: RC.ink,
            fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, letterSpacing: -0.1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            cursor: busy ? 'default' : 'pointer', opacity: busy && busy !== 'google' ? 0.5 : 1,
          }}
        >
          {busy === 'google' ? (
            'Connecting…'
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <div
          style={{
            margin: '18px 0 4px', display: 'flex', alignItems: 'center', gap: 10,
            fontFamily: 'var(--font)', fontSize: 11, fontWeight: 600, color: RC.inkMute,
            letterSpacing: 0.6, textTransform: 'uppercase',
          }}
        >
          <div style={{ flex: 1, height: 1, background: RC.line }} />
          or use email
          <div style={{ flex: 1, height: 1, background: RC.line }} />
        </div>

        {!login && (
          <div style={{ marginTop: 14 }}>
            <FieldLabel>Name</FieldLabel>
            <Input value={name} onChange={setName} placeholder="Hippolyte Van Marcke" type="text" />
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <FieldLabel>Email</FieldLabel>
          <Input value={email} onChange={setEmail} placeholder="you@you.com" type="email" inputMode="email" />
        </div>

        <div style={{ marginTop: 16 }}>
          <FieldLabel>Password</FieldLabel>
          <div style={{ position: 'relative' }}>
            <Input value={password} onChange={setPassword} placeholder={login ? 'Your password' : 'At least 8 characters'} type={showPw ? 'text' : 'password'} />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              style={{
                position: 'absolute', right: 12, top: 0, height: 54, border: 'none', background: 'transparent',
                fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 600, color: RC.inkMute, cursor: 'pointer',
              }}
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
          {!login && password.length > 0 && !passOk && (
            <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 11.5, color: RC.inkMute }}>
              Use at least 8 characters.
            </div>
          )}
        </div>

        {login ? (
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={async () => {
                if (busy) return;
                setErr('');
                setNote('');
                if (!emailOk) { setErr('Enter your email above first, then tap “Forgot password?” again.'); return; }
                if (!onForgotPassword) { setErr('Password reset isn’t available right now.'); return; }
                const r = await onForgotPassword(email);
                if (r.ok) setNote(`We’ve emailed a sign-in link to ${email}. Open it on this device to get back in.`);
                else setErr(r.error || 'Couldn’t send the reset email. Try again.');
              }}
              style={{
                border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
                fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: RC.inkStrong,
              }}
            >
              Forgot password?
            </button>
          </div>
        ) : (
        <label style={{ marginTop: 18, display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <span
            style={{
              width: 20, height: 20, borderRadius: 6, marginTop: 2,
              background: agree ? RC.grad : RC.paper,
              border: agree ? 'none' : `1.5px solid ${RC.lineStrong}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
            onClick={() => setAgree(!agree)}
          >
            {agree && (
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path d="M2 6l3 3 5-6" stroke="#FFFDFB" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span style={{ fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute, lineHeight: 1.5 }}>
            I agree to Ringo’s <span style={{ color: RC.inkStrong, fontWeight: 600 }}>Terms</span> and{' '}
            <span style={{ color: RC.inkStrong, fontWeight: 600 }}>Privacy Policy</span>. I understand identity verification is required to activate an eSIM.
          </span>
        </label>
        )}
      </div>

      <div
        style={{
          padding: '14px 24px 24px', borderTop: `1px solid ${RC.line}`,
          background: RC.glass,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}
      >
        <RingoButton
          disabled={!canSubmit || !!busy}
          onClick={() => run('email', () => onEmailAuth({ name, email, password }))}
        >
          {busy === 'email' ? (login ? 'Logging in…' : 'Creating account…') : login ? 'Log in' : 'Create account'}
        </RingoButton>
      </div>
    </div>
  );
}
