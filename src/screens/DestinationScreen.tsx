// DestinationScreen — one destination's plans, straight from the site's
// catalogue endpoint. Since 2026-09-26 (owner rule) Global is the only
// subscription; every region, country and trip is one payment. So the plans
// are ONE list of cards, each naming its duration and data together ("2
// weeks, 10 GB", "30 days, 20 GB", "7 days, Unlimited"), cheapest first and
// chosen, with a Data / Unlimited switch only where both are sold. The
// duration comes from the term code in the product id (lib/terms.ts), in
// the website's words. Global is a monthly App Store subscription (owner
// 2026-09-27): its cards read "Monthly, 10 GB a month" at the month's price,
// and only there is renewal stated.
// Nothing here decides a price.
import { useEffect, useMemo, useRef, useState } from 'react';
import { RC, RADIUS, hexA } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn, Segmented } from '../components/ui';
import { termTitle, planName, periodWord, lineKey, subMonths } from '../lib/terms';
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

// Card copy: duration and data as the title, one short line, the price. A
// one-off says it is one payment; a subscription gives its term's total and
// that it renews, and its price is per month.
function termLine(p: Plan, total: string): string {
  if (p.mode === 'payment') return 'One payment, no renewal';
  const per = periodWord(p);
  return per === 'month' ? 'Renews monthly' : `${total} per ${per}, renews`;
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

/** What a card's big figure is, as a number to sort by: a one-off's price, a subscription's month. Apple's on the phone, else the catalogue's. */
function shownCost(p: Plan, product: IapProduct | null): number {
  if (p.mode === 'subscription') return product ? product.price / subMonths(p) : p.monthly_amount;
  return product ? product.price : p.billed_upfront_amount;
}

export function DestinationScreen({ id, onBack, onContinue }: { id: string; onBack: () => void; onContinue: (s: Selection) => void }) {
  const dest = destinationFrom(useDestinations(), id);
  const [cat, setCat] = useState<Catalog | null>(null);
  const [products, setProducts] = useState<Map<string, IapProduct> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>('data');
  const [planId, setPlanId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setCat(null); setProducts(null); setErr(null);
    light.catalog(id).then(async (c) => {
      if (!alive) return;
      setCat(c);
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
      if (map.size || !iapAvailable()) setProducts(map);
      setErr(null);
      rememberAppleLines([id, c.destination.id], c.plans);
    }).catch(() => { /* the last answer stands */ });
    return () => { alive = false; };
  }, [tick, id]);

  const native = iapAvailable();
  const productFor = (p: Plan): IapProduct | null => (p.apple_product_id && products?.get(p.apple_product_id)) || null;
  // One list for the tier shown, cheapest first (owner 2026-09-25: the first
  // price seen is the cheapest); a tie goes to the shorter, then the smaller.
  const plans = useMemo(() => {
    if (!cat) return [];
    const get = (p: Plan) => (p.apple_product_id && products?.get(p.apple_product_id)) || null;
    return cat.plans
      .filter((p) => p.tier === tier && (!native || (products && p.apple_product_id && products.has(p.apple_product_id))))
      .sort((a, b) => (shownCost(a, get(a)) - shownCost(b, get(b))) || ((a.days || 30) - (b.days || 30)) || ((a.data_gb ?? 0) - (b.data_gb ?? 0)));
  }, [cat, tier, native, products]);

  // The cheapest is chosen (owner 2026-09-25), and a choice still sold is kept.
  useEffect(() => {
    if (!plans.length) return;
    if (plans.some((p) => lineKey(p) === planId)) return;
    setPlanId(lineKey(plans[0]));
  }, [plans, planId]);

  const selected = plans.find((p) => lineKey(p) === planId) || null;
  const hasUnlimited = Boolean(cat?.plans.some((p) => p.tier === 'unlimited'));

  const continueTap = () => {
    if (!cat || !selected) return;
    haptic('medium');
    onContinue({ destination: id, destinationLabel: cat.destination.id === id ? cat.destination.label : `${dest?.label || id} (${cat.destination.label} plan)`, plan: selected, data_gb: selected.tier === 'data' ? selected.data_gb : null, product: productFor(selected) });
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

            {/* What every card below delivers, said once. */}
            <div style={{ marginTop: hasUnlimited ? 14 : 0, display: 'flex', flexWrap: 'nowrap', gap: 6, overflow: 'hidden' }}>
              {(tier === 'data'
                ? ['Full speed', 'No daily cap', 'Hotspot']
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
                    : <>Not sold here yet.{hasUnlimited ? ' Try the other tier.' : ''}</>}
                </div>
              )}
              {plans.map((p) => {
                const key = lineKey(p);
                const on = key === planId;
                const price = priceOf(p, productFor(p));
                return (
                  <button
                    key={key}
                    className="plan-card"
                    onClick={() => { hapticSelection(); setPlanId(key); }}
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
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800, color: RC.ink, letterSpacing: -0.4 }}>{planName(p)}</div>
                      <div style={{ marginTop: 4, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 500, color: RC.inkMute }}>{termLine(p, price.total)}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 800, color: RC.ink, letterSpacing: -0.8, lineHeight: 1 }}>{p.mode === 'subscription' ? price.monthly : price.total}</div>
                      <div style={{ marginTop: 4, fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 500, color: RC.inkMute }}>{p.mode === 'subscription' ? 'a month' : `for ${termTitle(p)}`}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {renews && (
              <div style={{ marginTop: 12, fontFamily: 'var(--font)', fontSize: 11.5, color: RC.inkMute, lineHeight: 1.5 }}>
                {selected && selected.mode === 'subscription'
                  ? `Renews ${priceOf(selected, productFor(selected)).total} every ${periodWord(selected)} through your Apple ID until you cancel in Settings.`
                  : 'Subscriptions renew through your Apple ID until cancelled in Settings › Apple ID › Subscriptions.'}
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
            <div style={{ fontSize: 12.5, color: RC.inkMute, whiteSpace: 'nowrap' }}>{planName(selected)}</div>
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
