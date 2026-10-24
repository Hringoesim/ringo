// AuthButtons — the three ways into an account, in Apple's required order
// (Sign in with Apple first wherever another sign-in is offered, guideline
// 4.8): Apple, Google (once its client is configured), then an email code.
// Shared by the welcome screen and the login screen so they never drift.
import { useState, type CSSProperties } from 'react';
import { RC, RADIUS } from '../theme';
import { signInWithApple, signInWithGoogle, appleSignInAvailable, googleSignInAvailable } from '../lib/auth';
import { hapticNotify } from '../lib/haptics';
import { useFlags } from '../store/flags';

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.7-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
);

const MailMark = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" stroke="#F26122" strokeWidth="2" /><path d="M4 7l8 6 8-6" stroke="#F26122" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export function AuthButtons({ onSignedIn, onEmail, onDark = false }: { onSignedIn: () => void; onEmail: () => void; onDark?: boolean }) {
  useFlags();   // re-render when the site's switches arrive
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const social = async (which: 'apple' | 'google') => {
    setErr(null); setBusy(which);
    try {
      const r = await (which === 'apple' ? signInWithApple() : signInWithGoogle());
      if (r.ok) { hapticNotify('success'); onSignedIn(); return; }
      if (!r.cancelled) { setErr(r.error); hapticNotify('error'); }
    } finally { setBusy(null); }
  };

  // 54pt, radius 14, 17/600: the site's button shape at a tap-first size.
  const row = (extra: CSSProperties): CSSProperties => ({
    height: 54, borderRadius: RADIUS.control, border: 'none', width: '100%', boxSizing: 'border-box',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer',
    fontFamily: 'var(--font)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', ...extra,
  });

  // The App Store screenshots are shot in a browser (VITE_SHOT), where the
  // native sheet does not exist; they still show the button the phone shows.
  const showApple = appleSignInAvailable() || Boolean(import.meta.env.VITE_SHOT);
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {/* Apple's white style: allowed by the Sign in with Apple guidelines, and the owner wants no black button. */}
      {showApple && (
        <button className="press" disabled={busy !== null} onClick={() => void social('apple')} aria-label="Sign in with Apple" style={row({ background: '#fff', color: '#000', border: `1.5px solid ${onDark ? 'transparent' : '#000'}`, fontFamily: '-apple-system, var(--font)', fontSize: 17 })}>
          <span style={{ fontSize: 20, lineHeight: 1 }}></span>{busy === 'apple' ? 'Opening…' : 'Sign in with Apple'}
        </button>
      )}
      {googleSignInAvailable() && (
        <button className="press" disabled={busy !== null} onClick={() => void social('google')} aria-label="Continue with Google" style={row({ background: '#fff', color: '#1A0F2E', border: `1.5px solid ${onDark ? 'transparent' : RC.lineStrong}` })}>
          <GoogleMark />{busy === 'google' ? 'Opening…' : 'Continue with Google'}
        </button>
      )}
      {/* The same white button as Apple and Google, with a mail mark: one
          family of three choices, ink on white (well over 7:1) on the sunset
          and on the cream sheet alike. */}
      <button className="press" disabled={busy !== null} onClick={onEmail} style={row({ background: '#fff', color: '#1A0F2E', border: `1.5px solid ${onDark ? 'transparent' : RC.lineStrong}`, boxShadow: onDark ? '0 10px 26px -12px rgba(26,15,46,0.55)' : 'none' })}>
        <MailMark />Continue with email
      </button>
      {err && (
        <div role="alert" style={{ padding: '12px 14px', borderRadius: 12, background: onDark ? '#FFFFFF' : RC.errorSoft, border: '1px solid rgba(225,29,72,0.18)', fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, lineHeight: 1.45, color: onDark ? '#A12C2C' : RC.error, textAlign: 'center' }}>
          {err}
        </div>
      )}
    </div>
  );
}
