// DestinationScreen — one destination's plans, straight from the site's
// catalogue endpoint: data plans in 10 / 20 GB by term (30 days in one
// payment, monthly, 2, 6 and 12 months where sold) and the Unlimited tier
// by duration. The buyer picks a card and continues to pay; nothing here
// decides a price. Cards carry a term, one short line and the price;
// everything else is said once, in small print (owner 2026-09-18: fewer
// words, a clearer picker).
import { useEffect, useMemo, useRef, useState } from 'react';
import { RC, RADIUS, hexA } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn, Segmented } from '../components/ui';
import { pictureFor, skyFor , bundledPictureFor} from '../data/destinations';
import { useDestinations, destinationFrom } from '../store/destinations';
import { light, type Catalog, type Plan } from '../api/light';
import { loadProducts, iapAvailable, type IapProduct } from '../lib/iap';
import { rememberAppleLines } from '../store/summary';
import { useLiveTick } from '../store/live';
import { priceOf } from '../lib/purchase';
import { haptic, hapticSelection } from '../lib/haptics';

export interface Selection {
  destination: string;
  destinationLabel: string;
  plan: Plan;
  data_gb: number | null;
  /** Apple's product and price for this line */
  product: IapProduct | null;
}

type Tier = 'data' | 'unlimited';

// Card copy: the term as a title, one short line, the price. Renewal is
// stated once under the cards and in full on the purchase screen. The same
// term name is used here, in the footer and at checkout.
// eslint-disable-next-line react-refresh/only-export-components
export function termTitle(p: Plan): string {
  if (p.mode === 'payment') return `${p.days} days`;
  if (p.term_months === 1) return 'Monthly';
  if (p.term_months === 12) return '1 year';
  return `${p.term_months} months`;
}
function termLine(p: Plan, total: string): string {
  if (p.mode === 'payment') return 'One payment';
  if (p.term_months === 1) return 'Billed monthly';
  return `${total} per ${p.term_months === 12 ? 'year' : `${p.term_months} months`}`;
}
function badge(p: Plan, plans: Plan[]): string | null {
  if (p.mode === 'subscription' && p.term_months === 12) return 'Best value';
  if (p.recommended && !plans.some((q) => q.mode === 'subscription' && q.term_months === 12)) return 'Popular';
  return null;
}

// The plans picker's shape (owner 2026-09-27: more modern, more round): cards
// at 26pt corners lifted by a soft shadow instead of a hairline, the chosen
// one raised with a warm brand ring and a filled round check; the content
// sheet overlaps the photo with 28pt corners; the footer floats as a pill.
const PLAN_RADIUS = 26;
const SHEET_RADIUS = 28;
const SHADOW_PLAN = '0 1px 2px rgba(52,28,84,0.05), 0 10px 28px -14px rgba(52,28,84,0.20)';
const SHADOW_PLAN_ON = '0 2px 6px rgba(52,28,84,0.06), 0 18px 36px -16px rgba(255,87,36,0.34)';

