// PortNumberScreen — bring your existing number to Ringo (number → carrier → PIN).
import { useState } from 'react';
import { RC } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn } from '../components/ui';
import type { PortPayload } from '../api/ringoApi';

interface PortNumberScreenProps {
  onBack: () => void;
  onContinue: (payload: PortPayload) => void;
}

export function PortNumberScreen({ onBack, onContinue }: PortNumberScreenProps) {
  const [step, setStep] = useState(0);
  const [num, setNum] = useState('');
  const [carrier, setCarrier] = useState('');
  const [pin, setPin] = useState('');
  const carriers = ['T-Mobile', 'Verizon', 'AT&T', 'Proximus', 'Orange', 'Vodafone', 'SoftBank', 'Other'];
  const canNext =
    (step === 0 && num.replace(/\D/g, '').length >= 8) ||
    (step === 1 && !!carrier) ||
    (step === 2 && pin.length >= 3);

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
            <div style={{ fontFamily: 'Poppins', fontSize: 28, fontWeight: 600, color: RC.ink, letterSpacing: -0.5, lineHeight: 1.15, textWrap: 'pretty' }}>
              What number do you want to bring?
            </div>
            <div style={{ marginTop: 6, fontFamily: 'Poppins', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
              We’ll keep your number, your contacts, and your iMessage. Porting takes 1–3 hours.
            </div>
            <div style={{ marginTop: 22 }}>
              <div style={{ fontFamily: 'Poppins', fontSize: 11, fontWeight: 600, color: RC.inkMute, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>
                Phone number
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', height: 56, borderRadius: 14, background: RC.paper, border: `1.5px solid ${num ? RC.inkStrong : RC.line}` }}>
                <span style={{ fontFamily: 'Poppins', fontSize: 18, fontWeight: 600, color: RC.inkMute }}>+</span>
                <input
                  value={num}
                  onChange={(e) => setNum(e.target.value)}
                  placeholder="32 471 23 45 67"
                  inputMode="tel"
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: 'Poppins', fontSize: 18, fontWeight: 600, color: RC.ink, letterSpacing: -0.2 }}
                />
              </div>
              <div style={{ marginTop: 10, fontFamily: 'Poppins', fontSize: 12, color: RC.inkMute }}>
                Include the country code (e.g. +32 for Belgium, +1 for USA).
              </div>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <div style={{ fontFamily: 'Poppins', fontSize: 28, fontWeight: 600, color: RC.ink, letterSpacing: -0.5, lineHeight: 1.15 }}>
              Who’s your current carrier?
            </div>
            <div style={{ marginTop: 6, fontFamily: 'Poppins', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
              Pick the network that owns this number today.
            </div>
            <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {carriers.map((cName) => {
                const sel = cName === carrier;
                return (
                  <div
                    key={cName}
                    onClick={() => setCarrier(cName)}
                    style={{
                      padding: '14px 12px', borderRadius: 14, textAlign: 'center', cursor: 'pointer',
                      background: sel ? RC.gradSoft : RC.paper,
                      border: `1.5px solid ${sel ? 'transparent' : RC.line}`,
                      outline: sel ? `1.5px solid ${RC.inkStrong}` : 'none',
                      fontFamily: 'Poppins', fontSize: 13, fontWeight: 600, color: RC.ink,
                    }}
                  >
                    {cName}
                  </div>
                );
              })}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div style={{ fontFamily: 'Poppins', fontSize: 28, fontWeight: 600, color: RC.ink, letterSpacing: -0.5, lineHeight: 1.15, textWrap: 'pretty' }}>
              Enter your transfer PIN.
            </div>
            <div style={{ marginTop: 6, fontFamily: 'Poppins', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
              Get this from {carrier || 'your carrier'} — usually in their app under <em>Number transfer</em> or by texting PORT to 611.
            </div>
            <div style={{ marginTop: 22 }}>
              <div style={{ fontFamily: 'Poppins', fontSize: 11, fontWeight: 600, color: RC.inkMute, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>
                Account / transfer PIN
              </div>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="• • • • • •"
                style={{
                  width: '100%', height: 56, padding: '0 14px',
                  border: `1.5px solid ${pin ? RC.inkStrong : RC.line}`, borderRadius: 14,
                  background: RC.paper, outline: 'none',
                  fontFamily: 'Poppins', fontSize: 20, fontWeight: 600, color: RC.ink,
                  letterSpacing: 6, textAlign: 'center', boxSizing: 'border-box',
                }}
              />
              <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: RC.cream, fontFamily: 'Poppins', fontSize: 12, color: RC.ink, lineHeight: 1.55 }}>
                <strong style={{ color: RC.inkStrong, fontWeight: 600 }}>What happens next:</strong> we ping {carrier || 'your carrier'}, they release the number, and Ringo claims it. Your old SIM keeps working until the moment we switch — usually 1–3 hours.
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ flex: 1 }} />
      <div
        style={{
          padding: '14px 20px 24px', borderTop: `1px solid ${RC.line}`,
          background: 'rgba(254,248,244,0.92)', backdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        <RingoButton
          disabled={!canNext}
          onClick={() => (step < 2 ? setStep(step + 1) : onContinue({ number: `+${num.replace(/^\+/, '')}`, carrier, transferPin: pin }))}
        >
          {step < 2 ? 'Continue' : 'Start porting'}
        </RingoButton>
      </div>
    </div>
  );
}
