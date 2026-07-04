// PortNumberScreen — Mobile Number Portability (MNP). Routed server-side via the
// 1GLOBAL Connect API. Donor-led markets (UK) need a PAC from the losing carrier;
// recipient-led EU markets (IE/ES/DE/NL) do not. SLAs come from the country MNP
// profile (Workstream A, p9–13).
import { useState } from 'react';
import { RC } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn } from '../components/ui';
import { CO_BY_CODE, NUMBER_MARKETS } from '../data/countries';
import type { PortFormPayload } from '../store/store';

const CARRIERS: Record<string, string[]> = {
  GB: ['EE', 'O2', 'Vodafone', 'Three', 'Giffgaff', 'BT Mobile', 'Other'],
  IE: ['Three', 'Vodafone', 'Eir', 'Tesco Mobile', 'Other'],
  ES: ['Movistar', 'Vodafone', 'Orange', 'Yoigo', 'Other'],
  DE: ['Telekom', 'Vodafone', 'O2', '1&1', 'Other'],
  NL: ['KPN', 'Vodafone', 'Odido', 'Other'],
  BE: ['Proximus', 'Orange', 'BASE', 'Telenet', 'Mobile Vikings', 'Other'],
};

interface PortNumberScreenProps {
  onBack: () => void;
  onContinue: (payload: PortFormPayload) => void;
}

