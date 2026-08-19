// PlanScreen — plan & billing. Real Ringo lineup with a selectable picker,
// fair-use ring, add-ons and recent invoices.
import { useState } from 'react';
import { RC, EASE_OUT } from '../theme';
import { hapticSelection } from '../lib/haptics';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { RingoCard } from '../components/Card';
import { BackBtn, SectionTitle } from '../components/ui';
import { useRingoState } from '../store/store';
import {
  PLANS, planRank, fmtMoney, fmtDate,
  BILLING, DEFAULT_PERIOD, periodMonthlyPrice, billingNote, periodDataGB, TOP_UP, topUpPrice,
  type BillingPeriod,
} from '../data/plans';
import { PlanChangeSheet } from '../components/PlanChangeSheet';
import { ComingNext } from '../components/ComingNext';

// The plan card is the deep plum of the .upgrade-ladder card on
// ringoesim.com — the site puts its money surfaces on purple and keeps the
// orange gradient for the button that takes the action.
const PLUM = 'linear-gradient(155deg, #221338 0%, #3A1A46 100%)';

interface PlanScreenProps {
  onBack: () => void;
  onInstall: () => void;
  /** Open checkout to pay for a plan (first subscription). */
  onCheckout?: (id: string, period: BillingPeriod) => void;
}

