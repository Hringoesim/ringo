// LandingScreen — the entry screen. Vivid warm gradient sky, the Ringo logo, a
// live flight globe, and the two pill CTAs: "Create account" (opens sign-up with
// Apple / Google / email) and "Log in". Fully adaptive.
import { useEffect, useState } from 'react';
import { SaturnWorld } from '../components/SaturnWorld';
import { RingoButton } from '../components/Button';
import { LOGO_SRC } from '../assets';

export function LandingScreen({ onExplore, onLogin }: { onExplore: () => void; onLogin?: () => void }) {
  const [globe, setGlobe] = useState(300);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // The FULL circle always fits, on every eSIM iPhone: never wider than
      // the screen (with margin), and on short bodies (SE 667pt) it takes a
      // smaller height share so logo + headline + CTAs still fit beneath it.
      const short = h < 760;
      setCompact(short);
      setGlobe(Math.max(230, Math.min(w * 0.92, h * (short ? 0.4 : 0.5), 520)));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  return (
    <div
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
        // The approved poster look: luminous pale-peach sky (logo sits right on
        // it), a sun glow behind the globe, melting coral → pink → deep purple.
        background: [
          'radial-gradient(120% 70% at 72% 24%, rgba(255,196,110,0.6) 0%, rgba(255,196,110,0) 55%)',
          'radial-gradient(130% 90% at 12% 88%, rgba(134,82,224,0.5) 0%, rgba(134,82,224,0) 60%)',
          'linear-gradient(180deg, #FFE4BA 0%, #FFC28C 24%, #FF9678 46%, #FF7E9E 66%, #9C5BD8 100%)',
        ].join(', '),
      }}
    >
      <div
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: compact ? '16px 24px 0' : '24px 24px 0', textAlign: 'center',
        }}
      >
        {/* The REAL Ringo logo (orange→pink gradient asset, same as the site
            header) on the cream sky — exactly the website look. */}
        <div style={{ marginTop: 0, marginBottom: compact ? 2 : 6, filter: 'drop-shadow(0 4px 14px rgba(120,30,10,0.16))' }}>
          <img src={LOGO_SRC} alt="Ringo" style={{ height: compact ? 58 : 76, width: 'auto', display: 'block' }} />
        </div>

        {/* First impression: the planet springs in once, then floats forever
            over a soft grounding shadow. */}
        <div style={{ marginTop: compact ? 8 : 14, position: 'relative' }}>
          <div
            aria-hidden
            style={{
              position: 'absolute', left: '50%', bottom: -14, transform: 'translateX(-50%)',
              width: globe * 0.62, height: 26, borderRadius: '50%',
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
            marginTop: compact ? 2 : 6, fontFamily: 'var(--font-display)', fontSize: compact ? 31 : 40, fontWeight: 800,
            letterSpacing: -1.4, lineHeight: 1.02, textWrap: 'balance',
            color: '#FFFFFF', textShadow: '0 3px 20px rgba(120,30,10,0.30)',
          }}
        >
          One plan,<br />every country.
        </div>
        <div
          style={{
            marginTop: compact ? 6 : 12, fontFamily: 'var(--font)', fontSize: compact ? 14 : 15.5, fontWeight: 600,
            color: 'rgba(255,255,255,0.94)', textShadow: '0 1px 8px rgba(120,30,10,0.22)',
            lineHeight: 1.5, maxWidth: 310,
          }}
        >
          180+ countries on one eSIM. Keep your number, stay connected everywhere.
        </div>
      </div>

      <div style={{ padding: compact ? '12px 24px 20px' : '18px 24px 30px', display: 'flex', flexDirection: 'column', gap: compact ? 8 : 11 }}>
        {/* Explore first — straight into the dashboard; sign in later at a commit point. */}
        <RingoButton onClick={onExplore}>Explore Ringo</RingoButton>
        {/* Returning users need a way back in after sign-out / reinstall. */}
        {onLogin && (
          <button
            onClick={onLogin}
            className="press"
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 0',
              fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 600,
              color: 'rgba(255,255,255,0.88)', textShadow: '0 1px 6px rgba(120,30,10,0.22)',
            }}
          >
            Already have an account? <span style={{ color: '#FFFFFF', fontWeight: 800 }}>Log in</span>
          </button>
        )}
      </div>
    </div>
  );
}
