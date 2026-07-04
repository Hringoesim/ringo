// LandingScreen — the entry screen. Vivid warm gradient sky, the Ringo logo, a
// live flight globe, and the two pill CTAs: "Create account" (opens sign-up with
// Apple / Google / email) and "Log in". Fully adaptive.
import { useEffect, useState } from 'react';
import { RC } from '../theme';
import { SaturnWorld } from '../components/SaturnWorld';
import { RingoButton } from '../components/Button';
import { LOGO_SRC } from '../assets';

export function LandingScreen({ onExplore, onCreate, onLogin }: { onExplore: () => void; onCreate: () => void; onLogin: () => void }) {
  const [globe, setGlobe] = useState(320);
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setGlobe(Math.max(280, Math.min(w * 0.9, h * 0.46, 430)));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  return (
    <div
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
        // Vivid warm gradient sky.
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
        <img src={LOGO_SRC} alt="Ringo" style={{ height: 52, width: 'auto', marginTop: 30 }} />

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

      <div style={{ padding: '18px 24px 28px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {/* Explore first — get straight into the dashboard, sign in later */}
        <RingoButton onClick={onExplore}>Explore Ringo</RingoButton>
        <button
          onClick={onLogin}
          className="press"
          style={{
            width: '100%', height: 54, borderRadius: 999, cursor: 'pointer', border: 'none',
            background: 'rgba(255,255,255,0.78)', color: RC.inkStrong,
            fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600,
          }}
        >
          Log in
        </button>
        <button
          onClick={onCreate}
          style={{
            border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 0',
            fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 600, color: '#9A5B6E',
          }}
        >
          New to Ringo? <span style={{ color: RC.inkStrong, fontWeight: 700 }}>Create account</span>
        </button>
      </div>
    </div>
  );
}
