// OnboardScreen — 3-slide value-prop carousel.
import { useState } from 'react';
import { RC } from '../theme';
import { RingoButton } from '../components/Button';
import { NUMBERS } from '../data/numbers';

type ArtKind = 'globe' | 'phones' | 'plan';

function OnboardArt({ kind }: { kind: ArtKind }) {
  if (kind === 'globe') {
    // eSIM card visual — cleaner, more product-specific than another globe
    const stamps = [
      { f: '🇯🇵', n: 'Japan',    s: 'High-speed · Active' },
      { f: '🇵🇹', n: 'Portugal', s: 'Standby · Auto-switch' },
      { f: '🇦🇪', n: 'UAE',      s: 'Standby · Auto-switch' },
      { f: '🇲🇽', n: 'Mexico',   s: 'Standby · Auto-switch' },
    ];
    return (
      <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        {/* Hero eSIM card */}
        <div
          style={{
            width: '92%', borderRadius: 22, padding: '18px 18px 16px',
            background: RC.grad, color: '#FFFDFB',
            boxShadow: '0 24px 50px -22px rgba(237,77,142,0.55)',
            position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', right: -30, top: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,253,251,0.16)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ fontFamily: 'Poppins', fontSize: 11, fontWeight: 600, opacity: 0.85, letterSpacing: 0.6, textTransform: 'uppercase' }}>Ringo · eSIM</div>
            <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
              <rect x="0.5" y="0.5" width="27" height="19" rx="3" stroke="#FFFDFB" strokeOpacity="0.6" />
              <path d="M9 4v12M19 4v12M5 8h6M5 12h6M17 8h6M17 12h6" stroke="#FFFDFB" strokeWidth="1.2" strokeOpacity="0.7" />
            </svg>
          </div>
          <div style={{ marginTop: 18, fontFamily: 'Poppins', fontSize: 22, fontWeight: 600, letterSpacing: -0.4, lineHeight: 1.1 }}>
            One eSIM.<br />180+ countries.
          </div>
        </div>

        {/* Country list */}
        <div style={{ width: '92%', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {stamps.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                background: RC.paper, border: `1px solid ${RC.line}`, borderRadius: 12,
              }}
            >
              <span style={{ fontSize: 18 }}>{s.f}</span>
              <div style={{ flex: 1, fontFamily: 'Poppins', fontSize: 13, fontWeight: 600, color: RC.ink }}>{s.n}</div>
              <div style={{ fontFamily: 'Poppins', fontSize: 11, fontWeight: 500, color: i === 0 ? RC.inkStrong : RC.inkMute }}>{s.s}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (kind === 'phones') {
    return (
      <div style={{ position: 'relative', width: '100%', height: 280 }}>
        {NUMBERS.slice(0, 3).map((n, i) => (
          <div
            key={n.id}
            style={{
              position: 'absolute', left: 30 + i * 8, top: 30 + i * 40,
              width: '82%', padding: '18px 18px',
              background: i === 0 ? RC.grad : RC.paper,
              color: i === 0 ? '#FFFDFB' : RC.ink,
              borderRadius: 22,
              border: i === 0 ? 'none' : `1px solid ${RC.line}`,
              boxShadow: i === 0 ? '0 22px 40px -18px rgba(248,80,96,0.55)' : '0 12px 28px -18px rgba(208,80,0,0.25)',
              transform: `rotate(${(i - 1) * -2}deg)`,
              zIndex: 10 - i,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>{n.flag}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.8 }}>{n.country}</div>
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.2 }}>{n.number}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  // plan
  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          width: 240, height: 240, borderRadius: '50%',
          background: RC.grad, position: 'relative',
          boxShadow: '0 30px 60px -20px rgba(248,80,96,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', color: '#FFFDFB',
        }}
      >
        <div style={{ fontFamily: 'Poppins', fontSize: 14, fontWeight: 500, opacity: 0.85 }}>per month</div>
        <div style={{ fontFamily: 'Poppins', fontSize: 80, fontWeight: 700, letterSpacing: -2, lineHeight: 1 }}>£19</div>
        <div style={{ fontFamily: 'Poppins', fontSize: 13, fontWeight: 500, opacity: 0.85, marginTop: 6 }}>Unlimited · 180+ countries</div>
      </div>
    </div>
  );
}

interface OnboardScreenProps {
  onContinue: (target?: string) => void;
  onBack: () => void;
}

export function OnboardScreen({ onContinue, onBack }: OnboardScreenProps) {
  const [step, setStep] = useState(0);
  const slides: { kicker: string; title: string; copy: string; icon: ArtKind }[] = [
    { kicker: '180+ countries', title: 'Stay connected, anywhere you land.', copy: 'One eSIM that just works in 180+ countries. No swapping, no roaming bills, no surprises.', icon: 'globe' },
    { kicker: 'Multiple numbers', title: 'Keep every number. Drop none.', copy: 'Your home number for the bank. A local one for the taxi. All on the same eSIM, switchable in a tap.', icon: 'phones' },
    { kicker: '£19 per month', title: 'Unlimited data, unlimited borders.', copy: 'One flat plan. Use it in London, then in Lisbon, then in Tokyo. We don’t care.', icon: 'plan' },
  ];
  const s = slides[step];
  const next = () => (step < slides.length - 1 ? setStep(step + 1) : onContinue('home'));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ height: 60 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px', alignItems: 'center' }}>
        <button
          onClick={() => (step > 0 ? setStep(step - 1) : onBack())}
          style={{ border: 'none', background: 'transparent', color: RC.inkMute, fontFamily: 'Poppins', fontWeight: 500, fontSize: 14, cursor: 'pointer', padding: 0 }}
        >
          ← Back
        </button>
        <div style={{ display: 'flex', gap: 6 }}>
          {slides.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 22 : 6, height: 6, borderRadius: 6,
                background: i === step ? RC.grad : RC.cream2, transition: 'width .25s',
              }}
            />
          ))}
        </div>
        <button
          onClick={() => onContinue('home')}
          style={{ border: 'none', background: 'transparent', color: RC.inkMute, fontFamily: 'Poppins', fontWeight: 500, fontSize: 14, cursor: 'pointer', padding: 0 }}
        >
          Skip
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 28px' }}>
        <OnboardArt kind={s.icon} />
      </div>

      <div style={{ padding: '0 28px 16px' }}>
        <div
          style={{
            display: 'inline-block', padding: '6px 12px', borderRadius: 999,
            background: RC.cream, color: RC.inkStrong, fontFamily: 'Poppins',
            fontSize: 12, fontWeight: 600, letterSpacing: 0.2, marginBottom: 14,
          }}
        >
          {s.kicker}
        </div>
        <div style={{ fontFamily: 'Poppins', fontSize: 30, fontWeight: 600, color: RC.ink, letterSpacing: -0.6, lineHeight: 1.15, textWrap: 'pretty' }}>
          {s.title}
        </div>
        <div style={{ marginTop: 12, fontFamily: 'Poppins', fontSize: 15, fontWeight: 400, color: RC.inkMute, lineHeight: 1.55, textWrap: 'pretty' }}>
          {s.copy}
        </div>
      </div>
      <div style={{ padding: '0 24px 36px' }}>
        <RingoButton onClick={next}>{step < slides.length - 1 ? 'Continue' : 'Create my Ringo'}</RingoButton>
      </div>
    </div>
  );
}
