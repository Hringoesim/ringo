// AddNumberScreen — allocate a fresh Ringo MSISDN from the DID inventory.
// Limited to Ringo's number markets (UK launch + EU).
import { useState } from 'react';
import { RC } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { RingoCard } from '../components/Card';
import { BackBtn, SectionTitle } from '../components/ui';
import { CO_BY_CODE, NUMBER_MARKETS, dial } from '../data/countries';

function sampleNumbers(code: string): string[] {
  const seeds: Record<string, string[]> = {
    GB: ['7700 900123', '7700 900456', '7700 900789'],
    IE: ['83 123 4567', '85 234 5678', '86 345 6789'],
    ES: ['612 34 56 78', '622 45 67 89', '633 56 78 90'],
    DE: ['151 2345 6789', '160 3456 7890', '170 4567 8901'],
    NL: ['6 1234 5678', '6 2345 6789', '6 3456 7890'],
  };
  return seeds[code] || ['0000 000000', '0000 000111', '0000 000222'];
}

interface AddNumberScreenProps {
  preselect?: string;
  onBack: () => void;
  onContinue: (code: string) => void;
}

export function AddNumberScreen({ preselect, onBack, onContinue }: AddNumberScreenProps) {
  const initial = preselect && CO_BY_CODE[preselect]?.numberMarket ? preselect : 'GB';
  const [code, setCode] = useState(initial);
  const [chosen, setChosen] = useState<string | null>(null);
  const c = CO_BY_CODE[code];
  const selectCountry = (next: string) => {
    setCode(next);
    setChosen(null);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="New Ringo number" leading={<BackBtn onClick={onBack} />} />
      <div style={{ padding: '0 20px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: RC.ink, letterSpacing: -0.5, lineHeight: 1.15, textWrap: 'pretty' }}>
          Pick a market for your new number.
        </div>
        <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 13, color: RC.inkMute, lineHeight: 1.5 }}>
          Allocated instantly from Ringo’s number inventory.
        </div>
      </div>

      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 130px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {NUMBER_MARKETS.map((co) => {
            const sel = co.code === code;
            return (
              <div
                key={co.code}
                onClick={() => selectCountry(co.code)}
                style={{
                  padding: 14, borderRadius: 18,
                  background: sel ? RC.gradSoft : RC.paper,
                  border: `1.5px solid ${sel ? 'transparent' : RC.line}`,
                  outline: sel ? `1.5px solid ${RC.inkStrong}` : 'none',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 26 }}>{co.flag}</div>
                <div style={{ marginTop: 8, fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: RC.ink }}>{co.name}</div>
                <div style={{ fontFamily: 'var(--font)', fontSize: 11, color: RC.inkMute }}>+{dial(co.code)} · £3/mo</div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionTitle>Available numbers in {c.name}</SectionTitle>
          <RingoCard style={{ padding: '4px 0' }}>
            {sampleNumbers(code).map((s, idx) => {
              const num = `+${dial(code)} ${s}`;
              const sel = chosen === num;
              return (
                <div
                  key={idx}
                  className="press"
                  onClick={() => setChosen(num)}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '14px 16px', cursor: 'pointer',
                    background: sel ? RC.gradSoft : 'transparent',
                    borderBottom: idx === 2 ? 'none' : `1px solid ${RC.line}`,
                  }}
                >
                  <div style={{ flex: 1, fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, color: RC.ink, letterSpacing: -0.2 }}>{num}</div>
                  {sel ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600, color: RC.inkStrong }}>
                      <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill={RC.inkStrong} /><path d="M4.5 8.2l2.2 2.2 4.8-5" stroke="#FFFDFB" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      Selected
                    </span>
                  ) : (
                    <span style={{ fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600, color: RC.inkMute }}>Tap to choose</span>
                  )}
                </div>
              );
            })}
          </RingoCard>
        </div>
      </div>

      <div
        style={{
          padding: '14px 20px 24px', borderTop: `1px solid ${RC.line}`,
          background: RC.glass, backdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: 'var(--font)', fontSize: 13, color: RC.inkMute, fontWeight: 500 }}>
            {chosen ? chosen : `${c.flag} ${c.name} · monthly`}
          </div>
          <div style={{ fontFamily: 'var(--font)', fontSize: 18, fontWeight: 600, color: RC.ink }}>£3/mo</div>
        </div>
        <RingoButton onClick={() => onContinue(code)}>
          {chosen ? `Claim ${chosen}` : `Claim my ${c.name} number`}
        </RingoButton>
      </div>
    </div>
  );
}
