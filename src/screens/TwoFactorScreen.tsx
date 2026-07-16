// TwoFactorScreen — real TOTP two-factor auth via Supabase MFA.
// Enroll → scan QR in an authenticator app → verify 6-digit code → enabled.
// Only works against the real backend (needs a signed-in Supabase account).
import { useEffect, useState } from 'react';
import { RC } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn } from '../components/ui';
import { isSupabaseConfigured, sbAuth } from '../lib/ringoSupabase';
import { hapticNotify } from '../lib/haptics';

export function TwoFactorScreen({ onBack }: { onBack: () => void }) {
  const live = isSupabaseConfigured();
  const [loading, setLoading] = useState(live);
  const [enabled, setEnabled] = useState(false);
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!live) return;
    void sbAuth.mfaEnabled().then((e) => { setEnabled(e); setLoading(false); });
  }, [live]);

  const startEnroll = async () => {
    setErr(''); setBusy(true);
    const r = await sbAuth.mfaEnroll();
    setBusy(false);
    if (r.ok && r.factorId && r.qr) setEnroll({ factorId: r.factorId, qr: r.qr, secret: r.secret || '' });
    else setErr(r.error || 'Could not start 2FA.');
  };
  const verify = async () => {
    if (!enroll || code.length < 6) return;
    setErr(''); setBusy(true);
    const r = await sbAuth.mfaVerify(enroll.factorId, code);
    setBusy(false);
    if (r.ok) { hapticNotify('success'); setEnabled(true); setEnroll(null); setCode(''); }
    else { hapticNotify('error'); setErr(r.error || 'Verification failed.'); }
  };
  const disable = async () => {
    setBusy(true);
    await sbAuth.mfaDisable();
    setBusy(false); setEnabled(false); hapticNotify('warning');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Two-factor auth" leading={<BackBtn onClick={onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 24px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: RC.ink, letterSpacing: -0.65, lineHeight: 1.15 }}>
          Two-factor authentication
        </div>
        <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
          Add a second step at sign-in with an authenticator app (Google Authenticator, 1Password, Authy…). Your number and account stay protected even if your password leaks.
        </div>

        {!live ? (
          <div style={{ marginTop: 22, padding: 16, borderRadius: 16, background: RC.cream, fontFamily: 'var(--font)', fontSize: 13.5, color: RC.ink, lineHeight: 1.6 }}>
            2FA protects <strong>real</strong> Ringo accounts. It becomes available once you sign in with your live account — the app is currently in demo mode, so there’s no real account to protect yet.
          </div>
        ) : loading ? (
          <div style={{ marginTop: 24, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute }}>Checking your security…</div>
        ) : enabled ? (
          <>
            <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, background: 'rgba(31,138,91,0.10)', border: '1px solid rgba(31,138,91,0.25)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" stroke="#1F8A5B" strokeWidth="2" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" stroke="#1F8A5B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <div style={{ fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 600, color: '#1F7A4E' }}>Two-factor is on</div>
            </div>
            <div style={{ marginTop: 20 }}>
              <RingoButton variant="ghost" disabled={busy} onClick={disable}>{busy ? 'Removing…' : 'Turn off 2FA'}</RingoButton>
            </div>
          </>
        ) : enroll ? (
          <>
            <div style={{ marginTop: 20, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: RC.inkStrong }}>1. Scan this in your authenticator app</div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 200, height: 200, borderRadius: 16, background: '#fff', border: `1px solid ${RC.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                {enroll.qr.trim().startsWith('<svg')
                  ? <div style={{ width: 180, height: 180 }} dangerouslySetInnerHTML={{ __html: enroll.qr }} />
                  : <img src={enroll.qr} alt="2FA QR" style={{ width: 180, height: 180 }} />}
              </div>
            </div>
            {enroll.secret && (
              <div style={{ marginTop: 12, textAlign: 'center', fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute }}>
                Can’t scan? Enter this key: <span style={{ fontWeight: 700, color: RC.ink, letterSpacing: 0.5 }}>{enroll.secret}</span>
              </div>
            )}
            <div style={{ marginTop: 20, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: RC.inkStrong }}>2. Enter the 6-digit code it shows</div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              placeholder="000000"
              style={{ marginTop: 10, width: '100%', height: 54, borderRadius: 14, border: `1.5px solid ${RC.lineStrong}`, background: RC.paper, color: RC.ink, fontFamily: 'var(--font)', fontSize: 24, fontWeight: 700, letterSpacing: 8, textAlign: 'center', outline: 'none' }}
            />
            {err && <div style={{ marginTop: 12, fontFamily: 'var(--font)', fontSize: 12.5, color: '#B7341A' }}>{err}</div>}
            <div style={{ marginTop: 18 }}>
              <RingoButton disabled={busy || code.length < 6} onClick={verify}>{busy ? 'Verifying…' : 'Enable 2FA'}</RingoButton>
            </div>
          </>
        ) : (
          <>
            {err && <div style={{ marginTop: 16, fontFamily: 'var(--font)', fontSize: 12.5, color: '#B7341A' }}>{err}</div>}
            <div style={{ marginTop: 22 }}>
              <RingoButton disabled={busy} onClick={startEnroll}>{busy ? 'Starting…' : 'Set up two-factor auth'}</RingoButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
