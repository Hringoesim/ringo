// PaywallScreen — the plan checkout. Real money gate: the eSIM can't be
// activated until a plan is paid for here. Payment runs through the store's
// `checkout` seam (demo simulates a successful charge; live mode uses Stripe,
// so the app never touches card data).
import { useState } from 'react';
import { RC } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn } from '../components/ui';
import { Confetti } from '../components/Confetti';
import { useRingoState } from '../store/store';
import { PLANS, planPrice, fmtMoney } from '../data/plans';
import { checkPromo, referralCode, type Promo } from '../data/promo';
import { haptic, hapticNotify } from '../lib/haptics';

interface PaywallScreenProps {
  planId: string;
  onBack: () => void;
  onPaid: () => void;
}

export function PaywallScreen({ planId, onBack, onPaid }: PaywallScreenProps) {
  const { state, actions } = useRingoState();
  const plan = PLANS.find((p) => p.id === planId) || PLANS[0];
  const base = planPrice(plan.id);
  const ownCode = referralCode(state.name, state.email || state.name);
  const [method, setMethod] = useState<'apple' | 'card'>('apple');
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [err, setErr] = useState('');
  const [code, setCode] = useState('');
  const [promo, setPromo] = useState<Promo | null>(null);

  const discounted = promo?.valid ? Math.round(base * (1 - promo.discountPct / 100)) : base;
  const price = fmtMoney(discounted);

  const applyCode = () => {
    const res = checkPromo(code, ownCode);
    setPromo(res);
    // A valid founding code upgrades the account to Pioneer membership.
    if (res.valid && res.kind === 'pioneer') actions.grantPioneer();
    hapticNotify(res.valid ? 'success' : 'warning');
  };

  const pay = async () => {
    if (busy) return;
    setErr('');
    setBusy(true);
    haptic('medium');
    // Demo: a short beat so it reads as a real charge; live mode awaits Stripe.
    await new Promise((r) => setTimeout(r, 900));
    const res = await actions.checkout(plan.id);
    setBusy(false);
    if (res.ok) {
      hapticNotify('success');
      setCelebrate(true);
      setTimeout(onPaid, 1100); // let the celebration play
    } else {
      hapticNotify('error');
      setErr(res.error || 'Payment failed.');
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {celebrate && <Confetti />}
      <RingoHeader title="Checkout" leading={<BackBtn onClick={onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 16px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: RC.ink, letterSpacing: -0.6, lineHeight: 1.1 }}>
          Ringo {plan.name}
        </div>
        <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
          {plan.tagline} · billed monthly, cancel anytime.
        </div>

        {/* Order summary */}
        <div style={{ marginTop: 20, borderRadius: 18, background: RC.paper, border: `1px solid ${RC.line}`, overflow: 'hidden' }}>
          {plan.feats.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderTop: i ? `1px solid ${RC.line}` : 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="#1F8A5B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span style={{ fontFamily: 'var(--font)', fontSize: 13.5, color: RC.ink }}>{f}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '14px 16px', borderTop: `1px solid ${RC.line}`, background: RC.cream }}>
            <span style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: RC.ink }}>Total today</span>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              {promo?.valid && (
                <span style={{ fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, textDecoration: 'line-through' }}>{fmtMoney(base)}</span>
              )}
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: RC.inkStrong }}>{price}<span style={{ fontSize: 12, fontWeight: 600, color: RC.inkMute }}>/mo</span></span>
            </span>
          </div>
        </div>

        {/* Promo / Pioneer code */}
        <div style={{ marginTop: 20, fontFamily: 'var(--font)', fontSize: 11, fontWeight: 600, color: RC.inkMute, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          Have an invite or Pioneer code?
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value); if (promo) setPromo(null); }}
            placeholder="e.g. PIONEER or RINGO-…"
            autoCapitalize="characters"
            style={{
              flex: 1, height: 48, padding: '0 14px', borderRadius: 12,
              border: `1.5px solid ${promo?.valid ? 'rgba(31,138,91,0.5)' : RC.line}`,
              background: RC.paper, color: RC.ink, fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600,
              letterSpacing: 0.5, textTransform: 'uppercase', outline: 'none',
            }}
          />
          <button
            onClick={applyCode}
            disabled={!code.trim()}
            style={{
              height: 48, padding: '0 18px', borderRadius: 12, border: 'none', cursor: code.trim() ? 'pointer' : 'default',
              background: code.trim() ? RC.grad : RC.line, color: '#FFFDFB',
              fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700,
            }}
          >
            Apply
          </button>
        </div>
        {promo && (
          <div style={{ marginTop: 8, fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 500, color: promo.valid ? '#1F7A4E' : '#B7341A', lineHeight: 1.4 }}>
            {promo.valid ? '✓ ' : ''}{promo.label}
          </div>
        )}

        {/* Payment method */}
        <div style={{ marginTop: 20, fontFamily: 'var(--font)', fontSize: 11, fontWeight: 600, color: RC.inkMute, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          Pay with
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
          {([['apple', ' Apple Pay'], ['card', 'Card']] as const).map(([m, label]) => {
            const on = method === m;
            return (
              <button
                key={m}
                onClick={() => { haptic('light'); setMethod(m); }}
                style={{
                  flex: 1, height: 52, borderRadius: 14, cursor: 'pointer',
                  border: on ? `1.5px solid ${RC.inkStrong}` : `1.5px solid ${RC.line}`,
                  background: on ? RC.gradSoft : RC.paper, color: RC.ink,
                  fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {m === 'apple' && <svg width="15" height="18" viewBox="0 0 384 512" fill={RC.ink}><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-20.6-29.4-51.7-45.6-92.8-48.8-39-3-81.5 22.9-97 22.9-16.4 0-54-22.4-83.2-21.9-42.9.6-82.5 25-104.6 63.4-44.6 77.4-11.4 191.8 31.9 254.6 21.2 30.8 46.3 65.3 79.5 64.1 31.9-1.3 43.9-20.7 82.5-20.7 38.5 0 49.4 20.7 83.2 20 34.4-.6 56.1-31.1 77-62 24.3-35.6 34.3-70.1 34.8-71.9-.7-.3-66.8-25.6-67.5-101.6zM256.3 89.5c17.4-21.1 29.1-50.4 25.9-79.5-25 1-55.3 16.6-73.3 37.7-16.1 18.7-30.2 48.6-26.4 77.2 27.9 2.2 56.4-14.2 73.8-35.4z" /></svg>}
                {label}
              </button>
            );
          })}
        </div>

        {err && (
          <div style={{ marginTop: 14, padding: '11px 14px', borderRadius: 12, background: 'rgba(229,67,26,0.10)', border: '1px solid rgba(229,67,26,0.22)', fontFamily: 'var(--font)', fontSize: 12.5, color: '#B7341A' }}>
            {err}
          </div>
        )}

        <div style={{ marginTop: 14, fontFamily: 'var(--font)', fontSize: 11.5, color: RC.inkMute, lineHeight: 1.5, textAlign: 'center' }}>
          Secured by Stripe · No hidden fees · Cancel anytime
        </div>
      </div>

      <div style={{ padding: '14px 24px 24px', borderTop: `1px solid ${RC.line}`, background: RC.glass }}>
        <RingoButton disabled={busy} onClick={pay}>
          {busy ? 'Processing…' : `Pay ${price} — subscribe`}
        </RingoButton>
      </div>
    </div>
  );
}
