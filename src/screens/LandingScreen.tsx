// LandingScreen — the entry screen, matched to ringoesim.com: a warm sunset sky,
// the white "Ringo" wordmark, the site's headline + copy, and an Apple-first CTA.
import { useState } from 'react';
import { SaturnWorld } from '../components/SaturnWorld';
import { RingoWordmark } from '../components/Wordmark';
import { haptic } from '../lib/haptics';

export function LandingScreen({
  onApple,
  onCreate,
  onLogin,
}: {
  onApple: () => void | Promise<void>;
  onCreate: () => void;
  onLogin: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const runApple = async () => {
    if (busy) return;
    setErr('');
    haptic('medium');
    setBusy(true);
    try {
      await onApple();
    } catch (e) {
      setErr(e instanceof Error && e.message ? e.message : 'Apple sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
        // Warm sunset sky — matches the ringoesim.com hero.
        background: [
          'radial-gradient(140% 120% at 12% 0%, rgba(176,38,28,0.55) 0%, rgba(176,38,28,0) 55%)',
          'radial-gradient(130% 110% at 100% 100%, rgba(255,190,92,0.50) 0%, rgba(255,190,92,0) 60%)',
          'linear-gradient(155deg, #EC5B2E 0%, #F0733A 42%, #F59A4B 100%)',
        ].join(', '),
      }}
    >
      <div
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '52px 26px 0', textAlign: 'center',
        }}
      >
        {/* Approved logo — white on the sunset, exactly like the site */}
        <RingoWordmark size={30} light />

        <div style={{ marginTop: 10 }}>
          <SaturnWorld size={288} />
        </div>

        <div
          style={{
            marginTop: 10, fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 800,
            color: '#FFFFFF', letterSpacing: -1.4, lineHeight: 1.02, textWrap: 'balance',
            textShadow: '0 2px 30px rgba(0,0,0,0.18)',
          }}
        >
          One plan<br />anywhere.
        </div>
        <div
          style={{
            marginTop: 14, fontFamily: 'var(--font)', fontSize: 15, fontWeight: 500,
            color: 'rgba(255,255,255,0.88)', lineHeight: 1.55, maxWidth: 300,
          }}
        >
          Keep your phone number live in 180+ countries. No roaming, no SIM swapping.
        </div>
      </div>

      <div style={{ padding: '20px 26px 30px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* PRIMARY — Sign up with Apple */}
        <button
          className="press"
          disabled={busy}
          onClick={runApple}
          style={{
            width: '100%', height: 56, borderRadius: 16, border: 'none',
            background: '#000000', color: '#FFFFFF',
            fontFamily: 'var(--font)', fontSize: 16, fontWeight: 600, letterSpacing: -0.1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: busy ? 'default' : 'pointer', boxShadow: '0 10px 26px -12px rgba(0,0,0,0.5)',
          }}
        >
          {busy ? (
            'Connecting…'
          ) : (
            <>
              <svg width="15" height="18" viewBox="0 0 384 512" fill="#FFFFFF" style={{ transform: 'translateY(-1px)' }} aria-hidden="true">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-20.6-29.4-51.7-45.6-92.8-48.8-39-3-81.5 22.9-97 22.9-16.4 0-54-22.4-83.2-21.9-42.9.6-82.5 25-104.6 63.4-44.6 77.4-11.4 191.8 31.9 254.6 21.2 30.8 46.3 65.3 79.5 64.1 31.9-1.3 43.9-20.7 82.5-20.7 38.5 0 49.4 20.7 83.2 20 34.4-.6 56.1-31.1 77-62 24.3-35.6 34.3-70.1 34.8-71.9-.7-.3-66.8-25.6-67.5-101.6zM256.3 89.5c17.4-21.1 29.1-50.4 25.9-79.5-25 1-55.3 16.6-73.3 37.7-16.1 18.7-30.2 48.6-26.4 77.2 27.9 2.2 56.4-14.2 73.8-35.4z" />
              </svg>
              Sign up with Apple
            </>
          )}
        </button>

        {/* SECONDARY — email */}
        <button
          className="press"
          onClick={onCreate}
          style={{
            width: '100%', height: 56, borderRadius: 16, cursor: 'pointer', border: 'none',
            background: 'rgba(255,255,255,0.95)', color: '#3A1605',
            fontFamily: 'var(--font)', fontSize: 16, fontWeight: 600, letterSpacing: -0.1,
          }}
        >
          Continue with email
        </button>

        {/* TERTIARY — log in */}
        <button
          onClick={onLogin}
          style={{
            border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 0',
            fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 600, color: '#FFFFFF',
          }}
        >
          Log in
        </button>

        {err && (
          <div
            style={{
              marginTop: 2, padding: '10px 12px', borderRadius: 12, textAlign: 'center',
              background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.25)',
              fontFamily: 'var(--font)', fontSize: 12, fontWeight: 500, color: '#FFFFFF', lineHeight: 1.4,
            }}
          >
            {err}
          </div>
        )}

        <div
          style={{
            marginTop: 2, textAlign: 'center', fontFamily: 'var(--font)',
            fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,0.72)', letterSpacing: 0.1,
          }}
        >
          No SMS code needed · Cancel anytime
        </div>
      </div>
    </div>
  );
}
