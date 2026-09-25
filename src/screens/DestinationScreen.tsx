// DestinationScreen — one destination's plans, straight from the site's
// catalogue endpoint: data plans in 10 / 20 GB by term (30 days in one
// payment, monthly, 2, 6 and 12 months where sold) and the Unlimited tier
// by duration. The buyer picks a card and continues to pay; nothing here
// decides a price. Cards carry a term, one short line and the price;
// everything else is said once, in small print (owner 2026-09-18: fewer
// words, a clearer picker).
import { useEffect, useMemo, useState } from 'react';
import { RC, RADIUS, SHADOW_CARD, SHADOW_RAISED } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn } from '../components/ui';
import { pictureFor, skyFor , bundledPictureFor} from '../data/destinations';
import { useDestinations, destinationFrom } from '../store/destinations';
import { light, type Catalog, type Plan } from '../api/light';
import { loadProducts, iapAvailable, type IapProduct } from '../lib/iap';
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

// Card copy: the term as a title, one short line, the price. Renewal is
// stated once under the cards and in full on the purchase screen.
function termTitle(p: Plan): string {
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
      setPlanId(c.default_plan);
      // Apple's products for every line here; a line Apple does not sell is
      // not offered. An empty answer is asked again before it is believed.
      const ids = c.plans.map((p) => p.apple_product_id).filter((x): x is string => Boolean(x));
      let map = await loadProducts(ids);
      for (let i = 0; i < 4 && alive && map.size === 0 && iapAvailable(); i++) {
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        map = await loadProducts(ids, { fresh: true });
      }
      if (alive) setProducts(map);
    }).catch((e: Error) => { if (alive) setErr(e.message || 'Could not load the plans.'); });
    return () => { alive = false; };
  }, [id, reloadKey]);

  const native = iapAvailable();
  const productFor = (p: Plan): IapProduct | null => (p.apple_product_id && products?.get(p.apple_product_id)) || null;
  const plans = useMemo(() => {
    if (!cat) return [];
    return cat.plans.filter((p) => p.tier === tier && (tier === 'unlimited' || p.data_gb === gb) && (!native || (products && p.apple_product_id && products.has(p.apple_product_id))));
  }, [cat, tier, gb, native, products]);

  useEffect(() => {
    if (!plans.length) return;
    if (!plans.some((p) => p.plan === planId)) {
      const rec = plans.find((p) => p.recommended) || plans[0];
      setPlanId(rec.plan);
    }
  }, [plans, planId]);

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
      <div style={{ position: 'relative', height: 180, flexShrink: 0, background: skyFor(id) }}>
        <img src={pictureFor(id)} alt="" onError={(e) => { const el = e.currentTarget as HTMLImageElement; const b = bundledPictureFor(id); if (b && !el.src.endsWith(b)) { el.src = b; } else { el.style.display = 'none'; } }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,10,30,0.25) 0%, rgba(20,10,30,0) 35%, rgba(20,10,30,0.7) 100%)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>
          <RingoHeader leading={<BackBtn onClick={onBack} />} />
        </div>
        <div style={{ position: 'absolute', left: 20, right: 20, bottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: -0.8, lineHeight: 1.05, textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}>
            {dest?.flag ? `${dest.flag} ` : ''}{dest?.label || cat?.destination.label || id}
          </div>
          <div style={{ marginTop: 3, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
            {cat ? cat.destination.coverage_line : (dest ? (dest.countries === 1 ? `Works across ${dest.label}` : `Works in ${dest.countries} countries`) : '')}
          </div>
        </div>
      </div>

      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 150px' }}>
        {err && (
          <div style={{ padding: 14, borderRadius: 14, background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.2)', fontFamily: 'var(--font)', fontSize: 13.5, color: '#A12C2C', lineHeight: 1.5 }}>
            {err} Check your connection and try again.
          </div>
        )}
        {(!cat || loadingPrices) && !err && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2].map((i) => <div key={i} style={{ height: 76, borderRadius: RADIUS.lg, background: RC.cream, animation: 'ringoSheen 1.4s ease-in-out infinite' }} />)}
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
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(tier === 'data'
                ? [`${gb} GB${selected?.mode === 'subscription' ? ' a month' : ''}`, 'Full speed', 'No daily cap', 'Hotspot']
                : ['Unlimited data', 'Fair use', 'Hotspot']
              ).map((t) => (
                <span key={t} style={{ fontFamily: 'var(--font)', fontSize: 12, fontWeight: 700, color: RC.inkStrong, background: RC.gradSoft, borderRadius: 999, padding: '5px 10px' }}>{t}</span>
              ))}
            </div>

            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {plans.length === 0 && (
                <div style={{ padding: 16, borderRadius: RADIUS.lg, background: RC.cream, fontFamily: 'var(--font)', fontSize: 13.5, color: RC.inkMute, lineHeight: 1.5 }}>
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
                    className="press"
                    onClick={() => { hapticSelection(); setPlanId(p.plan); }}
                    aria-pressed={on}
                    style={{
                      textAlign: 'left', cursor: 'pointer', width: '100%',
                      padding: '16px 18px', borderRadius: RADIUS.lg,
                      background: on ? RC.paper : RC.paper,
                      border: `2px solid ${on ? RC.inkStrong : RC.line}`,
                      boxShadow: on ? SHADOW_RAISED : SHADOW_CARD,
                      display: 'flex', alignItems: 'center', gap: 14,
                      transition: 'border-color .18s, box-shadow .18s',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800, color: RC.ink, letterSpacing: -0.4 }}>{termTitle(p)}</span>
                        {b && <span style={{ fontFamily: 'var(--font)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: '#fff', background: RC.grad, borderRadius: 999, padding: '3px 8px' }}>{b}</span>}
                      </div>
                      <div style={{ marginTop: 3, fontFamily: 'var(--font)', fontSize: 13, color: RC.inkMute }}>{termLine(p, price.total)}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: RC.ink, letterSpacing: -0.6, lineHeight: 1 }}>{price.monthly}</div>
                      {p.mode === 'subscription' && <div style={{ marginTop: 3, fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 600, color: RC.inkMute }}>per month</div>}
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
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 20px max(20px, env(safe-area-inset-bottom, 0px))', background: RC.glass, borderTop: `1px solid ${RC.line}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, fontFamily: 'var(--font)' }}>
            <span style={{ fontSize: 13, color: RC.inkMute }}>{selected.tier === 'unlimited' ? 'Unlimited' : `${gb} GB`} · {termTitle(selected)}</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: RC.ink }}>{priceOf(selected, productFor(selected)).total}{selected.mode === 'subscription' ? ' today' : ''}</span>
          </div>
          <RingoButton onClick={continueTap}>Continue</RingoButton>
        </div>
      )}
    </div>
  );
}
