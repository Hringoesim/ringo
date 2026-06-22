// SignUpScreen — YC-style: clean, one decision per screen. Apple sign-in is the
// primary action; email + optional phone fall below an "or use email" divider.
import { useState } from 'react';
import { RC } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn, FieldLabel, Input } from '../components/ui';
import { LOGO_SRC } from '../assets';

interface SignUpScreenProps {
  onBack: () => void;
  onContinue: (v: { email: string; phone: string }) => void;
  onSkipPhone: (v: { email: string }) => void;
  onAppleSignIn: () => void;
  onGoogleSignIn: () => void;
}

export function SignUpScreen({ onBack, onContinue, onSkipPhone, onAppleSignIn, onGoogleSignIn }: SignUpScreenProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('+44');
  const [agree, setAgree] = useState(true);
  const dial = ['+44', '+353', '+34', '+49', '+31', '+1', '+33', '+39', '+351', '+81', '+971', '+65'];
  const emailOk = /\S+@\S+\.\S+/.test(email);
  const phoneOk = phone.replace(/\D/g, '').length >= 7;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="" leading={<BackBtn onClick={onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '0 24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <img src={LOGO_SRC} alt="Ringo" style={{ height: 30, width: 'auto' }} />
        </div>
        <div style={{ fontFamily: 'Poppins', fontSize: 30, fontWeight: 600, color: RC.ink, letterSpacing: -0.6, lineHeight: 1.1, textWrap: 'pretty' }}>
          Create your Ringo account.
        </div>
        <div style={{ marginTop: 8, fontFamily: 'Poppins', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
          One tap with Apple — straight to your dashboard. You can port your number whenever you're ready.
        </div>

        {/* Sign in with Apple — primary, top of stack (white on dark, black on light) */}
        <button
          onClick={() => onAppleSignIn && onAppleSignIn()}
          style={{
            marginTop: 24, width: '100%', height: 54, borderRadius: 14, border: 'none',
            background: RC.scheme === 'dark' ? '#FFFFFF' : '#000',
            color: RC.scheme === 'dark' ? '#000' : '#FFFFFF',
            fontFamily: 'Poppins', fontSize: 15, fontWeight: 600, letterSpacing: -0.1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
            boxShadow: '0 8px 22px -12px rgba(0,0,0,0.45)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={RC.scheme === 'dark' ? '#000' : '#FFFFFF'}>
            <path d="M16.365 1.43c0 1.14-.39 2.21-1.13 3.04-.78.86-2.05 1.51-3.27 1.42-.13-1.13.41-2.27 1.12-3.05.79-.88 2.16-1.55 3.28-1.41zm3.74 17.05c-.66 1.45-.97 2.1-1.81 3.39-1.18 1.81-2.84 4.06-4.9 4.07-1.83.02-2.3-1.19-4.79-1.18-2.49.01-3.01 1.2-4.84 1.18-2.06-.02-3.63-2.06-4.81-3.86-3.3-5.05-3.65-10.97-1.61-14.13 1.45-2.25 3.74-3.57 5.89-3.57 2.19 0 3.57 1.2 5.39 1.2 1.76 0 2.83-1.2 5.37-1.2 1.92 0 3.95 1.05 5.4 2.85-4.74 2.6-3.97 9.36 .71 11.25z" />
          </svg>
          Sign in with Apple
        </button>

        {/* Continue with Google */}
        <button
          onClick={() => onGoogleSignIn && onGoogleSignIn()}
          style={{
            marginTop: 10, width: '100%', height: 54, borderRadius: 14,
            border: `1.5px solid ${RC.lineStrong}`, background: RC.paper, color: RC.ink,
            fontFamily: 'Poppins', fontSize: 15, fontWeight: 600, letterSpacing: -0.1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Continue with Google
        </button>

        <div
          style={{
            margin: '18px 0 4px', display: 'flex', alignItems: 'center', gap: 10,
            fontFamily: 'Poppins', fontSize: 11, fontWeight: 600, color: RC.inkMute,
            letterSpacing: 0.6, textTransform: 'uppercase',
          }}
        >
          <div style={{ flex: 1, height: 1, background: RC.line }} />
          or use email
          <div style={{ flex: 1, height: 1, background: RC.line }} />
        </div>

        <div style={{ marginTop: 14 }}>
          <FieldLabel>Email</FieldLabel>
          <Input value={email} onChange={setEmail} placeholder="you@you.com" type="email" />
        </div>

        <div style={{ marginTop: 16 }}>
          <FieldLabel>
            Phone <span style={{ color: RC.inkMute, fontWeight: 500 }}>· optional</span>
          </FieldLabel>
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              style={{
                height: 54, padding: '0 10px', borderRadius: 14,
                border: `1.5px solid ${RC.line}`, background: RC.paper,
                fontFamily: 'Poppins', fontSize: 15, fontWeight: 600, color: RC.ink,
                outline: 'none', cursor: 'pointer',
              }}
            >
              {dial.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <div style={{ flex: 1 }}>
              <Input value={phone} onChange={setPhone} placeholder="471 23 45 67" type="tel" inputMode="tel" />
            </div>
          </div>
          <div style={{ marginTop: 8, fontFamily: 'Poppins', fontSize: 11.5, color: RC.inkMute, lineHeight: 1.5 }}>
            We’ll text a 6-digit code to verify it’s you.{' '}
            <strong style={{ color: RC.inkStrong, fontWeight: 600 }}>You can also skip</strong> and add or port a number later.
          </div>
        </div>

        <label style={{ marginTop: 18, display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <span
            style={{
              width: 20, height: 20, borderRadius: 6, marginTop: 2,
              background: agree ? RC.grad : RC.paper,
              border: agree ? 'none' : `1.5px solid ${RC.lineStrong}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
            onClick={() => setAgree(!agree)}
          >
            {agree && (
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path d="M2 6l3 3 5-6" stroke="#FFFDFB" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span style={{ fontFamily: 'Poppins', fontSize: 12, color: RC.inkMute, lineHeight: 1.5 }}>
            I agree to Ringo’s <span style={{ color: RC.inkStrong, fontWeight: 600 }}>Terms</span> and{' '}
            <span style={{ color: RC.inkStrong, fontWeight: 600 }}>Privacy Policy</span>. I understand identity verification is required to activate an eSIM.
          </span>
        </label>
      </div>

      <div
        style={{
          padding: '14px 24px 24px', borderTop: `1px solid ${RC.line}`,
          background: RC.glass, backdropFilter: 'blur(20px) saturate(180%)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}
      >
        <RingoButton
          disabled={!emailOk || !agree || (!!phone && !phoneOk)}
          onClick={() => (phoneOk ? onContinue({ email, phone: `${country} ${phone}` }) : onSkipPhone({ email }))}
        >
          {phoneOk ? 'Send 6-digit code' : 'Continue without phone'}
        </RingoButton>
        {phoneOk && (
          <button
            onClick={() => onSkipPhone({ email })}
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontFamily: 'Poppins', fontWeight: 500, fontSize: 13, color: RC.inkMute, height: 36,
            }}
          >
            Skip — add or port a number later
          </button>
        )}
      </div>
    </div>
  );
}
