// NumberSetupScreen — the Number Management step in onboarding (after the KYC
// gate). Offers the two backend journeys: allocate a new Ringo MSISDN, or port
// an existing number in via MNP.
import { RC } from '../theme';
import { BackBtn } from '../components/ui';

interface NumberSetupScreenProps {
  onNewNumber: () => void;
  onPortIn: () => void;
  onSkip: () => void;
  onBack: () => void;
  /** Whether the user actually completed the KYC steps (vs "verify later"). */
  kycDone?: boolean;
}

export function NumberSetupScreen({ onNewNumber, onPortIn, onSkip, onBack, kycDone = true }: NumberSetupScreenProps) {
  const options: { title: string; sub: string; cta: () => void; primary: boolean; icon: 'new' | 'port' | 'later' }[] = [
    { title: 'Get a new Ringo number', sub: 'We allocate a local UK or EU number instantly', cta: onNewNumber, primary: true, icon: 'new' },
    { title: 'Port your existing number', sub: 'Keep your number — UK ports complete in ~1 business day', cta: onPortIn, primary: false, icon: 'port' },
    { title: 'Decide later', sub: 'Explore Ringo first — add a number any time', cta: onSkip, primary: false, icon: 'later' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '54px 24px 8px' }}>
        <BackBtn onClick={onBack} />
      </div>
      <div style={{ padding: '0 24px', flex: 1 }}>
        <div
          style={{
            width: 72, height: 72, borderRadius: 22, background: RC.grad,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 18px 36px -16px rgba(237,77,142,0.5)', marginBottom: 20,
          }}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
            <rect x="6" y="3" width="12" height="18" rx="3" stroke="#FFFDFB" strokeWidth="2.2" />
            <circle cx="12" cy="17.5" r="1" fill="#FFFDFB" />
          </svg>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: RC.ink, letterSpacing: -0.8, lineHeight: 1.15, textWrap: 'pretty' }}>
          Add your number
        </div>
        <div style={{ marginTop: 10, fontFamily: 'var(--font)', fontSize: 15, color: RC.inkMute, lineHeight: 1.55 }}>
          {kycDone
            ? 'Your identity check is in. Now choose how you want your Ringo number — get a fresh one, or bring your current one with you.'
            : 'Choose how you want your Ringo number — get a fresh one, or bring your current one with you. You can verify your identity any time.'}
        </div>

        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {options.map((o, i) => (
            <div
              key={i}
              onClick={o.cta}
              style={{
                padding: '14px 16px', borderRadius: 16,
                background: o.primary ? RC.gradSoft : RC.paper,
                border: `1px solid ${o.primary ? 'transparent' : RC.line}`,
                outline: o.primary ? `1.5px solid ${RC.inkStrong}` : 'none',
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: o.primary ? RC.grad : RC.cream,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: o.primary ? '#FFFDFB' : RC.inkStrong, flexShrink: 0,
                }}
              >
                {o.icon === 'new' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                  </svg>
                ) : o.icon === 'port' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M9 17l-4-4 4-4M5 13h10a4 4 0 004-4V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, color: RC.ink }}>{o.title}</div>
                <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute, lineHeight: 1.45 }}>{o.sub}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke={RC.inkStrong} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
