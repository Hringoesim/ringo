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
          'radial-gradient(115% 75% at 50% 6%, rgba(255,205,138,0.60) 0%, rgba(255,205,138,0) 46%)',
          'radial-gradient(120% 85% at 82% 26%, rgba(255,132,158,0.38) 0%, rgba(255,132,158,0) 55%)',
          'radial-gradient(110% 90% at 12% 72%, rgba(193,150,255,0.32) 0%, rgba(193,150,255,0) 60%)',
          'linear-gradient(180deg, #FFF4EA 0%, #FFE7DB 36%, #FFD9E1 68%, #EFDcF4 100%)',
        ].join(', '),
      }}
    >
      <div
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '64px 24px 0', textAlign: 'center',
        }}
      >
        <img src={LOGO_SRC} alt="Ringo" style={{ height: 30, width: 'auto' }} />

        <div style={{ marginTop: 6 }}>
          <SaturnWorld size={288} />
        </div>

        <div
          style={{
            marginTop: 4, fontFamily: 'var(--font)', fontSize: 34, fontWeight: 600,
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

      <div style={{ padding: '0 24px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <RingoButton onClick={onCreate}>Create account</RingoButton>
        <button
          onClick={onLogin}
          style={{
            width: '100%', height: 52, borderRadius: 999, cursor: 'pointer',
            border: `1.5px solid ${RC.lineStrong}`, background: 'transparent', color: RC.inkStrong,
            fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600,
          }}
        >
          Log in
        </button>
      </div>
    </div>
  );
}
