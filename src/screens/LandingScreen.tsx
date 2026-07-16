// LandingScreen — the entry screen. Vivid warm gradient sky, the Ringo logo, a
// live flight globe, and the two pill CTAs: "Create account" (opens sign-up with
// Apple / Google / email) and "Log in". Fully adaptive.
import { useEffect, useState } from 'react';
import { RC } from '../theme';
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
        // Vivid warm gradient sky (light).
        background: [
          'radial-gradient(115% 75% at 50% 6%, rgba(255,169,77,0.72) 0%, rgba(255,169,77,0) 48%)',
          'radial-gradient(120% 85% at 82% 26%, rgba(255,84,132,0.48) 0%, rgba(255,84,132,0) 55%)',
          'radial-gradient(110% 90% at 12% 72%, rgba(158,102,255,0.42) 0%, rgba(158,102,255,0) 60%)',
          'linear-gradient(180deg, #FFF1DE 0%, #FFD9BF 36%, #FFBFD2 68%, #E2C4FA 100%)',
        ].join(', '),
      }}
    >
      <div
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '48px 24px 0', textAlign: 'center',
        }}
      >
        <img src={LOGO_SRC} alt="Ringo" style={{ height: 82, width: 'auto', marginTop: 34, filter: 'drop-shadow(0 6px 16px rgba(120,40,20,0.22))' }} />

        <div style={{ marginTop: 6 }}>
          <SaturnWorld size={globe} />
        </div>

        <div
          style={{
            marginTop: 6, fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800,
            letterSpacing: -1.2, lineHeight: 1.04, textWrap: 'balance',
            background: RC.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}
        >
          One plan,<br />every country.
        </div>
        <div
          style={{
            marginTop: 12, fontFamily: 'var(--font)', fontSize: 15, fontWeight: 500,
            color: '#9A5B6E', lineHeight: 1.55, maxWidth: 300,
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
              fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 600, color: '#9A5B6E',
            }}
          >
            Already have an account? <span style={{ color: RC.inkStrong, fontWeight: 700 }}>Log in</span>
          </button>
        )}
      </div>
    </div>
  );
}