function Check({ on }: { on: boolean }) {
  return (
    <span aria-hidden className="plan-check" style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? RC.grad : 'transparent', border: on ? 'none' : `2px solid ${RC.lineStrong}`, transform: on ? 'scale(1)' : 'scale(0.92)' }}>
      {on && (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M3.5 8.5l3 3 6-7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

/** What a line costs in one go: Apple's price on the phone, else the catalogue's. */
function upfront(p: Plan, product: IapProduct | null): number {
  return product ? product.price : p.billed_upfront_amount;
}

export function DestinationScreen({ id, onBack, onContinue }: { id: string; onBack: () => void; onContinue: (s: Selection) => void }) {
  const dest = destinationFrom(useDestinations(), id);
  const [cat, setCat] = useState<Catalog | null>(null);
  const [products, setProducts] = useState<Map<string, IapProduct> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>('data');
  const [gb, setGb] = useState<number | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setCat(null); setProducts(null); setErr(null);
    light.catalog(id).then(async (c) => {
      if (!alive) return;
      setCat(c);
      setGb(c.default_data_gb);
      // Not c.default_plan: the screen opens on the cheapest line (below).
      setPlanId(null);
      // Apple's products for every line here; a line Apple does not sell is
      // not offered. An empty answer is asked again before it is believed.
      const ids = c.plans.map((p) => p.apple_product_id).filter((x): x is string => Boolean(x));
      let map = await loadProducts(ids);
      for (let i = 0; i < 4 && alive && map.size === 0 && iapAvailable(); i++) {
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        map = await loadProducts(ids, { fresh: true });
      }
      if (alive) setProducts(map);
      // The store cards read this destination's "From" from Apple from now on.
      rememberAppleLines([id, c.destination.id], c.plans);
    }).catch((e: Error) => { if (alive) setErr(e.message || 'Could not load the plans.'); });
    return () => { alive = false; };
  }, [id, reloadKey]);

  // Back in the foreground: the plans and prices again, from the site and
  // from the App Store, swapped in place. The screen keeps what was chosen
  // when it is still sold; a line gone after a reprice falls back to the
  // cheapest (the effect below). An answer that fails keeps the last one.
  const tick = useLiveTick();
  const openedAt = useRef(tick);
  useEffect(() => {
    if (tick === openedAt.current) return;
    let alive = true;
    light.catalog(id).then(async (c) => {
      if (!alive) return;
      const ids = c.plans.map((p) => p.apple_product_id).filter((x): x is string => Boolean(x));
      const map = await loadProducts(ids, { fresh: true });
      if (!alive) return;
      setCat(c);
      setGb((g) => (g !== null && c.sizes.includes(g) ? g : c.default_data_gb));
      if (map.size || !iapAvailable()) setProducts(map);
      setErr(null);
      rememberAppleLines([id, c.destination.id], c.plans);
    }).catch(() => { /* the last answer stands */ });
    return () => { alive = false; };
  }, [tick, id]);

  const native = iapAvailable();
  const productFor = (p: Plan): IapProduct | null => (p.apple_product_id && products?.get(p.apple_product_id)) || null;
  const plans = useMemo(() => {
    if (!cat) return [];
    return cat.plans.filter((p) => p.tier === tier && (tier === 'unlimited' || p.data_gb === gb) && (!native || (products && p.apple_product_id && products.has(p.apple_product_id))));
  }, [cat, tier, gb, native, products]);

  useEffect(() => {
    if (!plans.length) return;
    // Cheapest first and selected (owner 2026-09-25): the cheapest one-payment
    // line of this tier, or Monthly when there is none. Never the 1 year.
    if (plans.some((p) => p.plan === planId)) return;
    const cost = (p: Plan) => upfront(p, (p.apple_product_id && products?.get(p.apple_product_id)) || null);
    const once = plans.filter((p) => p.mode === 'payment').sort((a, b) => cost(a) - cost(b));
    setPlanId((once[0] || plans.find((p) => p.mode === 'subscription' && p.term_months === 1) || plans[0]).plan);
  }, [plans, planId, products]);

  const selected = plans.find((p) => p.plan === planId) || null;
  const sizes = cat?.sizes || [];
  const hasUnlimited = Boolean(cat?.plans.some((p) => p.tier === 'unlimited'));

  const continueTap = () => {
    if (!cat || !selected) return;
    haptic('medium');
    onContinue({ destination: id, destinationLabel: cat.destination.id === id ? cat.destination.label : `${dest?.label || id} (${cat.destination.label} plan)`, plan: selected, data_gb: selected.tier === 'data' ? gb : null, product: productFor(selected) });
  };
  const loadingPrices = native && cat && !products;
  const renews = plans.some((p) => p.mode === 'subscription');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ position: 'relative', height: 212, flexShrink: 0, background: skyFor(id) }}>
        <img src={pictureFor(id)} alt="" onError={(e) => { const el = e.currentTarget as HTMLImageElement; const b = bundledPictureFor(id); if (b && !el.src.endsWith(b)) { el.src = b; } else { el.style.display = 'none'; } }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,10,30,0.25) 0%, rgba(20,10,30,0) 35%, rgba(20,10,30,0.7) 100%)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>
          <RingoHeader leading={<BackBtn onClick={onBack} />} />
        </div>
        <div style={{ position: 'absolute', left: 20, right: 20, bottom: SHEET_RADIUS + 12 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: -0.8, lineHeight: 1.05, textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}>
            {dest?.flag ? `${dest.flag} ` : ''}{dest?.label || cat?.destination.label || id}
          </div>
          <div style={{ marginTop: 3, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
            {cat ? cat.destination.coverage_line : (dest ? (dest.countries === 1 ? `Works across ${dest.label}` : `Works in ${dest.countries} countries`) : '')}
          </div>
        </div>
      </div>

      {/* The content sheet rides up over the photo so the screen reads as layers. */}
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', position: 'relative', marginTop: -SHEET_RADIUS, borderRadius: `${SHEET_RADIUS}px ${SHEET_RADIUS}px 0 0`, background: RC.bg, boxShadow: '0 -10px 24px -16px rgba(20,10,30,0.45)', padding: '20px 20px 150px' }}>
        {err && (
          <div style={{ padding: 14, borderRadius: RADIUS.sm, background: RC.errorSoft, fontFamily: 'var(--font)', fontSize: 13.5, color: RC.error, lineHeight: 1.5 }}>
            {err} Check your connection and try again.
          </div>
        )}
        {(!cat || loadingPrices) && !err && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2].map((i) => <div key={i} style={{ height: 84, borderRadius: PLAN_RADIUS, background: RC.cream, animation: 'ringoSheen 1.4s ease-in-out infinite' }} />)}
          </div>
        )}
        {cat && !loadingPrices && (
          <>
            {hasUnlimited && <Segmented<Tier> value={tier} options={[{ id: 'data', label: 'Data' }, { id: 'unlimited', label: 'Unlimited' }]} onChange={setTier} />}

            {tier === 'data' && sizes.length > 1 && (
              <div style={{ marginTop: hasUnlimited ? 10 : 0 }}>
                <Segmented<string> value={String(gb)} options={sizes.map((s) => ({ id: String(s), label: `${s} GB` }))} onChange={(v) => setGb(Number(v))} />
              </div>
            )}

            {/* What every card below delivers, said once. */}
            <div style={{ marginTop: 14, display: 'flex', flexWrap: 'nowrap', gap: 6, overflow: 'hidden' }}>
              {(tier === 'data'
                ? [`${gb} GB${selected?.mode === 'subscription' ? ' a month' : ''}`, 'No daily cap', 'Hotspot']
                : ['Unlimited data', 'Fair use', 'Hotspot']
              ).map((t) => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0, whiteSpace: 'nowrap', fontFamily: 'var(--font)', fontSize: 12, fontWeight: 700, color: RC.inkStrong, background: hexA(RC.inkStrong, 0.08), borderRadius: RADIUS.pill, padding: '7px 11px 7px 9px' }}>
                  <svg aria-hidden width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {t}
                </span>
              ))}
            </div>

            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {plans.length === 0 && (
                <div style={{ padding: 18, borderRadius: PLAN_RADIUS, background: RC.cream, fontFamily: 'var(--font)', fontSize: 13.5, color: RC.inkMute, lineHeight: 1.5 }}>
                  {native && products && products.size === 0
                    ? <>The App Store did not answer just now.<div style={{ marginTop: 10 }}><RingoButton size="sm" variant="soft" full={false} onClick={() => { setProducts(null); setReloadKey((k) => k + 1); }}>Try again</RingoButton></div></>
                    : <>Not sold here yet. Try the other size or tier.</>}
                </div>
              )}
              {plans.map((p) => {
                const on = p.plan === planId;
                const price = priceOf(p, productFor(p));
                const b = badge(p, plans);
                return (
                  <button
                    key={p.plan}
                    className="plan-card"
                    onClick={() => { hapticSelection(); setPlanId(p.plan); }}
                    aria-pressed={on}
                    style={{
                      textAlign: 'left', cursor: 'pointer', width: '100%',
                      // Same 2px border on every card so choosing one shifts
                      // nothing: clear on a calm card, brand orange plus a
                      // soft warm ring on the chosen one.
                      padding: '20px 20px 20px 18px', borderRadius: PLAN_RADIUS,
                      background: RC.paper,
                      border: `2px solid ${on ? RC.inkStrong : RC.scheme === 'dark' ? RC.line : 'transparent'}`,
                      boxShadow: on ? `0 0 0 4px ${hexA(RC.inkStrong, 0.14)}, ${SHADOW_PLAN_ON}` : SHADOW_PLAN,
                      display: 'flex', alignItems: 'center', gap: 14,
                    }}
                  >
                    <Check on={on} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800, color: RC.ink, letterSpacing: -0.4 }}>{termTitle(p)}</span>
                        {b && <span style={{ fontFamily: 'var(--font)', fontSize: 11, fontWeight: 800, letterSpacing: 0.1, color: '#fff', background: RC.grad, borderRadius: RADIUS.pill, padding: '4px 10px', whiteSpace: 'nowrap' }}>{b}</span>}
                      </div>
                      <div style={{ marginTop: 4, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 500, color: RC.inkMute }}>{termLine(p, price.total)}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 800, color: RC.ink, letterSpacing: -0.8, lineHeight: 1 }}>{price.monthly}</div>
                      {p.mode === 'subscription' && <div style={{ marginTop: 4, fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 500, color: RC.inkMute }}>per month</div>}
                    </div>
                  </button>
                );
              })}
            </div>

            {renews && (
              <div style={{ marginTop: 12, fontFamily: 'var(--font)', fontSize: 11.5, color: RC.inkMute, lineHeight: 1.5 }}>
                Monthly and multi-month plans renew through your Apple ID until cancelled in Settings › Apple ID › Subscriptions.
              </div>
            )}
          </>
        )}
      </div>

      {cat && selected && (
        // A floating rounded bar: what is chosen and its total on the left,
        // a round Continue on the right, clear of the home indicator.
        <div style={{ position: 'absolute', left: 12, right: 12, bottom: 'max(12px, env(safe-area-inset-bottom, 0px))', padding: 8, paddingLeft: 20, borderRadius: SHEET_RADIUS + 4, background: RC.paper, border: `1px solid ${RC.line}`, boxShadow: '0 2px 8px rgba(52,28,84,0.06), 0 18px 40px -16px rgba(52,28,84,0.30)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flexShrink: 0, fontFamily: 'var(--font)' }}>
            <div style={{ fontSize: 12.5, color: RC.inkMute, whiteSpace: 'nowrap' }}>{selected.tier === 'unlimited' ? 'Unlimited' : `${gb} GB`} · {termTitle(selected)}</div>
            <div style={{ marginTop: 2, fontSize: 17, fontWeight: 800, color: RC.ink, letterSpacing: -0.3, whiteSpace: 'nowrap' }}>{priceOf(selected, productFor(selected)).total}{selected.mode === 'subscription' ? ' today' : ''}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <RingoButton round onClick={continueTap}>Continue</RingoButton>
          </div>
        </div>
      )}
    </div>
  );
}
