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

// The Apple logo drawn, not the U+F8FF glyph: that private-use character only
// renders in some system fonts and showed as nothing in the WebView, leaving
// "Sign in with Apple" without the logo Apple's button guidelines require.
const AppleMark = ({ color = '#000' }: { color?: string }) => (
  <svg width="17" height="20" viewBox="0 0 17 20" aria-hidden="true" style={{ marginTop: -2 }}><path fill={color} d="M14.04 10.63c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.19-1.73-1.35-.14-2.65.8-3.34.8-.7 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.19-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.6 2.25 2.75 2.21 1.1-.05 1.52-.71 2.85-.71 1.33 0 1.71.71 2.88.69 1.19-.02 1.94-1.08 2.66-2.15.84-1.23 1.19-2.42 1.2-2.48-.03-.01-2.3-.88-2.33-3.5zM11.85 4.17c.6-.74 1.01-1.75.9-2.77-.87.04-1.94.59-2.56 1.32-.56.64-1.05 1.68-.92 2.67.97.08 1.97-.49 2.58-1.22z" /></svg>
);

const MailMark = ({ color = '#F26122' }: { color?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" stroke={color} strokeWidth="2" /><path d="M4 7l8 6 8-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
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

  // On the dusk sky (the welcome screen): frosted glass (owner 2026-10-24,
  // "the glass look"), white label and marks over a blurred, lightly tinted
  // pane with a bright top edge. On the cream sheet: the white buttons.
  const glass: CSSProperties = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.12) 100%)',
    backdropFilter: 'blur(22px) saturate(170%)', WebkitBackdropFilter: 'blur(22px) saturate(170%)',
    border: '1px solid rgba(255,255,255,0.42)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 10px 28px -14px rgba(26,15,46,0.6)',
    color: '#FFFFFF', textShadow: '0 1px 1px rgba(26,15,46,0.25)',
  };
  const mark = onDark ? '#FFFFFF' : undefined;

  // The App Store screenshots are shot in a browser (VITE_SHOT), where the
  // native sheet does not exist; they still show the button the phone shows.
  const showApple = appleSignInAvailable() || Boolean(import.meta.env.VITE_SHOT);
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {/* White on cream (Apple's white style); frosted glass with the white logo on the dusk sky. */}
      {showApple && (
        <button className="press" disabled={busy !== null} onClick={() => void social('apple')} aria-label="Sign in with Apple" style={row({ ...(onDark ? glass : { background: '#fff', color: '#000', border: '1.5px solid #000' }), fontFamily: '-apple-system, var(--font)', fontSize: 17 })}>
          <AppleMark color={mark} />{busy === 'apple' ? 'Opening…' : 'Sign in with Apple'}
        </button>
      )}
      {googleSignInAvailable() && (
        <button className="press" disabled={busy !== null} onClick={() => void social('google')} aria-label="Continue with Google" style={row(onDark ? glass : { background: '#fff', color: '#1A0F2E', border: `1.5px solid ${RC.lineStrong}` })}>
          <GoogleMark />{busy === 'google' ? 'Opening…' : 'Continue with Google'}
        </button>
      )}
      {/* The same white button as Apple and Google, with a mail mark: one
          family of three choices, ink on white (well over 7:1) on the sunset
          and on the cream sheet alike. */}
      <button className="press" disabled={busy !== null} onClick={onEmail} style={row(onDark ? glass : { background: '#fff', color: '#1A0F2E', border: `1.5px solid ${RC.lineStrong}` })}>
        <MailMark color={mark} />Continue with email
      </button>
      {err && (
        <div role="alert" style={{ padding: '12px 14px', borderRadius: 12, background: onDark ? '#FFFFFF' : RC.errorSoft, border: '1px solid rgba(225,29,72,0.18)', fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, lineHeight: 1.45, color: onDark ? '#A12C2C' : RC.error, textAlign: 'center' }}>
          {err}
        </div>
      )}
    </div>
  );
}
