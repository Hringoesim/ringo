// LoginScreen: sign in or create an account. Sign in with Apple, Google
// (when configured) or a six-digit code sent to an email. No password. The
// first sign-in creates the account; the account itself is the website's
// (the signup row and its token), the same one a purchase opens.
//
// Layout: a readable column (max 560) on every width; on a wide screen
// (iPhone Duo open) the photo sits beside the sign-in choices.
import { useEffect, useRef, useState } from 'react';
import { RC, RADIUS, TYPE, TAP, typeFor, hexA } from '../theme';
import { RingoWordmark } from '../components/Wordmark';
import { RingoButton } from '../components/Button';
import { AuthButtons } from '../components/AuthButtons';
import { FieldLabel, Input, TextLink, ErrorBox } from '../components/ui';
import { light } from '../api/light';
import { account } from '../store/account';
import { bundledPictureFor, pictureFor } from '../data/destinations';
import { hapticNotify, hapticSelection } from '../lib/haptics';
import { appleSignInAvailable } from '../lib/auth';
import { useLayout, contentColumn } from '../lib/layout';
import { requestLightStatusBar } from '../lib/statusBar';
import { t, tn, tk } from '../lib/i18n';

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
  // On a phone the photo hero sits under the clock: light text over it.
  useEffect(() => {
    if (l.isWide) return;
    requestLightStatusBar(true);
    return () => requestLightStatusBar(false);
  }, [l.isWide]);

  useEffect(() => {
    if (wait <= 0) return;
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(id);
  }, [wait]);

  // A code to an address that does not exist bounces within seconds, and
  // "Check your inbox" would otherwise wait forever. Ask the site every few
  // seconds for two minutes; on a bounce, back to the email with the reason.
  const [sentTo, setSentTo] = useState<string | null>(null);
  useEffect(() => {
    if (stage !== 'code' || !sentTo) return;
    let n = 0;
    const tick = window.setInterval(async () => {
      if (++n > 24) { window.clearInterval(tick); return; }
      try {
        const r = await light.loginCheck(sentTo);
        if (!alive.current || !r.bounced) return;
        window.clearInterval(tick);
        setSentTo(null); setStage('email'); setCode('');
        setErr(r.error || t('Our email to that address bounced back. Check the spelling.'));
        hapticNotify('error');
      } catch { /* a failed check never interrupts the sign-in */ }
    }, 5000);
    return () => window.clearInterval(tick);
  }, [stage, sentTo]);

  const focusCode = () => window.setTimeout(() => { if (alive.current) codeRef.current?.focus(); }, 200);

  const send = async () => {
    if (busy) return;
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) { setErr(t('Enter a valid email.')); return; }
    setErr(null); setBusy(true);
    try {
      const r = await light.loginStart(e);
      if (!alive.current) return;
      setWait(r.retry_after || 60);
      if (r.sent) setSentTo(e);
      setStage('code');
      focusCode();
    } catch (ex) {
      if (!alive.current) return;
      setErr((ex as Error).message || t('Could not send the code.'));
      hapticNotify('error');
    } finally { if (alive.current) setBusy(false); }
  };

  const verify = async () => {
    if (busy) return;
    const c = code.replace(/\D/g, '');
    if (c.length !== 6) { setErr(t('The code is six digits.')); return; }
    setErr(null); setBusy(true);
    try {
      const r = await light.loginVerify(email.trim().toLowerCase(), c);
      account.set({ userId: r.user_id, t: r.t, email: r.email, purchaseRef: null });
      hapticNotify('success');
      onDone();
    } catch (ex) {
      if (!alive.current) return;
      setErr((ex as Error).message || t('That code did not match.'));
      hapticNotify('error');
    } finally { if (alive.current) setBusy(false); }
  };

  const back = stage === 'code'
    ? () => { hapticSelection(); setStage('email'); setCode(''); setErr(null); }
    : stage === 'email' && appleSignInAvailable() && !startWithEmail
      ? () => { hapticSelection(); setStage('choose'); setErr(null); }
      : onBack;

  const errBox = err ? <ErrorBox style={{ marginTop: 12 }}>{err}</ErrorBox> : null;
  const head = stage === 'code'
    ? { title: t('Check your inbox'), sub: tn('We sent a six digit code to {email}. It works for ten minutes.', { email: <b style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{email.trim().toLowerCase()}</b> }) }
    : stage === 'email'
      ? { title: t('Sign in with your email'), sub: t('We send you a six digit code. No password to remember.') }
      : { title: t('Welcome to Ringo'), sub: t('Sign in or create your account in one tap.') };

  const form = (
    <>
      {stage === 'choose' && (
        <AuthButtons onSignedIn={onDone} onEmail={() => { hapticSelection(); setErr(null); setStage('email'); }} />
      )}

      {stage === 'email' && (
        <>
          <FieldLabel htmlFor="login-email">{t('Email')}</FieldLabel>
          <Input id="login-email" name="email" autoComplete="email" value={email} onChange={(v) => { setEmail(v); if (err) setErr(null); }} placeholder={t('you@example.com')} type="email" inputMode="email" invalid={Boolean(err)} onEnter={() => void send()} />
          {errBox}
          <div style={{ marginTop: 20 }}>
            <RingoButton loading={busy} onClick={() => void send()}>{t('Send my code')}</RingoButton>
          </div>
          {/* App Review is given a fixed code, and the field for it used to
              sit behind a send that their address cannot receive. */}
          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <TextLink
              onClick={() => {
                if (!EMAIL_RE.test(email.trim().toLowerCase())) { setErr(t('Enter a valid email.')); return; }
                hapticSelection(); setErr(null); setStage('code');
                focusCode();
              }}
            >
              {t('I already have a code')}
            </TextLink>
          </div>
        </>
      )}

      {stage === 'code' && (
        <>
          <FieldLabel htmlFor="login-code">{t('Six digit code')}</FieldLabel>
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
            placeholder="••••••"
            aria-invalid={Boolean(err) || undefined}
            className="ringo-input ringo-code"
            style={{
              width: '100%', height: 64, padding: '0 16px', boxSizing: 'border-box', borderRadius: RADIUS.control, background: RC.paper,
              border: `1.5px solid ${err ? RC.error : codeFocus ? RC.inkStrong : RC.lineStrong}`,
              boxShadow: codeFocus ? `0 0 0 3px ${hexA('#FF5724', 0.14)}` : 'none',
              outline: 'none', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 28, fontWeight: 700,
              letterSpacing: 10, color: RC.ink, textAlign: 'center',
            }}
          />
          {errBox}
          <div style={{ marginTop: 20 }}>
            <RingoButton loading={busy} disabled={code.length !== 6} onClick={() => void verify()}>{t('Sign in')}</RingoButton>
          </div>
          <div style={{ marginTop: 18, textAlign: 'center' }}>
            {wait > 0 ? (
              <p aria-live="polite" style={{ margin: 0, ...TYPE.small, fontWeight: 500, color: RC.ink2 }}>{t('Send a new code in {n}s', { n: wait })}</p>
            ) : (
              <TextLink disabled={busy} onClick={() => void send()}>{t('Send a new code')}</TextLink>
            )}
          </div>
        </>
      )}

      {/* What the account is for, said once, in the site's green ticks. */}
      <ul style={{ listStyle: 'none', margin: '28px 0 0', padding: '20px 0 0', borderTop: `1.5px solid ${RC.line}`, display: 'grid', gap: 10 }}>
        {[tk('Your eSIMs on any phone you sign in on'), tk('Data left and day by day usage'), tk('Ringo Rewards and your travel badges')].map((line) => (
          <li key={line} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', ...TYPE.body, fontSize: 16, color: RC.ink }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden style={{ marginTop: 3, flexShrink: 0 }}><path d="M3 8.5l3.2 3L13 4.5" stroke="hsl(142,60%,42%)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>{t(line)}</span>
          </li>
        ))}
      </ul>
    </>
  );

  // The hero: three travel photographs under the site's warm dusk, the white
  // wordmark, and the step's heading in white. On a wide screen (iPhone Duo
  // open) it is the left column; on a phone it sits above the sheet.
  const hero = (
    <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,hsl(8,95%,55%),hsl(330,90%,58%),hsl(262,70%,48%))', ...(l.isWide ? { borderRadius: 28, minHeight: 'min(720px, calc(100vh - 80px))' } : { minHeight: l.isCover ? 300 : 340 }) }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1.3fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2, background: '#1A0F2E' }}>
        {HERO_PHOTOS.map((id, i) => {
          const src = bundledPictureFor(id) ?? pictureFor(id);
          return <img key={id} src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', gridRow: i === 0 ? '1 / span 2' : undefined }} />;
        })}
      </div>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(26,15,46,0.55) 0%, rgba(26,15,46,0.25) 38%, rgba(26,15,46,0.82) 100%)' }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'inherit', boxSizing: 'border-box', padding: l.isWide ? '24px 28px 32px' : `calc(env(safe-area-inset-top, 0px) + 12px) ${l.gutter}px ${l.isWide ? 32 : 52}px` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="press" onClick={back} aria-label={t('Back')} style={{ width: TAP, height: TAP, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.45)', background: 'rgba(26,15,46,0.35)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
            <svg className="flip-rtl" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M15 5l-7 7 7 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <RingoWordmark light size={30} />
          <span style={{ width: TAP }} aria-hidden />
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 40 }}>
          <h1 style={{ margin: 0, ...typeFor('display', l.size), color: '#fff', textShadow: '0 2px 16px rgba(0,0,0,0.35)' }}>{head.title}</h1>
          <p style={{ margin: '8px 0 0', ...TYPE.body, color: 'rgba(255,255,255,0.94)', textShadow: '0 1px 10px rgba(0,0,0,0.35)', maxWidth: 440 }}>{head.sub}</p>
        </div>
      </div>
    </div>
  );

  const sheet = (
    <div style={{ position: 'relative', background: RC.bg, ...(l.isWide ? { padding: '8px 0 0' } : { marginTop: -28, borderRadius: '28px 28px 0 0', padding: `28px ${l.gutter}px 0`, boxShadow: '0 -10px 24px -16px rgba(20,10,30,0.45)' }) }}>
      <div style={l.isWide ? undefined : { maxWidth: 560, margin: '0 auto' }}>{form}</div>
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: RC.bg }}>
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', paddingBottom: 'max(40px, calc(env(safe-area-inset-bottom, 0px) + 24px))' }}>
        {l.isWide ? (
          <div style={{ ...contentColumn(l, 1040), minHeight: '100%', boxSizing: 'border-box', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 32px)', paddingBottom: 24, display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr)', gap: 40, alignItems: 'center' }}>
            {hero}
            <div>{sheet}</div>
          </div>
        ) : (
          <>
            {hero}
            {sheet}
          </>
        )}
      </div>
    </div>
  );
}

// The three photographs behind the sign-in heading (bundled, so they show
// offline and at once).
const HERO_PHOTOS = ['japan', 'iceland', 'morocco'];
