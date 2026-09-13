// DestinationScreen — one destination's plans, straight from the site's
// catalogue endpoint. Data plans in 10 / 20 GB with their terms (30 days in
// one payment where sold, and the renewing 2 / 6 / 12-month ladder on
// regions), and the Unlimited tier by duration. The buyer picks one and
// continues to pay; nothing here decides a price.
import { useEffect, useMemo, useState } from 'react';
import { RC, RADIUS, SHADOW_CARD, SHADOW_RAISED } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn } from '../components/ui';
import { destinationById, pictureFor } from '../data/destinations';
import { light, money, type Catalog, type Plan } from '../api/light';
import { haptic, hapticSelection } from '../lib/haptics';

export interface Selection {
  destination: string;
  destinationLabel: string;
  plan: Plan;
  data_gb: number | null;
  currency: string;
}

type Tier = 'data' | 'unlimited';

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  const idx = Math.max(0, options.findIndex((o) => o.id === value));
  return (
    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, padding: 4, borderRadius: 14, background: RC.cream, border: `1px solid ${RC.line}` }}>
      <div aria-hidden style={{ position: 'absolute', top: 4, bottom: 4, left: 4, width: `calc((100% - 8px) / ${options.length})`, borderRadius: 11, background: RC.paper, boxShadow: SHADOW_CARD, transform: `translateX(${idx * 100}%)`, transition: 'transform 0.3s cubic-bezier(0.34, 1.4, 0.64, 1)' }} />
      {options.map((o) => (
        <button key={o.id} onClick={() => { hapticSelection(); onChange(o.id); }} style={{ position: 'relative', border: 'none', background: 'transparent', cursor: 'pointer', height: 38, fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700, color: o.id === value ? RC.ink : RC.inkMute, transition: 'color .2s' }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function termTitle(p: Plan): string {
  if (p.mode === 'payment') return p.days === 30 ? '30 days' : `${p.days} days`;
  if (p.term_months === 12) return '12 months';
  return `${p.term_months} months`;
}
function termSub(p: Plan): string {
  if (p.mode === 'payment') return 'One payment, no renewal';
  return `${money(p.billed_upfront_amount, p.currency)} every ${p.term_months === 12 ? 'year' : `${p.term_months} months`}, cancel anytime`;
}

export function DestinationScreen({ id, onBack, onContinue }: { id: string; onBack: () => void; onContinue: (s: Selection) => void }) {
  const dest = destinationById(id);
  const [cat, setCat] = useState<Catalog | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>('data');
  const [gb, setGb] = useState<number | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setCat(null); setErr(null);
    light.catalog(id).then((c) => {
      if (!alive) return;
      setCat(c);
      setGb(c.default_data_gb);
      setPlanId(c.default_plan);
    }).catch((e: Error) => { if (alive) setErr(e.message || 'Could not load the plans.'); });
    return () => { alive = false; };
  }, [id]);

  const plans = useMemo(() => {
    if (!cat) return [];
    return cat.plans.filter((p) => p.tier === tier && (tier === 'unlimited' || p.data_gb === gb));
  }, [cat, tier, gb]);

  // Keep the selection valid when the tier or size changes.
  useEffect(() => {
    if (!plans.length) return;
    if (!plans.some((p) => p.plan === planId)) {
      const rec = plans.find((p) => p.recommended) || plans[0];
      setPlanId(rec.plan);
    }
  }, [plans, planId]);

  const selected = plans.find((p) => p.plan === planId) || null;
  const sizes = cat?.sizes || [];

  const continueTap = () => {
    if (!cat || !selected) return;
    haptic('medium');
    onContinue({ destination: id, destinationLabel: cat.destination.label, plan: selected, data_gb: selected.tier === 'data' ? gb : null, currency: cat.currency });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ position: 'relative', height: 200, flexShrink: 0, background: RC.cream2 }}>
        <img src={pictureFor(id)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,10,30,0.25) 0%, rgba(20,10,30,0) 35%, rgba(20,10,30,0.7) 100%)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>
          <RingoHeader leading={<BackBtn onClick={onBack} />} />
        </div>
        <div style={{ position: 'absolute', left: 20, right: 20, bottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: -0.8, lineHeight: 1.05, textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}>
            {dest?.flag ? `${dest.flag} ` : ''}{cat?.destination.label || dest?.label || id}
          </div>
          <div style={{ marginTop: 4, fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
            {cat?.destination.coverage_line || (dest ? (dest.countries === 1 ? `Works across ${dest.label}` : `Works in ${dest.countries} countries`) : '')}
          </div>
        </div>
      </div>

      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 150px' }}>
        {err && (
          <div style={{ padding: 14, borderRadius: 14, background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.2)', fontFamily: 'var(--font)', fontSize: 13.5, color: '#A12C2C', lineHeight: 1.5 }}>
            {err} Check your connection and go back to try again.
          </div>
        )}
        {!cat && !err && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2].map((i) => <div key={i} style={{ height: 72, borderRadius: RADIUS.lg, background: RC.cream, animation: 'ringoSheen 1.4s ease-in-out infinite' }} />)}
          </div>
        )}
        {cat && (
          <>
            <Segmented<Tier> value={tier} options={[{ id: 'data', label: 'Data' }, { id: 'unlimited', label: 'Unlimited' }]} onChange={setTier} />

            {tier === 'data' && sizes.length > 1 && (
              <div style={{ marginTop: 12 }}>
                <Segmented<string> value={String(gb)} options={sizes.map((s) => ({ id: String(s), label: `${s} GB` }))} onChange={(v) => setGb(Number(v))} />
              </div>
            )}

            <div style={{ marginTop: 14, fontFamily: 'var(--font)', fontSize: 13.5, color: RC.inkMute, lineHeight: 1.5 }}>
              {tier === 'data'
                ? (selected?.allowance || `${gb} GB of data, full speed, no daily cap`)
                : `${cat.unlimited_line} (see the Terms).`}
            </div>

            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {plans.map((p) => {
                const on = p.plan === planId;
                return (
                  <button
                    key={p.plan}
                    className="press"
                    onClick={() => { hapticSelection(); setPlanId(p.plan); }}
                    style={{
                      textAlign: 'left', cursor: 'pointer', width: '100%',
                      padding: '14px 16px', borderRadius: RADIUS.lg, background: RC.paper,
                      border: `1.5px solid ${on ? RC.inkStrong : RC.line}`,
                      boxShadow: on ? SHADOW_RAISED : SHADOW_CARD,
                      display: 'flex', alignItems: 'center', gap: 12,
                      transition: 'border-color .18s, box-shadow .18s',
                    }}
                  >
                    <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, border: `2px solid ${on ? RC.inkStrong : RC.lineStrong}`, background: on ? RC.grad : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {on && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font)', fontSize: 15.5, fontWeight: 700, color: RC.ink, letterSpacing: -0.2 }}>{termTitle(p)}</span>
                        {p.recommended && <span style={{ fontFamily: 'var(--font)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: RC.inkStrong, background: RC.gradSoft, borderRadius: 999, padding: '3px 8px' }}>Popular</span>}
                      </div>
                      <div style={{ marginTop: 2, fontFamily: 'var(--font)', fontSize: 12.5, color: RC.inkMute }}>{termSub(p)}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800, color: RC.ink, letterSpacing: -0.5 }}>{money(p.monthly_amount, p.currency)}</div>
                      {p.mode === 'subscription' && <div style={{ fontFamily: 'var(--font)', fontSize: 11, color: RC.inkMute }}>a month</div>}
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: RADIUS.lg, background: RC.cream, fontFamily: 'var(--font)', fontSize: 13, color: RC.ink, lineHeight: 1.55 }}>
              <div style={{ fontWeight: 700 }}>How it works</div>
              <div style={{ marginTop: 4, color: RC.inkMute }}>Pay, and your eSIM is ready in the app within a minute. Install it in one tap, keep your own SIM for calls, and turn on Ringo data when you land. Works on any eSIM iPhone (XS and newer).</div>
            </div>
          </>
        )}
      </div>

      {cat && selected && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 20px max(20px, env(safe-area-inset-bottom, 0px))', background: RC.glass, borderTop: `1px solid ${RC.line}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, fontFamily: 'var(--font)' }}>
            <span style={{ fontSize: 13, color: RC.inkMute }}>{cat.destination.label} · {selected.tier === 'unlimited' ? 'Unlimited' : `${gb} GB`} · {termTitle(selected)}</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: RC.ink }}>{money(selected.billed_upfront_amount, selected.currency)}{selected.mode === 'subscription' ? ' today' : ''}</span>
          </div>
          <RingoButton onClick={continueTap}>Continue</RingoButton>
        </div>
      )}
    </div>
  );
}
