// LandingScreen — the single entry screen: orbiting world + two choices.
import { RC } from '../theme';
import { RingoButton } from '../components/Button';
import { SaturnWorld } from '../components/SaturnWorld';
import { LOGO_SRC } from '../assets';

export function LandingScreen({ onCreate, onLogin }: { onCreate: () => void; onLogin: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
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
            marginTop: 4, fontFamily: 'Poppins', fontSize: 34, fontWeight: 600,
            color: RC.ink, letterSpacing: -1, lineHeight: 1.05, textWrap: 'balance',
          }}
        >
          One plan,<br />
          <span style={{ background: RC.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            every country.
          </span>
        </div>
        <div style={{ marginTop: 10, fontFamily: 'Poppins', fontSize: 14, color: RC.inkMute, lineHeight: 1.55, maxWidth: 280 }}>
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
            fontFamily: 'Poppins', fontSize: 15, fontWeight: 600,
          }}
        >
          Log in
        </button>
      </div>
    </div>
  );
}