export function PlanScreen({ onBack, onInstall, onCheckout }: PlanScreenProps) {
  const { state, actions } = useRingoState();
  const currentId = state.planId;
  const [selected, setSelected] = useState(currentId);
  const [changeTo, setChangeTo] = useState<string | null>(null);
  // Billing cadence. Both cadences quote a per-month price; picking one only
  // changes how often the card is charged (and the monthly rate).
  const [period, setPeriod] = useState<BillingPeriod>(DEFAULT_PERIOD);
  const perMonth = periodMonthlyPrice(period);
  const cur = PLANS.find((p) => p.id === selected) || PLANS[0];
  const isCurrent = (id: string) => id === currentId;
  const pending = state.pendingPlanId ? PLANS.find((p) => p.id === state.pendingPlanId) : null;
  const direction = planRank(cur.id) > planRank(currentId) ? 'Upgrade' : 'Downgrade';
  const usedPct = Math.max(0, Math.round(state.dataPct * 100)); // real fair-use %

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Plan" leading={<BackBtn onClick={onBack} />} />

      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 120px' }}>
        {/* Plan hero — reflects selected plan */}
        <div style={{ borderRadius: 24, padding: '24px 22px', background: PLUM, color: '#FFFDFB', boxShadow: '0 18px 40px -28px rgba(34,19,56,0.65)', position: 'relative', overflow: 'hidden' }}>

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 500, opacity: 0.85 }}>{cur.name}</div>

            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font)', fontSize: 64, fontWeight: 700, letterSpacing: -2, lineHeight: 1.14 }}>{fmtMoney(perMonth)}</span>
              <span style={{ fontFamily: 'var(--font)', fontSize: 15, fontWeight: 500, opacity: 0.85 }}>/ month</span>
            </div>
            <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 500, opacity: 0.85 }}>
              {billingNote(period)}
            </div>
            <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[`${periodDataGB(period)} GB / month`, 'Number included', '180+ countries', 'No zones'].map((t) => (
                <div key={t} style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(255,253,251,0.22)', fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600 }}>{t}</div>
              ))}
            </div>

            {/* Billing cadence — one box, a white thumb marks the choice.
                Same construction as the level toggle on ringoesim.com. */}
            <div
              role="tablist"
              aria-label="Billing period"
              style={{
                marginTop: 18, display: 'flex', position: 'relative',
                background: 'rgba(0,0,0,0.24)', border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 999, padding: 4,
              }}
            >
              {/* the thumb slides between the two halves */}
              <span
                aria-hidden
                style={{
                  position: 'absolute', top: 4, bottom: 4, left: 4, width: 'calc(50% - 4px)',
                  background: '#FFFFFF', borderRadius: 999,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
                  transform: period === DEFAULT_PERIOD ? 'translateX(0)' : 'translateX(100%)',
                  transition: `transform 0.28s ${EASE_OUT}`,
                }}
              />
              {(Object.keys(BILLING) as BillingPeriod[]).map((k) => {
                const on = k === period;
                return (
                  <button
                    key={k}
                    role="tab"
                    aria-selected={on}
                    onClick={() => { hapticSelection(); setPeriod(k); }}
                    style={{
                      position: 'relative', flex: 1, minHeight: 44, padding: '10px 8px',
                      background: 'transparent', border: 'none', borderRadius: 999, cursor: 'pointer',
                      fontFamily: 'var(--font)', color: on ? RC.ink : 'rgba(255,255,255,0.62)',
                      transition: 'color 0.2s ease',
                    }}
                  >
                    <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: -0.1, whiteSpace: 'nowrap' }}>
                      {BILLING[k].label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scheduled downgrade banner */}
        {pending && (
          <div style={{ marginTop: 16, borderRadius: 18, padding: '14px 16px', background: RC.cream, border: `1px solid ${RC.line}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={RC.inkStrong} strokeWidth="1.8" /><path d="M12 7v5l3 2" stroke={RC.inkStrong} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span style={{ fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 700, color: RC.ink }}>Downgrade to {pending.name} on {fmtDate(state.periodEnd)}</span>
            </div>
            <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 12.5, color: RC.inkMute, lineHeight: 1.5 }}>
              You keep {PLANS.find((p) => p.id === currentId)?.name} and all its data until then.
              {state.numbers.some((n) => n.scheduledRelease) ? ` ${state.numbers.filter((n) => n.scheduledRelease).length} number(s) will be released.` : ''}
            </div>
            <button
              onClick={() => actions.cancelScheduledChange()}
              className="press"
              style={{ marginTop: 10, height: 40, padding: '0 16px', borderRadius: 999, border: `1.5px solid ${RC.lineStrong}`, background: RC.paper, color: RC.inkStrong, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              Cancel downgrade
            </button>
          </div>
        )}

        {/* What you get — a plain list; with one plan there is nothing to pick
            and nothing is "current" until someone actually subscribes. */}
        <div style={{ marginTop: 22 }}>
          <SectionTitle>What you get</SectionTitle>
          <div style={{ borderRadius: 18, background: RC.paper, border: `1px solid ${RC.line}`, padding: '6px 16px' }}>
            {cur.feats.map((f, i) => (
              <div
                key={f}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0',
                  borderTop: i === 0 ? 'none' : `1px solid ${RC.line}`,
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M5 13l4 4L19 7" stroke={RC.inkStrong} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontFamily: 'var(--font)', fontSize: 14.5, color: RC.ink, lineHeight: 1.4 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionTitle>Coming next</SectionTitle>
          <ComingNext signedIn={!!state.email} />
        </div>

        <div>
          {!state.subscribed ? (
            <div style={{ marginTop: 14 }}>
              <RingoButton onClick={() => onCheckout?.(cur.id, period)}>
                Start my plan · {fmtMoney(perMonth)}/mo
              </RingoButton>
              <div style={{ marginTop: 10, textAlign: 'center', fontFamily: 'var(--font)', fontSize: 12.5, color: RC.inkMute, lineHeight: 1.45 }}>
                {billingNote(period)} · cancel anytime
              </div>
            </div>
          ) : !isCurrent(cur.id) ? (
            <div style={{ marginTop: 14 }}>
              <RingoButton onClick={() => setChangeTo(cur.id)}>
                {direction} to {cur.name} — {fmtMoney(perMonth)}/mo
              </RingoButton>
            </div>
          ) : null}
        </div>

        {state.subscribed && (<>
        <div style={{ marginTop: 22 }}>
          <SectionTitle>This month</SectionTitle>
          <RingoCard style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: `conic-gradient(#FF7A2F 0%, #E92BA0 ${usedPct}%, ${RC.cream} ${usedPct}%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                }}
              >
                <div style={{ width: 62, height: 62, borderRadius: '50%', background: RC.paper, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontFamily: 'var(--font)', fontSize: 20, fontWeight: 700, color: RC.inkStrong, lineHeight: 1 }}>{usedPct}%</div>
                  <div style={{ fontFamily: 'var(--font)', fontSize: 9, fontWeight: 500, color: RC.inkMute }}>fair-use</div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: RC.ink }}>{usedPct === 0 ? 'Nothing used yet.' : 'You’re flying.'}</div>
                <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute, lineHeight: 1.5, marginTop: 2 }}>{usedPct === 0 ? 'Your high-speed data is ready the moment you travel.' : 'At this rate, you’ll stay at high speed all month.'}</div>
                <div style={{ marginTop: 8, fontFamily: 'var(--font)', fontSize: 11, color: RC.inkMute }}>
                  {pending ? `Switches to ${pending.name} ${fmtDate(state.periodEnd)}` : `Renews ${fmtDate(state.periodEnd)}`} · Billed to your Apple ID
                </div>
              </div>
            </div>
          </RingoCard>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionTitle>Running low?</SectionTitle>
          <RingoCard style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 600, color: RC.ink }}>
                  Add {TOP_UP.gb} GB · {fmtMoney(topUpPrice())}
                </div>
                <div style={{ marginTop: 2, fontFamily: 'var(--font)', fontSize: 12.5, color: RC.inkMute, lineHeight: 1.45 }}>
                  Your line slows at the limit, it never stops.
                </div>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
                  textTransform: 'uppercase', color: RC.inkMute, padding: '6px 10px',
                  borderRadius: 999, background: RC.cream, whiteSpace: 'nowrap',
                }}
              >
                Coming soon
              </span>
            </div>
          </RingoCard>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionTitle>Recent</SectionTitle>
          <RingoCard style={{ padding: '18px 16px' }}>
            <div style={{ fontFamily: 'var(--font)', fontSize: 13.5, color: RC.inkMute, textAlign: 'center', lineHeight: 1.5 }}>
              No charges yet. Your receipts appear here after your first billing date.
            </div>
          </RingoCard>
        </div>
        </>)}

        <div style={{ marginTop: 22 }}>
          <RingoButton variant="ghost" onClick={onInstall}>Install eSIM on this device</RingoButton>
        </div>
      </div>

      {changeTo && (
        <PlanChangeSheet
          targetId={changeTo}
          onClose={() => setChangeTo(null)}
          onDone={() => {
            // Upgrades take effect now (sit on the new plan); downgrades are
            // scheduled (stay on the current plan until renewal).
            const wasUpgrade = planRank(changeTo) > planRank(currentId);
            setSelected(wasUpgrade ? changeTo : currentId);
            setChangeTo(null);
          }}
        />
      )}
    </div>
  );
}
