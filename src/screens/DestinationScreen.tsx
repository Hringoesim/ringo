// DestinationScreen: one destination's plans, straight from the site's
// catalogue endpoint. Since 2026-09-26 (owner rule) Global is the only
// subscription; every region, country and trip is one payment. So the plans
// are ONE list of cards, each naming its duration and data together ("2
// weeks, 10 GB", "7 days, Unlimited"), cheapest first and chosen, with a
// Data / Unlimited switch only where both are sold. The duration comes from
// the term code in the product id (lib/terms.ts), in the website's words.
//
// Global reads as the website sells it (owner 2026-10-23): one plan,
// Unlimited at full speed, a monthly price, no size to pick, on the site's
// dark plan card. The site tops a card buyer up automatically at 90%; an App
// Store buyer has no card on file, so the app says the top-up is one tap on
// My eSIM. A member price is labelled "Your Rewards price".
//
// Layout follows the live width: on a phone the photo is a hero with the
// plans on a sheet over it and a floating Continue bar; on a wide screen
// (iPhone Duo open) the photo is a large card on the left with the ticks
// under it, and the plans and Continue sit in a readable column on the right.
// Nothing here decides a price.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { PlaceMosaic } from '../components/PlaceMosaic';
import { RC, RADIUS, TYPE, typeFor, hexA, cardSurface, SHADOW_CARD, SKINS, ON_DARK, PHOTO_OVERLAY, PHOTO_TEXT_SHADOW } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn, Segmented, TickList, ErrorBox } from '../components/ui';
import { termTitle, planName, periodWord, lineKey, subMonths } from '../lib/terms';
import { hasMosaic, pictureFor, skyFor, bundledPictureFor, type Destination } from '../data/destinations';
import { useDestinations, destinationFrom } from '../store/destinations';
import { useAccount } from '../store/account';
import { light, type Catalog, type Plan } from '../api/light';
import { loadProducts, iapAvailable, type IapProduct } from '../lib/iap';
import { rememberAppleLines } from '../store/summary';
import { useLiveTick } from '../store/live';
import { priceOf } from '../lib/purchase';
import { haptic, hapticSelection } from '../lib/haptics';
import { useLayout, contentColumn, type Layout } from '../lib/layout';
import { requestLightStatusBar } from '../lib/statusBar';

export interface Selection {
  destination: string;
  destinationLabel: string;
  plan: Plan;
  data_gb: number | null;
  /** Apple's product and price for this line */
  product: IapProduct | null;
}

type Tier = 'data' | 'unlimited';

const SHEET_RADIUS = 28;
const GLOBAL_TICKS = ['Unlimited data at full speed', 'One plan, renews until you cancel', 'One price, no roaming bills', 'Data only, next to your own SIM and number'];
const DATA_TICKS = ['Full speed, no daily cap', 'Hotspot included', 'Data only, next to your own SIM'];
const UNLIMITED_TICKS = ['Unlimited data', 'Hotspot included', 'Data only, next to your own SIM'];

// One short line under a card's name. A one-off says it is one payment; a
// subscription says it renews.
function termLine(p: Plan, total: string): string {
  if (p.mode === 'payment') return 'One payment, no renewal';
  const per = periodWord(p);
  return per === 'month' ? 'Renews monthly' : `${total} every ${per}, renews`;
}

/** What a card's big figure is, as a number to sort by: a one-off's price, a subscription's month. Apple's on the phone, else the catalogue's. */
function shownCost(p: Plan, product: IapProduct | null): number {
  if (p.mode === 'subscription') return product ? product.price / subMonths(p) : p.monthly_amount;
  return product ? product.price : p.billed_upfront_amount;
}

