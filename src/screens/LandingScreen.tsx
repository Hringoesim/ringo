// LandingScreen — the welcome screen, shown until the person signs in or
// chooses to browse first. The Ringo logo on the sunset sky, the flight
// globe, and the ways in: Sign in with Apple, Google, or an email code
// (owner 2026-09-18: the sign-in options must be the first thing seen).
// Signing in and signing up are the same tap: the first sign-in creates
// the account. Browsing without an account stays one tap away.
import { useEffect, useState, useLayoutEffect, useRef } from 'react';
import { SaturnWorld } from '../components/SaturnWorld';
import { AuthButtons } from '../components/AuthButtons';
import { LOGO_SRC } from '../assets';
import { COLUMN_MAX } from '../theme';

export function LandingScreen({
  onExplore, onSignedIn, onEmail,
}: { onExplore: () => void; onSignedIn: () => void; onEmail: () => void }) {
  const [globe, setGlobe] = useState(220);
  const [compact, setCompact] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // If the hero overflows its box, shrink the globe by the overflow; once
  // the globe is at its floor, drop to compact chrome rather than clip text.
  useLayoutEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const FLOOR = 120;
    const fit = () => {
      const over = el.scrollHeight - el.clientHeight;
      if (over <= 1) return;
      setGlobe((g) => {
        const next = Math.max(FLOOR, g - over - 4);
        if (next === FLOOR && g === FLOOR) setCompact(true);
        return next;
      });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [globe, compact]);

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const short = h < 800;
      setCompact(short);
      // The sign-in block below needs about 260pt, so the globe takes less.
      setGlobe(Math.max(140, Math.min(w * 0.6, h * (short ? 0.2 : 0.26), 280)));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  return (
    <div
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
        background: [
          'radial-gradient(120% 70% at 72% 22%, rgba(255,196,110,0.62) 0%, rgba(255,196,110,0) 55%)',
          'radial-gradient(120% 80% at 14% 92%, rgba(183,54,226,0.20) 0%, rgba(183,54,226,0) 62%)',
          'linear-gradient(180deg, #FFE3B8 0%, #FFB877 17%, #FF8A5B 35%, #F2585F 55%, #D33C8E 74%, #9B57DC 91%, #7A44C4 100%)',
        ].join(', '),
      }}
    >
      <div
        ref={heroRef}
        style={{
          flex: 1, minHeight: 0, overflow: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: compact ? '12px 24px 0' : '20px 24px 0', textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: compact ? 2 : 6, filter: 'drop-shadow(0 4px 14px rgba(120,30,10,0.16))' }}>
          <img src={LOGO_SRC} alt="Ringo" style={{ height: compact ? 50 : 64, width: 'auto', display: 'block' }} />
        </div>

        <div style={{ marginTop: compact ? 6 : 10, position: 'relative' }}>
          <div
            aria-hidden
            style={{
              position: 'absolute', left: '50%', bottom: -12, transform: 'translateX(-50%)',
              width: globe * 0.62, height: 22, borderRadius: '50%',
              background: 'radial-gradient(50% 50% at 50% 50%, rgba(88,24,72,0.30) 0%, rgba(88,24,72,0) 70%)',
              animation: 'ringoGlobeFloat 6s ease-in-out infinite reverse',
            }}
          />
          <div style={{ animation: 'ringoGlobeIn 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
            <div style={{ animation: 'ringoGlobeFloat 6s ease-in-out infinite' }}>
              <SaturnWorld size={globe} />
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: compact ? 2 : 8, fontFamily: 'var(--font-display)', fontSize: compact ? 28 : 34, fontWeight: 800,
            letterSpacing: -1.2, lineHeight: 1.04, textWrap: 'balance',
            color: '#FFFFFF', textShadow: '0 3px 20px rgba(120,30,10,0.30)',
          }}
        >
          Data for every trip.
        </div>
        <div
          style={{
            marginTop: compact ? 4 : 8, fontFamily: 'var(--font)', fontSize: compact ? 13.5 : 15, fontWeight: 600,
            color: 'rgba(255,255,255,0.94)', textShadow: '0 1px 8px rgba(120,30,10,0.22)',
            lineHeight: 1.45, maxWidth: 300,
          }}
        >
          eSIMs for 196 countries and every region. Install in a tap, connected when you land.
        </div>
      </div>

      <div style={{ padding: compact ? '8px 20px 16px' : '12px 20px 24px', display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: COLUMN_MAX, alignSelf: 'center' }}>
        <div style={{ textAlign: 'center', fontFamily: 'var(--font)', fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 6px rgba(120,30,10,0.22)' }}>
          Sign in or create an account
        </div>
        <AuthButtons onSignedIn={onSignedIn} onEmail={onEmail} onDark />
        <button
          onClick={onExplore}
          className="press"
          style={{
            border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px 0 0',
            fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700,
            color: '#FFFFFF', textShadow: '0 1px 6px rgba(120,30,10,0.22)',
          }}
        >
          Browse plans first
        </button>
      </div>
    </div>
  );
}
