// LandingScreen — the entry screen. Vivid warm gradient sky, the Ringo logo, a
// live flight globe, and the two pill CTAs: "Create account" (opens sign-up with
// Apple / Google / email) and "Log in". Fully adaptive.
import { useEffect, useState } from 'react';
import { SaturnWorld } from '../components/SaturnWorld';
import { RingoButton } from '../components/Button';
import { LOGO_SRC } from '../assets';

export function LandingScreen({ onExplore, onLogin }: { onExplore: () => void; onLogin?: () => void }) {
  const [globe, setGlobe] = useState(320);
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setGlobe(Math.max(320, Math.min(w * 1.08, h * 0.56, 520)));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  return (
    <div
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
        // Cream sky at the top (so the orange→pink logo reads clearly, like the
        // site header) melting into the vivid sunset below the globe.
        background: [
          'radial-gradient(130% 92% at 86% 34%, rgba(255,64,116,0.5) 0%, rgba(255,64,116,0) 55%)',
          'radial-gradient(122% 96% at 8% 84%, rgba(150,88,255,0.5) 0%, rgba(150,88,255,0) 62%)',
          'linear-gradient(180deg, #FFFAF4 0%, #FFEECD 13%, #FFBE72 30%, #FF8A6E 50%, #FF86A9 70%, #C79BEE 100%)',
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
