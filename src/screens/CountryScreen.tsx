// CountryScreen — country detail + checkout.
import { RC } from '../theme';
import { RingoCard } from '../components/Card';
import { RingoButton } from '../components/Button';
import { BackBtn, Row, SectionTitle } from '../components/ui';
import { CO_BY_CODE, COUNTRIES, dial } from '../data/countries';
import type { OnNav } from '../navigation';

interface CountryScreenProps {
  code: string;
  onNav: OnNav;
  onBack: () => void;
  onAddCountry: (code: string) => void;
}

export function CountryScreen({ code, onNav, onBack, onAddCountry }: CountryScreenProps) {
  const c = CO_BY_CODE[code] || COUNTRIES[0];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Hero */}
      <div style={{ position: 'relative', padding: '70px 20px 30px', background: `radial-gradient(500px 220px at 80% 0%, rgba(248,80,96,0.22), transparent 70%), ${RC.bg}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <BackBtn onClick={onBack} />
          <div style={{ padding: '6px 12px', borderRadius: 999, background: RC.cream, fontFamily: 'Poppins', fontSize: 11, fontWeight: 600, color: RC.inkStrong, letterSpacing: 0.3 }}>
            {c.region}
          </div>
        </div>
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 64, height: 64, borderRadius: 20, background: RC.paper, border: `1px solid ${RC.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38,
              boxShadow: '0 14px 30px -16px rgba(208,80,0,0.30)',
            }}
          >
            {c.flag}
          </div>
          <div>
            <div style={{ fontFamily: 'Poppins', fontSize: 32, fontWeight: 600, color: RC.ink, letterSpacing: -0.6, lineHeight: 1 }}>{c.name}</div>
            <div style={{ marginTop: 4, fontFamily: 'Poppins', fontSize: 14, color: RC.inkMute }}>{c.capital} · {c.region}</div>
          </div>
        </div>
      </div>

      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 120px' }}>
        {/* big "Included" callout */}
        <RingoCard style={{ padding: 18, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: RC.grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#FFFDFB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Poppins', fontSize: 16, fontWeight: 600, color: RC.ink, letterSpacing: -0.2 }}>Included in your plan</div>
              <div style={{ marginTop: 2, fontFamily: 'Poppins', fontSize: 13, color: RC.inkMute, lineHeight: 1.5 }}>
                Use {c.name} on your existing Ringo eSIM. No new install required.
              </div>
            </div>
          </div>
        </RingoCard>

        {/* what's included */}
        <SectionTitle>What you get in {c.name}</SectionTitle>
        <RingoCard style={{ padding: 0 }}>
          <Row icon="speed" title="High-speed data" sub="5G/4G+ on local partners" />
          <Row icon="call" title="Calls & SMS" sub="Use any of your Ringo numbers" />
          <Row icon="hotspot" title="Personal hotspot" sub="Tether laptops, devices" />
          <Row icon="sos" title="Emergency calls" sub="Always free, always connected" last />
        </RingoCard>

        {/* add a local number — only in Ringo's number markets */}
        {c.numberMarket && (
          <>
            <SectionTitle style={{ marginTop: 20 }}>Want a local number too?</SectionTitle>
            <RingoCard style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: RC.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', color: RC.inkStrong, fontSize: 22 }}>
                  {c.flag}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Poppins', fontSize: 15, fontWeight: 600, color: RC.ink }}>+{dial(c.code)} number in {c.name}</div>
                  <div style={{ fontFamily: 'Poppins', fontSize: 12, color: RC.inkMute }}>£3 / month · cancel any time</div>
                </div>
                <button
                  onClick={() => onNav('addNumber', c.code)}
                  style={{
                    border: `1.5px solid ${RC.lineStrong}`, background: 'transparent',
                    padding: '8px 14px', borderRadius: 999, color: RC.inkStrong,
                    fontFamily: 'Poppins', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Add
                </button>
              </div>
            </RingoCard>
          </>
        )}
      </div>

      <div
        style={{
          padding: '14px 20px 24px', borderTop: `1px solid ${RC.line}`,
          background: 'rgba(254,248,244,0.92)', backdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        <RingoButton onClick={() => onAddCountry(c.code)}>Use Ringo in {c.name}</RingoButton>
      </div>
    </div>
  );
}