function Check({ on }: { on: boolean }) {
  return (
    <span aria-hidden style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? RC.gradCta : 'transparent', border: on ? 'none' : `2px solid ${RC.lineStrong}`, transition: 'transform .2s', transform: on ? 'scale(1)' : 'scale(0.92)' }}>
      {on && (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M3.5 8.5l3 3 6-7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

/** The destination's photograph (the Global mosaic for Global), filling its positioned parent. */
function Photo({ id, eager = true }: { id: string; eager?: boolean }) {
  if (hasMosaic(id)) return <PlaceMosaic id={id} />;
  return (
    <img
      src={pictureFor(id)}
      alt=""
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={(e) => {
        const el = e.currentTarget as HTMLImageElement;
        const b = bundledPictureFor(id);
        if (b && !el.src.endsWith(b)) el.src = b;
        else el.style.display = 'none';
      }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );
}

/** Flag + name in white over the photo, and the coverage line under it. */
function PhotoTitle({ l, dest, name, coverage }: { l: Layout; dest: Destination | null; name: string; coverage: string }) {
  return (
    <div style={{ color: '#fff', textShadow: PHOTO_TEXT_SHADOW }}>
      <h1 style={{ margin: 0, ...typeFor('hero', l.size), color: '#fff' }}>
        {dest?.flag ? <span aria-hidden>{dest.flag} </span> : null}{name}
      </h1>
      {coverage && <p style={{ margin: '6px 0 0', ...TYPE.small, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>{coverage}</p>}
    </div>
  );
}

/** A light plan card: duration and data, one line, the price. */
function PlanCard({ p, on, price, onPick }: { p: Plan; on: boolean; price: { total: string; monthly: string }; onPick: () => void }) {
  const sub = p.mode === 'subscription';
  return (
    <button
      type="button"
      className="press"
      onClick={onPick}
      aria-pressed={on}
      style={{
        textAlign: 'left', cursor: 'pointer', width: '100%', font: 'inherit',
        padding: '18px 18px 18px 16px', borderRadius: RADIUS.card,
        background: RC.paper,
        // The same 2px border on every card so choosing one shifts nothing.
        border: `2px solid ${on ? RC.inkStrong : RC.line}`,
        boxShadow: on ? `0 0 0 4px ${hexA('#FF5724', 0.14)}, ${SHADOW_CARD}` : SHADOW_CARD,
        display: 'flex', alignItems: 'center', gap: 14,
      }}
    >
      <Check on={on} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TYPE.h2, color: RC.ink }}>{planName(p)}</div>
        <div style={{ marginTop: 4, ...TYPE.small, color: RC.ink2 }}>{termLine(p, price.total)}</div>
        {p.member_pct ? <div style={{ marginTop: 4, fontFamily: 'var(--font)', fontSize: 15, fontWeight: 700, color: RC.purpleInk }}>Your Rewards price</div> : null}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ ...TYPE.price, fontSize: 26, color: RC.ink, fontVariantNumeric: 'tabular-nums' }}>{sub ? price.monthly : price.total}</div>
        <div style={{ marginTop: 4, ...TYPE.caption, color: RC.inkMute }}>{sub ? 'a month' : `for ${termTitle(p)}`}</div>
      </div>
    </button>
  );
}

/** Global on the site's dark plan card: Unlimited, the month's price, the ticks. */
function GlobalCard({ l, p, price }: { l: Layout; p: Plan; price: { total: string; monthly: string } }) {
  return (
    <div style={{ background: SKINS.unlimited, borderRadius: RADIUS.card, border: `1px solid ${ON_DARK.line}`, boxShadow: '0 18px 40px -20px rgba(147,33,79,0.55)', padding: l.isWide ? 28 : 20, color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ ...TYPE.h1, color: '#fff' }}>Unlimited</div>
        {p.member_pct ? (
          <span style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, color: 'hsl(142,70%,64%)', background: 'hsla(142,60%,45%,0.20)', borderRadius: RADIUS.pill, padding: '5px 11px' }}>Your Rewards price</span>
        ) : null}
      </div>
      <div style={{ marginTop: 4, ...TYPE.small, color: ON_DARK.text2 }}>One plan, everywhere you go</div>
      <div style={{ marginTop: 18, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ ...typeFor('priceHero', l.size), color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{price.monthly}</span>
        <span style={{ ...TYPE.small, color: ON_DARK.text2 }}>a month</span>
      </div>
      <TickList items={GLOBAL_TICKS} onDark size={16} style={{ marginTop: 18 }} />
    </div>
  );
}

export function DestinationScreen({ id, onBack, onContinue }: { id: string; onBack: () => void; onContinue: (s: Selection) => void }) {
  const l = useLayout();
  const dest = destinationFrom(useDestinations(), id);
  const acct = useAccount();
  const member = acct ? { userId: acct.userId, t: acct.t } : null;
  const memberKey = acct ? acct.userId : '';
  const [cat, setCat] = useState<Catalog | null>(null);
  const [products, setProducts] = useState<Map<string, IapProduct> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>('data');
  const [planId, setPlanId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // On a phone the photos stay under the clock (only the sheet scrolls): light text over them.
  useEffect(() => {
    if (l.isWide) return;
    requestLightStatusBar(true);
    return () => requestLightStatusBar(false);
  }, [l.isWide]);

  useEffect(() => {
    let alive = true;
    setCat(null); setProducts(null); setErr(null);
    light.catalog(id, member).then(async (c) => {
      if (!alive) return;
      setCat(c);
      // Not c.default_plan: the screen opens on the cheapest line (below).
      setPlanId(null);
      // A destination sold only as Unlimited opens on Unlimited.
      setTier((t) => (c.plans.some((p) => p.tier === t) ? t : (c.plans[0]?.tier ?? 'data')));
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `member` follows memberKey
  }, [id, reloadKey, memberKey]);

  // Back in the foreground: the plans and prices again, from the site and
  // from the App Store, swapped in place. The screen keeps what was chosen
  // when it is still sold; a line gone after a reprice falls back to the
  // cheapest (the effect below). An answer that fails keeps the last one.
  const tick = useLiveTick();
  const openedAt = useRef(tick);
  useEffect(() => {
    if (tick === openedAt.current) return;
    let alive = true;
    light.catalog(id, member).then(async (c) => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `member` follows memberKey
  }, [tick, id, memberKey]);

  const native = iapAvailable();
  const productFor = (p: Plan): IapProduct | null => (p.apple_product_id && products?.get(p.apple_product_id)) || null;
  const unlimitedGlobal = Boolean(cat && cat.destination.id === 'global' && cat.meter_topups);
  // One list for the tier shown, cheapest first (owner 2026-09-25: the first
  // price seen is the cheapest); a tie goes to the shorter, then the smaller.
  const plans = useMemo(() => {
    if (!cat) return [];
    const get = (p: Plan) => (p.apple_product_id && products?.get(p.apple_product_id)) || null;
    const sold = (p: Plan) => !native || Boolean(products && p.apple_product_id && products.has(p.apple_product_id));
    // Global: the one monthly plan the website sells.
    if (cat.destination.id === 'global' && cat.meter_topups) {
      const one = cat.plans.filter((p) => p.mode === 'subscription' && sold(p)).sort((a, b) => (a.data_gb ?? 0) - (b.data_gb ?? 0))[0];
      return one ? [one] : [];
    }
    return cat.plans
      .filter((p) => p.tier === tier && sold(p))
      .sort((a, b) => (shownCost(a, get(a)) - shownCost(b, get(b))) || ((a.days || 30) - (b.days || 30)) || ((a.data_gb ?? 0) - (b.data_gb ?? 0)));
  }, [cat, tier, native, products]);

  // The cheapest is chosen (owner 2026-09-25), and a choice still sold is kept.
  useEffect(() => {
    if (!plans.length) return;
    if (plans.some((p) => lineKey(p) === planId)) return;
    setPlanId(lineKey(plans[0]));
  }, [plans, planId]);

  const selected = plans.find((p) => lineKey(p) === planId) || null;
  const tiers = new Set(cat?.plans.map((p) => p.tier) ?? []);
  const hasBothTiers = !unlimitedGlobal && tiers.has('data') && tiers.has('unlimited');
  const name = dest?.label || cat?.destination.label || id;
  const coverage = cat ? cat.destination.coverage_line : dest ? (dest.countries > 1 ? `Works in ${dest.countries} countries` : `Works across ${dest.label}`) : '';

  const continueTap = () => {
    if (!cat || !selected) return;
    haptic('medium');
    onContinue({ destination: id, destinationLabel: cat.destination.id === id ? cat.destination.label : `${dest?.label || id} (${cat.destination.label} plan)`, plan: selected, data_gb: selected.tier === 'data' ? selected.data_gb : null, product: productFor(selected) });
  };
  const retry = () => { setErr(null); setProducts(null); setReloadKey((k) => k + 1); };
  const loadingPrices = native && cat && !products;
  const loading = (!cat || loadingPrices) && !err;
  const selectedPrice = selected ? priceOf(selected, productFor(selected)) : null;

  // ── Pieces shared by both layouts ────────────────────────────────────────
  const errorBlock = err && (
    <div>
      <ErrorBox>{err} Check your connection and try again.</ErrorBox>
      <div style={{ marginTop: 12 }}>
        <RingoButton variant="soft" onClick={retry}>Try again</RingoButton>
      </div>
    </div>
  );

  const skeleton = loading && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: l.cardGap }} aria-busy="true" aria-label="Loading plans">
      {[0, 1, 2].map((i) => <div key={i} style={{ height: 96, borderRadius: RADIUS.card, background: RC.cream, border: `1.5px solid ${RC.line}`, animation: 'ringoSheen 1.4s ease-in-out infinite' }} />)}
    </div>
  );

  const ticks = !unlimitedGlobal && cat && !loadingPrices && plans.length > 0 && (
    <TickList items={tier === 'unlimited' ? UNLIMITED_TICKS : DATA_TICKS} />
  );

  const planList: ReactNode = cat && !loadingPrices && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: l.cardGap }}>
      {hasBothTiers && (
        <Segmented<Tier> ariaLabel="Plan type" value={tier} options={[{ id: 'data', label: 'Data' }, { id: 'unlimited', label: 'Unlimited' }]} onChange={setTier} />
      )}
      {plans.length === 0 && (
        <div style={{ ...cardSurface(), padding: 18 }}>
          {native && products && products.size === 0
            ? (
              <>
                <div style={{ ...TYPE.body, color: RC.ink }}>The App Store did not answer just now.</div>
                <div style={{ marginTop: 12 }}><RingoButton size="sm" variant="soft" full={false} onClick={retry}>Try again</RingoButton></div>
              </>
            )
            : <div style={{ ...TYPE.body, color: RC.ink }}>Not sold here yet.{hasBothTiers ? ' Try the other plan type.' : ''}</div>}
        </div>
      )}
      {unlimitedGlobal && plans[0] && (
        <GlobalCard l={l} p={plans[0]} price={priceOf(plans[0], productFor(plans[0]))} />
      )}
      {!unlimitedGlobal && plans.map((p) => {
        const key = lineKey(p);
        return <PlanCard key={key} p={p} on={key === planId} price={priceOf(p, productFor(p))} onPick={() => { hapticSelection(); setPlanId(key); }} />;
      })}
    </div>
  );

  const notes = cat && !loadingPrices && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {unlimitedGlobal && <p style={{ margin: 0, ...TYPE.small, color: RC.ink2 }}>Use a lot? Add a top-up from My eSIM in one tap.</p>}
      {selected && selected.mode === 'subscription' && selectedPrice && (
        <p style={{ margin: 0, ...TYPE.caption, color: RC.inkMute }}>
          Renews at {selectedPrice.total} every {periodWord(selected)} through your Apple ID until you cancel in Settings, then Apple ID, then Subscriptions.
        </p>
      )}
    </div>
  );

  // ── Wide (iPhone Duo open, 600pt and up): photo left, plans right ─────────
  if (l.isWide) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <RingoHeader leading={<BackBtn onClick={onBack} />} title={name} />
        <div className="no-bar" style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}>
          <div style={{ ...contentColumn(l), display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)', gap: 28, alignItems: 'start' }}>
            <div style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ position: 'relative', aspectRatio: '4 / 3', borderRadius: RADIUS.card, overflow: 'hidden', background: skyFor(id), border: `1.5px solid ${RC.line}`, boxShadow: SHADOW_CARD }}>
                <Photo id={id} />
                <div aria-hidden style={{ position: 'absolute', inset: 0, background: PHOTO_OVERLAY }} />
                <div style={{ position: 'absolute', left: 22, right: 22, bottom: 20 }}>
                  <PhotoTitle l={l} dest={dest} name={name} coverage={coverage} />
                </div>
              </div>
              {ticks}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
              {errorBlock}
              {skeleton}
              {planList}
              {selected && selectedPrice && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <RingoButton onClick={continueTap}>{`Continue, ${selectedPrice.total}${selected.mode === 'subscription' ? ' today' : ''}`}</RingoButton>
                </div>
              )}
              {notes}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Phone: photo hero, a sheet over it, a floating Continue bar ──────────
  const heroH = l.isCover ? 220 : 248;
  const footer: CSSProperties = {
    position: 'absolute', left: 12, right: 12, bottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
    padding: 8, paddingLeft: 18, borderRadius: SHEET_RADIUS + 4, background: RC.paper, border: `1.5px solid ${RC.line}`,
    boxShadow: '0 2px 8px rgba(26,15,46,0.06), 0 18px 40px -16px rgba(26,15,46,0.30)', display: 'flex', alignItems: 'center', gap: 12,
  };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'relative', height: heroH, flexShrink: 0, background: skyFor(id), overflow: 'hidden' }}>
        <Photo id={id} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(26,15,46,0.30) 0%, rgba(26,15,46,0) 32%, rgba(26,15,46,0.78) 100%)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>
          <RingoHeader leading={<BackBtn onClick={onBack} />} />
        </div>
        <div style={{ position: 'absolute', left: l.gutter, right: l.gutter, bottom: SHEET_RADIUS + 12 }}>
          <PhotoTitle l={l} dest={dest} name={name} coverage={coverage} />
        </div>
      </div>

      {/* The content sheet rides up over the photo so the screen reads as layers. */}
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', position: 'relative', marginTop: -SHEET_RADIUS, borderRadius: `${SHEET_RADIUS}px ${SHEET_RADIUS}px 0 0`, background: RC.bg, boxShadow: '0 -10px 24px -16px rgba(26,15,46,0.45)', padding: `22px ${l.gutter}px 160px`, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {errorBlock}
        {skeleton}
        {planList}
        {ticks}
        {notes}
      </div>

      {cat && selected && selectedPrice && (
        <div style={footer}>
          <div style={{ flexShrink: 1, minWidth: 0, fontFamily: 'var(--font)' }}>
            <div style={{ ...TYPE.caption, color: RC.inkMute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{planName(selected)}</div>
            <div style={{ marginTop: 2, fontSize: 19, fontWeight: 800, lineHeight: 1.2, color: RC.ink, letterSpacing: '-0.02em', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              {selectedPrice.total}{selected.mode === 'subscription' ? ' today' : ''}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 132 }}>
            <RingoButton round onClick={continueTap}>Continue</RingoButton>
          </div>
        </div>
      )}
    </div>
  );
}
