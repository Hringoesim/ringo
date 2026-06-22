// SplashScreen — modern travel-app splash: full-bleed gradient hero, big
// editorial type, floating glass destination cards, social proof, sticky CTA.
import { RC } from '../theme';
import { RingoButton } from '../components/Button';

export type SplashTarget = 'signup' | 'signin' | 'onboard';

export function SplashScreen({ onContinue }: { onContinue: (t: SplashTarget) => void }) {
  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: RC.bg }}>
      {/* Full-bleed gradient sky */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '62%',
          background: `
            radial-gradient(120% 80% at 50% 0%, rgba(255,235,210,0.9), transparent 60%),
            linear-gradient(180deg, #F08038 0%, #F25F77 55%, #ED4D8E 100%)
          `,
        }}
      />
      {/* Soft sun */}
      <div
        style={{
          position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)',
          width: 340, height: 340, borderRadius: '50%',
          background: 'radial-gradient(circle at 50% 50%, rgba(255,253,235,0.55), rgba(255,253,235,0) 65%)',
          filter: 'blur(2px)',
        }}
      />

      {/* Top bar: logo + tiny status */}
      <div style={{ position: 'relative', zIndex: 2, padding: '58px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/ringo-logo.png" alt="Ringo" style={{ width: 34, height: 34, borderRadius: '50%', boxShadow: '0 4px 14px -6px rgba(0,0,0,0.25)' }} />
          <span style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 18, color: '#FFFDFB', letterSpacing: -0.3 }}>Ringo</span>
        </div>
        <div
          style={{
            padding: '5px 10px', borderRadius: 999,
            background: 'rgba(255,253,251,0.22)', backdropFilter: 'blur(10px)',
            fontFamily: 'Poppins', fontSize: 11, fontWeight: 600, color: '#FFFDFB', letterSpacing: 0.4,
          }}
        >
          180+ COUNTRIES
        </div>
      </div>

      {/* Editorial hero copy */}
      <div style={{ position: 'relative', zIndex: 2, padding: '28px 22px 0' }}>
        <div style={{ fontFamily: 'Poppins', fontSize: 13, fontWeight: 600, color: 'rgba(255,253,251,0.85)', letterSpacing: 1.4, textTransform: 'uppercase' }}>
          Travel · Connected
        </div>
        <div style={{ marginTop: 10, fontFamily: 'Poppins', fontSize: 44, fontWeight: 600, color: '#FFFDFB', letterSpacing: -1.2, lineHeight: 0.98, textWrap: 'balance' }}>
          One plan,<br />every country.
        </div>
        <div style={{ marginTop: 10, fontFamily: 'Poppins', fontSize: 14, fontWeight: 400, color: 'rgba(255,253,251,0.92)', lineHeight: 1.55, maxWidth: 280 }}>
          Land anywhere. Stay connected. No SIM swapping, no roaming bills.
        </div>
      </div>

      {/* Glass destination card stack */}
      <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', alignItems: 'flex-end', padding: '0 22px 0' }}>
        <div style={{ position: 'relative', width: '100%', height: 170 }}>
          {[
            { f: '🇯🇵', n: 'Tokyo',  m: 'Connected', x: 0,  y: 0,   w: 78 },
            { f: '🇵🇹', n: 'Lisbon', m: 'Auto',      x: 46, y: 54,  w: 74 },
            { f: '🇲🇽', n: 'CDMX',   m: 'Auto',      x: 72, y: 108, w: 70 },
          ].map((c, i) => (
            <div
              key={i}
              style={{
                position: 'absolute', left: `${c.x}%`, top: c.y,
                transform: `translateX(-${c.w / 2}%)`,
                padding: '10px 14px', borderRadius: 14,
                background: 'rgba(255,253,251,0.9)',
                backdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255,253,251,0.6)',
                boxShadow: '0 14px 30px -14px rgba(0,0,0,0.25)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <span style={{ fontSize: 20 }}>{c.f}</span>
              <div>
                <div style={{ fontFamily: 'Poppins', fontSize: 13, fontWeight: 600, color: RC.ink, letterSpacing: -0.2 }}>{c.n}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: i === 0 ? '#1F8A5B' : RC.inkStrong }} />
                  <span style={{ fontFamily: 'Poppins', fontSize: 10.5, fontWeight: 500, color: RC.inkMute }}>{c.m}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom sheet — sticky CTA card on cream */}
      <div
        style={{
          position: 'relative', zIndex: 3, marginTop: 24, background: RC.bg,
          borderTopLeftRadius: 32, borderTopRightRadius: 32,
          padding: '22px 24px 28px',
          boxShadow: '0 -20px 40px -20px rgba(0,0,0,0.1)',
        }}
      >
        {/* social proof */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ display: 'flex' }}>
            {['#F08038', '#F25F77', '#ED4D8E'].map((c, i) => (
              <div
                key={i}
                style={{
                  width: 24, height: 24, borderRadius: '50%', background: c,
                  marginLeft: i === 0 ? 0 : -8, border: '2px solid ' + RC.bg,
                  fontFamily: 'Poppins', fontSize: 10, fontWeight: 700, color: '#FFFDFB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {['M', 'J', 'A'][i]}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, fontFamily: 'Poppins', fontSize: 12, color: RC.inkMute, fontWeight: 500, lineHeight: 1.4 }}>
            <strong style={{ color: RC.ink, fontWeight: 600 }}>4.8 ★</strong> · 120,000+ travelers · App Store Editor’s Choice
          </div>
        </div>

        <RingoButton onClick={() => onContinue('signup')}>Get started — it’s free</RingoButton>
        <button
          onClick={() => onContinue('signin')}
          style={{
            marginTop: 6, width: '100%', height: 48, border: 'none', background: 'transparent',
            cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 500, fontSize: 14, color: RC.inkMute,
          }}
        >
          I already have an account
        </button>
      </div>
    </div>
  );
}
