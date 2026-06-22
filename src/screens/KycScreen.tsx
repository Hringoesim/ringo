// KycScreen — soft KYC: name → DOB → ID document → photo (skippable until activate).
import { useState } from 'react';
import { RC } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn, FieldLabel, Input } from '../components/ui';
import type { KycPayload } from '../api/ringoApi';

interface KycScreenProps {
  onBack: () => void;
  onContinue: (payload?: KycPayload) => void;
}

export function KycScreen({ onBack, onContinue }: KycScreenProps) {
  const [step, setStep] = useState(0);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [dob, setDob] = useState('');
  const [docType, setDocType] = useState('');
  const [uploaded, setUploaded] = useState(false);
  const docs = [
    { id: 'passport', label: 'Passport', sub: 'Most reliable' },
    { id: 'id', label: 'National ID card', sub: 'EU residents' },
    { id: 'driver', label: 'Driver’s license', sub: 'US, UK, AU' },
  ];
  const canNext =
    (step === 0 && !!first.trim() && !!last.trim()) ||
    (step === 1 && dob.length >= 8) ||
    (step === 2 && !!docType) ||
    (step === 3 && uploaded);
  const titles = ['Your legal name', 'Date of birth', 'Choose an ID document', 'Take a photo of your ID'];
  const subs = [
    'Required by your local telecom regulator. Has to match your government-issued ID.',
    'You must be 18 or older to activate a Ringo number.',
    'We accept any government-issued photo ID. We never store your full document.',
    'Position your ID inside the frame. We extract a few fields, then delete the photo.',
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Verify identity" leading={<BackBtn onClick={step > 0 ? () => setStep(step - 1) : onBack} />} />
      <div style={{ padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                flex: 1, height: 5, borderRadius: 5,
                background: i <= step ? RC.grad : RC.cream2, transition: 'background .25s',
              }}
            />
          ))}
        </div>
      </div>

      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 16px' }}>
        <div style={{ fontFamily: 'Poppins', fontSize: 11, fontWeight: 600, color: RC.inkStrong, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
          Step {step + 1} of 4
        </div>
        <div style={{ fontFamily: 'Poppins', fontSize: 28, fontWeight: 600, color: RC.ink, letterSpacing: -0.5, lineHeight: 1.15, textWrap: 'pretty' }}>
          {titles[step]}
        </div>
        <div style={{ marginTop: 8, fontFamily: 'Poppins', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>{subs[step]}</div>

        <div style={{ marginTop: 24 }}>
          {step === 0 && (
            <>
              <FieldLabel>First name</FieldLabel>
              <Input value={first} onChange={setFirst} placeholder="Marie" />
              <div style={{ height: 14 }} />
              <FieldLabel>Last name</FieldLabel>
              <Input value={last} onChange={setLast} placeholder="Devos" />
            </>
          )}
          {step === 1 && (
            <>
              <FieldLabel>Date of birth</FieldLabel>
              <Input value={dob} onChange={setDob} placeholder="DD / MM / YYYY" inputMode="numeric" />
              <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: RC.cream, fontFamily: 'Poppins', fontSize: 12, color: RC.ink, lineHeight: 1.5 }}>
                <strong style={{ color: RC.inkStrong, fontWeight: 600 }}>Why we ask:</strong> we’re required by every country’s telecom regulator to confirm you’re 18+. We never share your DOB with third parties.
              </div>
            </>
          )}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {docs.map((d) => {
                const sel = d.id === docType;
                return (
                  <div
                    key={d.id}
                    onClick={() => setDocType(d.id)}
                    style={{
                      padding: '16px', borderRadius: 16, cursor: 'pointer',
                      background: sel ? RC.gradSoft : RC.paper,
                      border: `1.5px solid ${sel ? 'transparent' : RC.line}`,
                      outline: sel ? `1.5px solid ${RC.inkStrong}` : 'none',
                      display: 'flex', alignItems: 'center', gap: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: sel ? RC.grad : RC.cream,
                        color: sel ? '#FFFDFB' : RC.inkStrong,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="2" />
                        <circle cx="9" cy="11" r="2" stroke="currentColor" strokeWidth="2" />
                        <path d="M14 10h4M14 13h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Poppins', fontSize: 15, fontWeight: 600, color: RC.ink }}>{d.label}</div>
                      <div style={{ fontFamily: 'Poppins', fontSize: 12, color: RC.inkMute }}>{d.sub}</div>
                    </div>
                    <div
                      style={{
                        width: 22, height: 22, borderRadius: '50%',
                        border: sel ? 'none' : `2px solid ${RC.lineStrong}`,
                        background: sel ? RC.grad : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {sel && (
                        <svg width="10" height="10" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-6" stroke="#FFFDFB" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {step === 3 && (
            <div
              onClick={() => setUploaded(true)}
              style={{
                borderRadius: 20, padding: '30px 18px', textAlign: 'center',
                border: `1.5px dashed ${uploaded ? RC.inkStrong : RC.lineStrong}`,
                background: uploaded ? RC.gradSoft : RC.paper, cursor: 'pointer',
              }}
            >
              <div
                style={{
                  margin: '0 auto', width: 64, height: 64, borderRadius: 18,
                  background: uploaded ? RC.grad : RC.cream,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: uploaded ? '#FFFDFB' : RC.inkStrong,
                }}
              >
                {uploaded ? (
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="6" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="2" />
                    <path d="M9 6l1.5-2h3L15 6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div style={{ marginTop: 14, fontFamily: 'Poppins', fontSize: 15, fontWeight: 600, color: RC.ink }}>
                {uploaded ? 'Looks good — we got it.' : 'Tap to take a photo'}
              </div>
              <div style={{ marginTop: 4, fontFamily: 'Poppins', fontSize: 12, color: RC.inkMute, lineHeight: 1.5, padding: '0 12px' }}>
                {uploaded
                  ? 'Encrypted upload complete. We’ll review it in under 5 minutes.'
                  : 'Make sure all four corners of the ID are visible and the text is readable.'}
              </div>
            </div>
          )}
        </div>

        {/* Trust footer */}
        <div
          style={{
            marginTop: 24, display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 14px', borderRadius: 12, background: RC.paper, border: `1px solid ${RC.line}`,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" stroke={RC.inkStrong} strokeWidth="2" strokeLinejoin="round" />
            <path d="M9 12l2 2 4-4" stroke={RC.inkStrong} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontFamily: 'Poppins', fontSize: 11.5, color: RC.ink, lineHeight: 1.5 }}>
            Encrypted in transit and at rest. We use a regulated KYC partner (Onfido). Your ID is never used for marketing.
          </div>
        </div>
      </div>

      <div
        style={{
          padding: '14px 24px 24px', borderTop: `1px solid ${RC.line}`,
          background: 'rgba(255,246,239,0.92)', backdropFilter: 'blur(20px) saturate(180%)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        <RingoButton
          disabled={!canNext}
          onClick={() =>
            step < 3
              ? setStep(step + 1)
              : onContinue({ firstName: first, lastName: last, dob, docType, documentRef: 'mock_upload' })
          }
        >
          {step < 3 ? 'Continue' : 'Submit and continue'}
        </RingoButton>
        {step < 3 && (
          <button
            onClick={() => onContinue()}
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontFamily: 'Poppins', fontWeight: 500, fontSize: 13, color: RC.inkMute, height: 36,
            }}
          >
            I’ll verify later
          </button>
        )}
      </div>
    </div>
  );
}
