// NumbersScreen — the multi-number manager. The selected number is the MAIN
// (calls, SMS & codes); the rest stay live in the BACKGROUND to receive codes.
import { RC } from '../theme';
import { RingoHeader } from '../components/Header';
import { BackBtn } from '../components/ui';
import { useRingoState } from '../store/store';
import type { OnNav } from '../navigation';

export function NumbersScreen({ onNav, onBack }: { onNav: OnNav; onBack: () => void }) {
  const { state, actions } = useRingoState();
  const activeNumberId = state.activeNumberId;
  const setActiveNumberId = actions.setActiveNumber;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Numbers" leading={<BackBtn onClick={onBack} />} />
      <div style={{ padding: '0 20px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: RC.ink, letterSpacing: -0.6, lineHeight: 1.1 }}>
          Your <span style={{ background: RC.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>identity</span>, your call.
        </div>
        <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, fontWeight: 400, lineHeight: 1.5 }}>
          Your <strong style={{ color: RC.ink, fontWeight: 600 }}>main</strong> number handles calls and texts. The others stay live in the background to receive your verification codes.
        </div>
      </div>

      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 120px' }}>
        {state.numbers.map((n) => {
          const isActive = activeNumberId === n.id;
          return (
            <div
              key={n.id}
              onClick={() => setActiveNumberId(n.id)}
              style={{
                borderRadius: 24, padding: 18, marginBottom: 12,
                background: isActive ? RC.grad : RC.paper,
                color: isActive ? '#FFFDFB' : RC.ink,
                border: isActive ? 'none' : `1px solid ${RC.line}`,
                boxShadow: isActive ? '0 18px 40px -18px rgba(248,80,96,0.5)' : '0 4px 16px -10px rgba(208,80,0,0.15)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 46, height: 46, borderRadius: 14,
                    background: isActive ? 'rgba(255,253,251,0.2)' : RC.cream,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                  }}
                >
                  {n.flag}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 500, color: isActive ? 'rgba(255,253,251,0.85)' : RC.inkMute }}>{n.country}</span>
                    <span
                      style={{
                        padding: '2px 8px', borderRadius: 999,
                        fontFamily: 'var(--font)', fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
                        background: n.status === 'porting'
                          ? 'rgba(240,128,56,0.18)'
                          : isActive ? 'rgba(255,253,251,0.24)' : RC.cream,
                        color: n.status === 'porting' ? RC.inkStrong : isActive ? '#FFFDFB' : RC.inkStrong,
                      }}
                    >
                      {n.status === 'porting' ? 'Porting' : isActive ? 'Main' : 'Background'}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--font)', fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>{n.number}</div>
                </div>
                <div
                  style={{
                    width: 24, height: 24, borderRadius: '50%',
                    border: isActive ? '2px solid #FFFDFB' : `2px solid ${RC.lineStrong}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {isActive && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFFDFB' }} />}
                </div>
              </div>

              {/* status line — main vs background */}
              <div
                style={{
                  marginTop: 14, display: 'flex', alignItems: 'center', gap: 8,
                  fontFamily: 'var(--font)', fontSize: 12, fontWeight: 500,
                  color: isActive ? 'rgba(255,253,251,0.92)' : RC.inkMute,
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: n.status === 'porting' ? '#F0792E' : isActive ? '#9CFCBD' : '#1F8A5B' }} />
                {n.status === 'porting'
                  ? `Porting in via MNP — ${n.portEta || 'in progress'}`
                  : isActive ? 'Main — calls, SMS & verification codes' : 'Background — receives verification codes & SMS'}
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(isActive ? ['Calls', 'SMS', 'iMessage', '2FA codes'] : ['2FA codes', 'SMS']).map((t) => (
                  <div
                    key={t}
                    style={{
                      padding: '5px 10px', borderRadius: 999,
                      background: isActive ? 'rgba(255,253,251,0.2)' : RC.cream,
                      color: isActive ? '#FFFDFB' : RC.inkStrong,
                      fontFamily: 'var(--font)', fontSize: 11, fontWeight: 600,
                    }}
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div
          onClick={() => onNav('addNumber')}
          style={{ borderRadius: 24, padding: '24px 18px', border: `1.5px dashed ${RC.lineStrong}`, background: 'transparent', textAlign: 'center', cursor: 'pointer' }}
        >
          <div style={{ margin: '0 auto', width: 46, height: 46, borderRadius: 14, background: RC.gradSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: RC.inkStrong }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ marginTop: 10, fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, color: RC.ink }}>Add a new number</div>
          <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute }}>Local numbers from $3 / month</div>
        </div>

        {/* Port your number — bring your existing number to Ringo */}
        <div
          onClick={() => onNav('port')}
          style={{
            marginTop: 12, borderRadius: 24, padding: 18, cursor: 'pointer',
            background: RC.paper, border: `1px solid ${RC.line}`,
            display: 'flex', alignItems: 'center', gap: 14,
            boxShadow: '0 4px 16px -10px rgba(208,80,0,0.15)',
          }}
        >
          <div style={{ width: 46, height: 46, borderRadius: 14, background: RC.gradSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: RC.inkStrong }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M9 17l-4-4 4-4M5 13h10a4 4 0 004-4V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, color: RC.ink }}>Port your number</div>
            <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute }}>Bring your existing number to Ringo · free</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke={RC.inkStrong} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}
