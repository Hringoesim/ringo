// AddNumberScreen — claim a fresh local number in a chosen country.
import { useState } from 'react';
import { RC } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { RingoCard } from '../components/Card';
import { BackBtn, SectionTitle } from '../components/ui';
import { CO_BY_CODE, COUNTRIES, dial } from '../data/countries';

function randNum(code: string, i: number): string {
  const seeds: Record<string, string[]> = {
    JP: ['80 1234 5678', '90 4567 8910', '70 2345 6789'],
    PT: ['912 345 678', '933 456 789', '961 234 567'],
    AE: ['50 123 4567', '55 234 5678', '58 345 6789'],
    MX: ['55 1234 5678', '81 2345 6789', '33 3456 7890'],
    TH: ['89 123 4567', '81 234 5678', '98 345 6789'],
    BE: ['471 23 45 67', '485 12 34 56', '472 89 12 34'],
    US: ['415 555 0123', '646 555 0188', '310 555 0142'],
    SG: ['8123 4567', '9234 5678', '8345 6789'],
  };
  return (seeds[code] || ['000 000 0000'])[i - 1];
}

interface AddNumberScreenProps {
  preselect?: string;
  onBack: () => void;
  onContinue: (code: string) => void;
}

export function AddNumberScreen({ preselect, onBack, onContinue }: AddNumberScreenProps) {
  const [code, setCode] = useState(preselect || 'JP');
  const c = CO_BY_CODE[code];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Add a number" leading={<BackBtn onClick={onBack} />} />
      <div style={{ padding: '0 20px' }}>
        <div style={{ fontFamily: 'Poppins', fontSize: 28, fontWeight: 600, color: RC.ink, letterSpacing: -0.5, lineHeight: 1.15, textWrap: 'pretty' }}>
          Pick a country for your new number.
        </div>
      </div>

      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 130px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {COUNTRIES.map((co) => {
            const sel = co.code === code;
            return (
              <div
                key={co.code}
                onClick={() => setCode(co.code)}
                style={{
                  padding: 14, borderRadius: 18,
                  background: sel ? RC.gradSoft : RC.paper,
                  border: `1.5px solid ${sel ? 'transparent' : RC.line}`,
                  outline: sel ? `1.5px solid ${RC.inkStrong}` : 'none',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 26 }}>{co.flag}</div>
                <div style={{ marginTop: 8, fontFamily: 'Poppins', fontSize: 14, fontWeight: 600, color: RC.ink }}>{co.name}</div>
                <div style={{ fontFamily: 'Poppins', fontSize: 11, color: RC.inkMute }}>+{dial(co.code)} · ${co.tier === 'A' ? 3 : 2}/mo</div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionTitle>Sample numbers in {c.name}</SectionTitle>
          <RingoCard style={{ padding: '4px 0' }}>
            {[1, 2, 3].map((i, idx) => {
              const num = `+${dial(code)} ${randNum(code, i)}`;
              return (
                <div
                  key={i}
                  style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: idx === 2 ? 'none' : `1px solid ${RC.line}` }}
                >
                  <div style={{ flex: 1, fontFamily: 'Poppins', fontSize: 15, fontWeight: 600, color: RC.ink, letterSpacing: -0.2 }}>{num}</div>
                  <div style={{ fontFamily: 'Poppins', fontSize: 12, fontWeight: 600, color: RC.inkStrong }}>Tap to claim</div>
                </div>
              );
            })}
          </RingoCard>
        </div>
      </div>

      <div
        style={{
          padding: '14px 20px 24px', borderTop: `1px solid ${RC.line}`,
          background: 'rgba(254,248,244,0.92)', backdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: 'Poppins', fontSize: 13, color: RC.inkMute, fontWeight: 500 }}>{c.flag} {c.name} · monthly</div>
          <div style={{ fontFamily: 'Poppins', fontSize: 18, fontWeight: 600, color: RC.ink }}>${c.tier === 'A' ? 3 : 2}/mo</div>
        </div>
        <RingoButton onClick={() => onContinue(code)}>Claim my {c.name} number</RingoButton>
      </div>
    </div>
  );
}
