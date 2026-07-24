// LandingScreen — the entry screen. Vivid warm gradient sky, the Ringo logo, a
// live flight globe, and the two pill CTAs: "Create account" (opens sign-up with
// Apple / Google / email) and "Log in". Fully adaptive.
import { useEffect, useState } from 'react';
import { SaturnWorld } from '../components/SaturnWorld';
import { RingoButton } from '../components/Button';
import { LOGO_SRC } from '../assets';

export function LandingScreen({ onExplore, onLogin }: { onExplore: () => void; onLogin?: () => void }) {
  const [globe, setGlobe] = useState(300);
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // The FULL circle always fits: never wider than the screen (with margin),
      // never taller than half the height — adapts from SE to Pro Max to iPad.
      setGlobe(Math.max(240, Math.min(w * 0.92, h * 0.5, 520)));
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
          justifyContent: 'center', padding: '48px 24px 0', textAlign: 'center',
        }}
      >
        {/* The REAL Ringo logo (orange→pink gradient asset, same as the site
            header) on the cream sky — exactly the website look. */}
        <div style={{ marginTop: 8, filter: 'drop-shadow(0 4px 14px rgba(120,30,10,0.16))' }}>
          <img src={LOGO_SRC} alt="Ringo" style={{ height: 58, width: 'auto', display: 'block' }} />
        </div>

        <div style={{ marginTop: 14 }}>
          <SaturnWorld size={globe} />
        </div>

        <div
          style={{
            marginTop: 6, fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 800,
            letterSpacing: -1.4, lineHeight: 1.02, textWrap: 'balance',
            color: '#FFFFFF', textShadow: '0 3px 20px rgba(120,30,10,0.30)',
          }}
        >
          One plan,<br />every country.
        </div>
        <div
          style={{
            marginTop: 12, fontFamily: 'var(--font)', fontSize: 15.5, fontWeight: 600,
            color: 'rgba(255,255,255,0.94)', textShadow: '0 1px 8px rgba(120,30,10,0.22)',
            lineHeight: 1.55, maxWidth: 310,
          }}
        >
          180+ countries on one eSIM. Keep your number, stay connected everywhere.
        </div>
      </div>

      <div style={{ padding: '18px 24px 30px', display: 'flex', flexDirection: 'column', gap: 11 }}>
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
