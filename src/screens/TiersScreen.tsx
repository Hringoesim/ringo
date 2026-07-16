// TiersScreen — the membership ladder. Everyone starts Orange; perks stack.
import { RC } from '../theme';
import { RingoHeader } from '../components/Header';
import { BackBtn } from '../components/ui';
import { TIERS, tierFor, nextTier } from '../data/tiers';
import { useRingoState } from '../store/store';

const perksByTier: Record<string, string[]> = {
  amber: ['Unlimited data in 180+ countries', 'One flat monthly plan', 'Keep multiple numbers'],
  coral: ['Everything in Amber', '1 free local number', '+20% faster after fair-use cap'],
  crimson: ['Everything in Coral', 'Airport lounge day-passes', 'Priority 24/7 human support'],
  aurora: ['Everything in Crimson', 'Free carrier-partner upgrades', 'Personal travel concierge'],
};

export function TiersScreen({ onBack }: { onBack: () => void }) {
  const { state } = useRingoState();
  const score = state.score;
  const cur = tierFor(score);
  const next = nextTier(score);
  const toNext = next ? next.min - score : 0;
  const bandPct = next ? Math.min(100, Math.max(4, Math.round(((score - cur.min) / (next.min - cur.min)) * 100))) : 100;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Membership" leading={<BackBtn onClick={onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 40px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: RC.ink, letterSpacing: -0.7, lineHeight: 1.1, textWrap: 'pretty' }}>
          Membership
        </div>
        <div style={{ marginTop: 8, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
          You start at Orange. Connect in more countries each year to move up a tier — each tier adds perks.
        </div>

        {/* Progress to next tier */}
        <div style={{ marginTop: 18, borderRadius: 18, background: RC.paper, border: `1px solid ${RC.line}`, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: RC.ink }}>{score} {score === 1 ? 'country' : 'countries'} this year</span>
            <span style={{ fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600, color: RC.inkMute }}>
              {next ? `${toNext} more → ${next.name}` : 'Top tier reached'}
            </span>
          </div>
          <div style={{ marginTop: 10, height: 8, borderRadius: 8, background: RC.cream2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${bandPct}%`, borderRadius: 8, background: `linear-gradient(90deg, ${cur.c1}, ${(next || cur).c2})` }} />
          </div>
        </div>

        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {TIERS.map((t) => {
            const isCurrent = t.id === cur.id;
            const unlocked = score >= t.min;
            return (
              <div
                key={t.id}
                style={{
                  borderRadius: 22, overflow: 'hidden',
                  border: `1.5px solid ${isCurrent ? 'transparent' : RC.line}`,
                  outline: isCurrent ? `2px solid ${t.c2}` : 'none',
                  background: RC.paper,
                  opacity: unlocked ? 1 : 0.62,
                  filter: unlocked ? 'none' : 'saturate(0.7)',
                }}
              >
                {/* color header */}
                <div style={{ padding: '16px 18px', position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${t.c1}, ${t.c2})`, color: '#FFFDFB' }}>
                  <div style={{ position: 'absolute', right: -30, top: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,253,251,0.16)' }} />
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2l2.6 5.6L21 8.3l-4.5 4.3L17.8 19 12 15.8 6.2 19l1.3-6.4L3 8.3l6.4-.7z" fill="#FFFDFB" />
                      </svg>
                      <span style={{ fontFamily: 'var(--font)', fontSize: 16, fontWeight: 600, letterSpacing: -0.2 }}>{t.name}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font)', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,253,251,0.24)' }}>
                      {isCurrent ? 'You’re here' : unlocked ? 'Unlocked' : `${t.min}+ countries`}
                    </span>
                  </div>
                </div>
                {/* perks */}
                <div style={{ padding: '14px 18px' }}>
                  {perksByTier[t.id].map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M5 13l4 4L19 7" stroke={t.c2} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span style={{ fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 500, color: RC.ink }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
