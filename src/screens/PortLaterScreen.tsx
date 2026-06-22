// PortLaterScreen — shown if the user skipped phone at sign-up.
import { RC } from '../theme';

export function PortLaterScreen({ onPortNow, onSkip }: { onPortNow: () => void; onSkip: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 80 }} />
      <div style={{ padding: '0 24px', flex: 1 }}>
        <div
          style={{
            width: 72, height: 72, borderRadius: 22, background: RC.grad,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 18px 36px -16px rgba(237,77,142,0.5)', marginBottom: 20,
          }}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
            <path d="M9 17l-4-4 4-4M5 13h10a4 4 0 004-4V5" stroke="#FFFDFB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ fontFamily: 'Poppins', fontSize: 30, fontWeight: 600, color: RC.ink, letterSpacing: -0.6, lineHeight: 1.15, textWrap: 'pretty' }}>
          Already have a number?
        </div>
        <div style={{ marginTop: 10, fontFamily: 'Poppins', fontSize: 15, color: RC.inkMute, lineHeight: 1.55 }}>
          Bring it to Ringo and keep your contacts, your iMessage, and your 2FA. We can do this now or later — your old SIM keeps working until we’re ready to switch.
        </div>

        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {([
            ['Keep your existing number', 'Most people choose this'],
            ['Pick a fresh local number', 'From $3/mo · 180+ countries'],
            ['Decide later', 'Just explore Ringo for now'],
          ] as [string, string][]).map(([t, s], i) => (
            <div
              key={i}
              style={{
                padding: '14px 16px', borderRadius: 16, background: RC.paper,
                border: `1px solid ${RC.line}`, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              }}
              onClick={i === 0 ? onPortNow : onSkip}
            >
              <div
                style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: i === 0 ? RC.grad : RC.cream,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: i === 0 ? '#FFFDFB' : RC.inkStrong,
                }}
              >
                {i === 0 ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M9 17l-4-4 4-4M5 13h10a4 4 0 004-4V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : i === 1 ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Poppins', fontSize: 15, fontWeight: 600, color: RC.ink }}>{t}</div>
                <div style={{ fontFamily: 'Poppins', fontSize: 12, color: RC.inkMute }}>{s}</div>
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
