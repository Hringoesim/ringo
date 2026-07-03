// LandingScreen — the single entry screen: orbiting world + two choices.
import { RC } from '../theme';
import { RingoButton } from '../components/Button';
import { SaturnWorld } from '../components/SaturnWorld';
import { LOGO_SRC } from '../assets';

export function LandingScreen({ onCreate, onLogin }: { onCreate: () => void; onLogin: () => void }) {
  return (
    <div
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
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
          justifyContent: 'center', padding: '64px 24px 0', textAlign: 'center',
        }}
      >
        <img
          src={LOGO_SRC}
          alt="Ringo"
          style={{ height: 36, width: 'auto', filter: 'drop-shadow(0 1px 6px rgba(255,255,255,0.55))' }}
        />

        <div style={{ marginTop: 4 }}>
          <SaturnWorld size={320} />
        </div>

        <div
          style={{
            marginTop: 4, fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800,
            color: RC.ink, letterSpacing: -1, lineHeight: 1.05, textWrap: 'balance',
          }}
        >
          One plan,<br />
          <span style={{ background: RC.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            every country.
          </span>
        </div>
        <div style={{ marginTop: 10, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.55, maxWidth: 280 }}>
          180+ countries on one eSIM. Keep your number, stay connected everywhere.
        </div>
      </div>

      <div style={{ padding: '20px 24px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <RingoButton onClick={onCreate}>Create account</RingoButton>
        <button
          onClick={onLogin}
          style={{
            width: '100%', height: 52, borderRadius: 999, cursor: 'pointer',
            border: `1.5px solid ${RC.lineStrong}`,
            background: 'rgba(255,255,255,0.72)', color: RC.inkStrong,
            fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600,

          }}
        >
          Log in
        </button>
        <div
          style={{
            marginTop: 4, textAlign: 'center', fontFamily: 'var(--font)',
            fontSize: 11.5, fontWeight: 500, color: RC.inkMute, letterSpacing: 0.1,
          }}
        >
          No SMS code needed · Cancel anytime
        </div>
      </div>
    </div>
  );
}
