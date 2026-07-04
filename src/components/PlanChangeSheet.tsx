// PlanChangeSheet — the confirm step for switching plans while subscribed.
//
// It makes the money + timing explicit before anything happens:
//  · Upgrade   → a prorated charge today, new plan effective immediately.
//  · Downgrade → nothing today; the current plan and its full data are kept
//                until renewal, then the cheaper plan starts. If the account
//                holds more numbers than the new plan allows, the user picks
//                which to keep — the rest are released at renewal (with a clear
//                warning that ported numbers must be moved out first or lost).
import { useMemo, useState } from 'react';
import { RC } from '../theme';
import { useRingoState } from '../store/store';
import { PLANS, fmtMoney, fmtDate } from '../data/plans';
import { haptic, hapticNotify } from '../lib/haptics';

interface Props {
  targetId: string;
  onClose: () => void;
  onDone: () => void;
}

export function PlanChangeSheet({ targetId, onClose, onDone }: Props) {
  const { state, actions } = useRingoState();
  const pre = useMemo(() => actions.planChangePreview(targetId), [targetId, actions]);
  const target = PLANS.find((p) => p.id === targetId) || PLANS[0];
  const from = PLANS.find((p) => p.id === pre.fromId) || PLANS[0];

  const live = state.numbers.filter((n) => !n.scheduledRelease);
  // For downgrades that drop numbers: user-chosen keep set (primary locked in).
  const [keep, setKeep] = useState<Set<string>>(() => new Set(pre.keepIds));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const mustChoose = pre.kind === 'downgrade' && pre.overBy > 0;
  const keepCount = keep.size;
  const keptOk = keepCount <= pre.maxNumbers && keep.has(state.activeNumberId);
  const releaseList = live.filter((n) => !keep.has(n.id));

  const toggle = (id: string) => {
    if (id === state.activeNumberId) return; // primary always kept
    haptic('light');
    setKeep((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= pre.maxNumbers) return prev; // at cap — must free one first
        next.add(id);
      }
      return next;
    });
  };

  const confirm = async () => {
    if (busy || (mustChoose && !keptOk)) return;
    setErr('');
    setBusy(true);
    haptic('medium');
    if (pre.kind === 'upgrade') await new Promise((r) => setTimeout(r, 800)); // reads as a charge
    const res = await actions.changePlan(targetId, mustChoose ? Array.from(keep) : undefined);
    setBusy(false);
    if (res.ok) {
      hapticNotify('success');
      onDone();
    } else {
      hapticNotify('error');
      setErr(res.error || 'Something went wrong. Try again.');
    }
  };

  const up = pre.kind === 'upgrade';
  const cta = up
    ? pre.chargeNow > 0
      ? `Pay ${fmtMoney(pre.chargeNow)} & upgrade`
      : `Switch to ${target.name}`
    : mustChoose
      ? keptOk
        ? 'Schedule downgrade'
        : `Keep ${pre.maxNumbers} number${pre.maxNumbers > 1 ? 's' : ''} to continue`
      : 'Schedule downgrade';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end', background: 'rgba(20,14,10,0.42)',
        animation: 'ringoFadeIn 0.18s ease both',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="no-bar"
        style={{
          background: RC.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26,
          padding: '10px 22px calc(20px + env(safe-area-inset-bottom))',
          maxHeight: '86%', overflowY: 'auto',
          boxShadow: '0 -18px 50px -20px rgba(20,14,10,0.5)',
          animation: 'ringoSheetUp 0.32s cubic-bezier(0.32,0.72,0,1) both',
        }}
      >
        {/* grabber */}
        <div style={{ width: 38, height: 4, borderRadius: 4, background: RC.lineStrong, margin: '0 auto 16px' }} />

        {/* badge */}
        <div
          style={{
            display: 'inline-block', padding: '4px 11px', borderRadius: 999,
            background: up ? 'rgba(31,138,91,0.12)' : RC.cream,
            color: up ? '#1F7A4E' : RC.inkMute,
            fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
          }}
        >
          {up ? 'Upgrade' : 'Downgrade'} · {from.name} → {target.name}
        </div>

        <div style={{ marginTop: 12, fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: RC.ink, letterSpacing: -0.5, lineHeight: 1.15 }}>
          {up ? `Move up to ${target.name} today` : `Downgrade to ${target.name}`}
        </div>

        {/* Money + timing */}
        <div style={{ marginTop: 14, borderRadius: 16, border: `1px solid ${RC.line}`, overflow: 'hidden' }}>
          {up ? (
            <>
              <Row
                first
                label={`Charged today (${pre.daysLeft} day${pre.daysLeft === 1 ? '' : 's'} left this month)`}
                value={pre.chargeNow > 0 ? fmtMoney(pre.chargeNow) : fmtMoney(0)}
                strong
              />
              <Row label={`Then from ${fmtDate(pre.renewsAt)}`} value={`${fmtMoney(pre.monthly)}/mo`} />
              <Note>Your data jumps to {target.highspeed === 'Unlimited' ? 'unlimited high-speed' : target.highspeed} right away. You only pay the difference for the days left in the month you’ve already paid for.</Note>
            </>
          ) : (
            <>
              <Row first label="Charged today" value={fmtMoney(0)} strong />
              <Row label={`${from.name} + full data until`} value={fmtDate(pre.renewsAt)} />
              <Row label={`Then ${target.name} from ${fmtDate(pre.renewsAt)}`} value={`${fmtMoney(pre.monthly)}/mo`} />
              <Note>You’ve already paid for this month, so you keep {from.name} and all its data until {fmtDate(pre.renewsAt)}. The lower price starts at renewal — cancel the switch any time before then.</Note>
            </>
          )}
        </div>

        {/* Numbers warning (downgrade below current number count) */}
        {mustChoose && (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 14, background: 'rgba(206,74,30,0.08)', border: '1px solid rgba(206,74,30,0.20)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M12 3l9 16H3l9-16z" stroke={RC.inkStrong} strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M12 10v4M12 17h.01" stroke={RC.inkStrong} strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <div style={{ fontFamily: 'var(--font)', fontSize: 13, color: RC.ink, lineHeight: 1.5 }}>
                <strong>{target.name} includes {pre.maxNumbers} number{pre.maxNumbers > 1 ? 's' : ''}.</strong> You have {pre.currentCount}. Choose the {pre.maxNumbers} to keep — the other {pre.overBy} {pre.overBy === 1 ? 'is' : 'are'} released on {fmtDate(pre.renewsAt)}.
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, color: RC.inkMute, letterSpacing: 0.5, textTransform: 'uppercase' }}>Numbers to keep</span>
              <span style={{ fontFamily: 'var(--font)', fontSize: 12, fontWeight: 700, color: keepCount > pre.maxNumbers ? RC.inkStrong : RC.inkMute }}>
                {keepCount} / {pre.maxNumbers}
              </span>
            </div>

            <div style={{ marginTop: 8, borderRadius: 16, border: `1px solid ${RC.line}`, overflow: 'hidden' }}>
              {live.map((n, i) => {
                const isPrimary = n.id === state.activeNumberId;
                const kept = keep.has(n.id);
                return (
                  <button
                    key={n.id}
                    onClick={() => toggle(n.id)}
                    className="press"
                    style={{
                      width: '100%', textAlign: 'left', border: 'none', cursor: isPrimary ? 'default' : 'pointer',
                      background: kept ? RC.paper : RC.cream,
                      display: 'grid', gridTemplateColumns: '34px 1fr auto', alignItems: 'center', gap: 10,
                      padding: '12px 14px', borderTop: i ? `1px solid ${RC.line}` : 'none',
                    }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: RC.cream, border: `1px solid ${RC.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{n.flag}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700, color: RC.ink, letterSpacing: -0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.number}</div>
                      <div style={{ fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 500, color: kept ? RC.inkMute : RC.inkStrong }}>
                        {isPrimary ? 'Primary · always kept' : kept ? `${n.country} · kept` : `${n.country} · released ${fmtDate(pre.renewsAt)}`}
                        {n.source === 'ported' && !kept && !isPrimary ? ' · port out first' : ''}
                      </div>
                    </div>
                    {/* keep toggle */}
                    <div
                      style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        border: kept ? 'none' : `2px solid ${RC.lineStrong}`,
                        background: kept ? RC.grad : 'transparent', opacity: isPrimary ? 0.55 : 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {kept && (
                        <svg width="11" height="11" viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {releaseList.length > 0 && (
              <div style={{ marginTop: 10, fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute, lineHeight: 1.5 }}>
                Released numbers stay live until {fmtDate(pre.renewsAt)}. Ported numbers should be moved to another carrier before then, or they’ll be disconnected for good.
              </div>
            )}
          </div>
        )}

        {err && (
          <div style={{ marginTop: 14, padding: '11px 14px', borderRadius: 12, background: 'rgba(229,67,26,0.10)', border: '1px solid rgba(229,67,26,0.22)', fontFamily: 'var(--font)', fontSize: 12.5, color: '#B7341A' }}>
            {err}
          </div>
        )}

        <button
          onClick={confirm}
          disabled={busy || (mustChoose && !keptOk)}
          className="press"
          style={{
            marginTop: 18, width: '100%', height: 54, borderRadius: 16, border: 'none',
            background: mustChoose && !keptOk ? RC.line : RC.grad, color: '#FFFFFF',
            fontFamily: 'var(--font)', fontSize: 15.5, fontWeight: 700, letterSpacing: -0.1,
            cursor: busy || (mustChoose && !keptOk) ? 'default' : 'pointer',
            opacity: busy ? 0.7 : 1,
            boxShadow: mustChoose && !keptOk ? 'none' : '0 8px 18px -8px rgba(199,75,142,0.4)',
          }}
        >
          {busy ? 'Working…' : cta}
        </button>
        <button
          onClick={onClose}
          style={{ marginTop: 8, width: '100%', height: 46, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: RC.inkMute }}
        >
          Keep {from.name}
        </button>

        <style>{`@keyframes ringoSheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      </div>
    </div>
  );
}

function Row({ label, value, strong, first }: { label: string; value: string; strong?: boolean; first?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 16px', borderTop: first ? 'none' : `1px solid ${RC.line}` }}>
      <span style={{ fontFamily: 'var(--font)', fontSize: 13.5, color: RC.inkMute, lineHeight: 1.4 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font)', fontSize: strong ? 17 : 14, fontWeight: strong ? 800 : 700, color: strong ? RC.ink : RC.inkStrong, whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}
function Note({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '12px 16px', borderTop: `1px solid ${RC.line}`, background: RC.cream, fontFamily: 'var(--font)', fontSize: 12.5, color: RC.inkMute, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}