export function PortNumberScreen({ onBack, onContinue }: PortNumberScreenProps) {
  const [step, setStep] = useState(0);
  const [country, setCountry] = useState('GB');
  const [num, setNum] = useState('');
  const [carrier, setCarrier] = useState('');
  const [pac, setPac] = useState('');

  const co = CO_BY_CODE[country];
  const mnp = co?.mnp;
  const needsPac = !!mnp?.needsPac;
  const carriers = CARRIERS[country] || ['Other'];

  // Last step is the PAC entry (donor-led) or a confirmation (recipient-led).
  const canNext =
    (step === 0 && num.replace(/\D/g, '').length >= 6) ||
    (step === 1 && !!carrier) ||
    (step === 2 && (!needsPac || pac.length >= 3));

  const submit = () =>
    onContinue({ number: `+${co.dial} ${num.replace(/^\+?\d{1,3}\s?/, '')}`.trim(), country, currentProvider: carrier, pac: needsPac ? pac : undefined });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Port your number" leading={<BackBtn onClick={step > 0 ? () => setStep(step - 1) : onBack} />} />
      <div style={{ padding: '0 20px' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ flex: 1, height: 5, borderRadius: 5, background: i <= step ? RC.grad : RC.cream2, transition: 'background .25s' }} />
          ))}
        </div>

        {step === 0 && (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: RC.ink, letterSpacing: -0.5, lineHeight: 1.15, textWrap: 'pretty' }}>
              Which number to port
            </div>
            <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
              We keep your number, your contacts and your iMessage. Number portability is regulated per country.
            </div>
            <div style={{ marginTop: 22 }}>
              <div style={{ fontFamily: 'var(--font)', fontSize: 11, fontWeight: 600, color: RC.inkMute, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>
                Number market
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {NUMBER_MARKETS.map((m) => {
                  const sel = m.code === country;
                  return (
                    <div
                      key={m.code}
                      onClick={() => { setCountry(m.code); setCarrier(''); }}
                      style={{
                        padding: '8px 12px', borderRadius: 999, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: sel ? RC.gradSoft : RC.paper,
                        border: `1.5px solid ${sel ? 'transparent' : RC.line}`,
                        outline: sel ? `1.5px solid ${RC.inkStrong}` : 'none',
                        fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: RC.ink,
                      }}
                    >
                      <span>{m.flag}</span> {m.code}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontFamily: 'var(--font)', fontSize: 11, fontWeight: 600, color: RC.inkMute, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>
                Phone number
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', height: 56, borderRadius: 14, background: RC.paper, border: `1.5px solid ${num ? RC.inkStrong : RC.line}` }}>
                <span style={{ fontFamily: 'var(--font)', fontSize: 18, fontWeight: 600, color: RC.inkMute }}>+{co.dial}</span>
                <input
                  value={num}
                  onChange={(e) => setNum(e.target.value)}
                  placeholder="7700 900123"
                  inputMode="tel"
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: 'var(--font)', fontSize: 18, fontWeight: 600, color: RC.ink, letterSpacing: -0.2 }}
                />
              </div>
              <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: RC.cream, fontFamily: 'var(--font)', fontSize: 11.5, color: RC.ink, lineHeight: 1.5 }}>
                <strong style={{ color: RC.inkStrong, fontWeight: 600 }}>{mnp?.regulator}</strong> · {mnp?.flow} · {mnp?.sla}
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: RC.ink, letterSpacing: -0.5, lineHeight: 1.15 }}>
              Who’s your current carrier?
            </div>
            <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
              Pick the network that owns this number in {co.name} today.
            </div>
            <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {carriers.map((c) => {
                const sel = c === carrier;
                return (
                  <div
                    key={c}
                    onClick={() => setCarrier(c)}
                    style={{
                      padding: '14px 12px', borderRadius: 14, textAlign: 'center', cursor: 'pointer',
                      background: sel ? RC.gradSoft : RC.paper,
                      border: `1.5px solid ${sel ? 'transparent' : RC.line}`,
                      outline: sel ? `1.5px solid ${RC.inkStrong}` : 'none',
                      fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: RC.ink,
                    }}
                  >
                    {c}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && needsPac && (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: RC.ink, letterSpacing: -0.5, lineHeight: 1.15, textWrap: 'pretty' }}>
              Enter your PAC code.
            </div>
            <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
              Text <strong style={{ color: RC.ink, fontWeight: 600 }}>PAC</strong> to 65075 from your {carrier || 'current'} phone, or ask in their app. {co.name} porting is {mnp?.flow}, regulated by {mnp?.regulator}.
            </div>
            <div style={{ marginTop: 22 }}>
              <div style={{ fontFamily: 'var(--font)', fontSize: 11, fontWeight: 600, color: RC.inkMute, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>
                Porting Authorisation Code (PAC)
              </div>
              <input
                value={pac}
                onChange={(e) => setPac(e.target.value.toUpperCase())}
                placeholder="ABC123456789"
                style={{
                  width: '100%', height: 56, padding: '0 14px',
                  border: `1.5px solid ${pac ? RC.inkStrong : RC.line}`, borderRadius: 14,
                  background: RC.paper, outline: 'none',
                  fontFamily: 'var(--font)', fontSize: 18, fontWeight: 600, color: RC.ink,
                  letterSpacing: 3, textAlign: 'center', boxSizing: 'border-box',
                }}
              />
              <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: RC.cream, fontFamily: 'var(--font)', fontSize: 12, color: RC.ink, lineHeight: 1.55 }}>
                <strong style={{ color: RC.inkStrong, fontWeight: 600 }}>What happens next:</strong> we submit your PAC to {carrier || 'your carrier'} via the 1GLOBAL Connect API. Your old SIM keeps working until the switch — {mnp?.sla.toLowerCase()}.
              </div>
            </div>
          </>
        )}

        {step === 2 && !needsPac && (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: RC.ink, letterSpacing: -0.5, lineHeight: 1.15, textWrap: 'pretty' }}>
              Confirm your port.
            </div>
            <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
              {co.name} is <strong style={{ color: RC.ink, fontWeight: 600 }}>{mnp?.flow}</strong> — no PAC needed. As your new provider, Ringo initiates the port with {co.mnp?.regulator} on your behalf.
            </div>
            <div style={{ marginTop: 18, padding: 16, borderRadius: 16, background: RC.paper, border: `1px solid ${RC.line}` }}>
              {[
                ['Number', `+${co.dial} ${num}`],
                ['Current carrier', carrier],
                ['Market', `${co.flag} ${co.name}`],
                ['Timing', mnp?.sla || ''],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontFamily: 'var(--font)', fontSize: 13 }}>
                  <span style={{ color: RC.inkMute }}>{k}</span>
                  <span style={{ color: RC.ink, fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{v}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ flex: 1 }} />
      <div
        style={{
          padding: '14px 20px 24px', borderTop: `1px solid ${RC.line}`,
          background: RC.glass,
        }}
      >
        <RingoButton disabled={!canNext} onClick={() => (step < 2 ? setStep(step + 1) : submit())}>
          {step < 2 ? 'Continue' : 'Start porting'}
        </RingoButton>
      </div>
    </div>
  );
}
