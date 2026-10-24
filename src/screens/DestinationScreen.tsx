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
// Where the supplier sells them, the App Store only day passes (app_plans)
// sit beside the trip plans: a switch between Trip plans, Day plans, Power
// user and Super user. A day group's cards are named by their days ("24
// hours", "3 days"), cheapest first, with one line on the daily allowance.
// They go through the same StoreKit purchase as any plan.
//
// Layout follows the live width: on a phone the photo is a hero with the
// plans on a sheet over it and a floating Continue bar; on a wide screen
// (iPhone Duo open) the photo is a large card on the left with the ticks
// under it, and the plans and Continue sit in a readable column on the right.
// Nothing here decides a price.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { PlaceMosaic } from '../components/PlaceMosaic';
import { RC, RADIUS, TYPE, typeFor, cardSurface, SHADOW_CARD, SKINS, ON_DARK, PHOTO_OVERLAY, PHOTO_TEXT_SHADOW } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn, TickList, ErrorBox } from '../components/ui';
import { termTitle, planName, periodWord, lineKey } from '../lib/terms';
import { hasMosaic, pictureFor, skyFor, bundledPictureFor, type Destination } from '../data/destinations';
import { useDestinations, destinationFrom } from '../store/destinations';
import { useAccount } from '../store/account';
import { light, type Catalog, type Plan } from '../api/light';
import { loadProducts, iapAvailable, type IapProduct } from '../lib/iap';
import { CARD_PAYMENTS } from '../lib/cardPay';
import { rememberAppleLines } from '../store/summary';
import { useLiveTick } from '../store/live';
import { priceOf } from '../lib/purchase';
import { haptic, hapticSelection } from '../lib/haptics';
import { defaultArm, logAb } from '../lib/abtest';
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

/** Which list is shown: the trip plans, or one family of App Store only day passes. */
type Group = 'trip' | 'day' | 'power' | 'super';
const DAY_GROUPS: { id: Exclude<Group, 'trip'>; label: string; line: string }[] = [
  { id: 'day', label: 'Day plans', line: '1 GB a day at full speed, never cut off' },
  { id: 'power', label: 'Power user', line: '3 GB a day at full speed' },
  { id: 'super', label: 'Super user', line: '10 GB a day, for van travel or a hotspot for friends' },
];
const DAY_TICKS = ['Full speed up to the day\'s allowance, then slower', 'Never cut off', 'Data only, next to your own SIM'];

const SHEET_RADIUS = 28;
const GLOBAL_TICKS = ['Unlimited data at full speed', 'One plan, renews until you cancel', 'One price, no roaming bills', 'Data only, next to your own SIM and number'];
const DATA_TICKS = ['Full speed, no daily cap', 'Hotspot included', 'Data only, next to your own SIM'];
const UNLIMITED_TICKS = ['Unlimited data', 'Hotspot included', 'Data only, next to your own SIM'];




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

const isUnlimitedPlan = (p: Plan) => p.tier === 'unlimited' && !p.app_only;

/** A data plan card, the Saily way: the data large, its length under it, the price on the right. */
function PlanCard({ p, on, price, onPick }: { p: Plan; on: boolean; price: { total: string; monthly: string }; onPick: () => void }) {
  const sub = p.mode === 'subscription';
  const unlimited = isUnlimitedPlan(p);
  // A data card names its data and length; an unlimited card its length and the day's amount.
  const title = p.app_only ? termTitle(p) : unlimited ? 'Unlimited' : p.data_gb ? `${p.data_gb} GB` : planName(p);
  // An unlimited card names only its length; the day's amount is said once above the cards.
  const length = p.app_only ? '' : sub ? `Every ${periodWord(p)}` : termTitle(p);
  // True claim only: the 2-week plan is what most people buy (236 of 316 sales, 2026-10-24).
  const popular = !p.app_only && p.plan === 'rl_14';
  return (
    <button type="button" className="press" onClick={onPick} aria-pressed={on}
      style={{ textAlign: 'left', cursor: 'pointer', width: '100%', font: 'inherit', padding: 0, borderRadius: RADIUS.card, position: 'relative', overflow: 'hidden', ...(on ? ringOn(unlimited || Boolean(p.app_only)) : ringOff) }}>
      <div style={{ display: 'flex', gap: 14, padding: '16px 18px 16px 16px' }}>
        <Radio on={on} shade={unlimited || p.app_only ? '#FF42A1' : ORANGE} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontFamily: 'var(--font)', fontSize: 18, fontWeight: 600, color: RC.ink }}>{title}</span>
            <span style={{ fontFamily: 'var(--font)', fontSize: 18, fontWeight: 600, color: RC.ink, fontVariantNumeric: 'tabular-nums' }}>{sub ? price.monthly : price.total}</span>
          </div>
          {length && <div style={{ marginTop: 4, fontFamily: 'var(--font)', fontSize: 15, color: RC.ink2 }}>{length}</div>}
          {popular && <div style={{ marginTop: 4, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: ORANGE }}>Most popular</div>}
          {p.member_pct ? <div style={{ marginTop: 4, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: RC.purpleInk }}>Your Rewards price</div> : null}
        </div>
      </div>
    </button>
  );
}

/**
 * Each plan family wears its own shade (owner 2026-10-24: "power and super
 * use, all these buttons need a different shade"): Trip plans the brand
 * orange, Day plans sunny amber, Power user pink, Super user purple. Text on
 * each solid shade is white, except dark ink on amber, every pair over 4.5:1.
 */

// The plan family icons, the website's way (owner 2026-10-24: "icon and icon
// colours do not match the website ... need an upgrade to feel modern"): a
// filled white glyph on a squircle in the family's sunset gradient, built
// from the site's own tokens (orange #f26122, pink #ff42a1, purple #8652e0,
// yellow #ffcc33). Trip a plane, Day a rising sun, Power a bolt, Super a
// hotspot signal (van travel, sharing the connection with friends).

/**
 * The families that earn the most per sale wear the website's gradient
 * (owner 2026-10-24: "use the gradient to the plans that give us the most
 * margin"): Super user, then Power user (a 7-day Super user in Europe keeps
 * about EUR 41, Power about EUR 14, the 2-week trip about EUR 12). The site's
 * sunset stops (hsl 285 / 330 / 8), taken deeper so white text clears 4.5:1.
 */
/** The plan most people pick (2 weeks: 236 of the last 316 sales, 2026-10-24). */
// Option 1 + 2 (owner 2026-10-24): plum for what is chosen, the website's
// orange button gradient on Continue, the full sunset on the highlight band.
const SUNSET = 'linear-gradient(110deg, #F26122, #FF42A1 55%, #8652E0)';
// One accent on this screen, the website's deep plum (owner 2026-10-24, from a
// swatch of the site's dark sections). White on it reads at 14:1.
// The Airalo way (owner 2026-10-24): cream page, white cards, black for
// what is chosen, black line icons; colour only on Continue.
// Owner 2026-10-24: never a black contour, cream behind everything, the
// orange for the data plans and the gradient for Unlimited, all subtle.
const CREAM = '#FFFAF7';
const ORANGE = '#F26122';
const LINE = 'rgba(26,15,46,0.08)';
/** The accent of a family: solid orange for the data plans, the sunset for Unlimited. */
const accentOf = (unlimited: boolean) => (unlimited ? SUNSET : ORANGE);
/** A thin accent ring on a cream face (a gradient needs the two-layer border trick). */
const ringOn = (unlimited: boolean, width = 1.5) => ({
  border: `${width}px solid transparent`,
  background: `linear-gradient(${CREAM}, ${CREAM}) padding-box, ${accentOf(unlimited)} border-box`,
  boxShadow: `0 10px 24px -18px ${unlimited ? 'rgba(255,66,161,0.55)' : 'rgba(242,97,34,0.55)'}`,
});
const ringOff = { border: `1.5px solid ${LINE}`, background: CREAM, boxShadow: '0 6px 18px -16px rgba(26,15,46,0.25)' };


// Every icon its own colour (owner 2026-10-24), from the website's sunset:
// the plane orange, Unlimited purple; the tiers Day yellow, Super pink, Ultra
// indigo. Each glyph on a soft tint of its colour, chosen or not.




/** Data or Unlimited, each said in one line so a buyer knows what is what. */
/** The plan families a destination shows: Data, Unlimited, and Power where it is competitive. */
type PlanTab = 'data' | 'unl' | 'power';
function PlanTabs({ value, options, onChange }: { value: PlanTab; options: PlanTab[]; onChange: (t: PlanTab) => void }) {
  const icon = (id: PlanTab, on: boolean) => (
    <span aria-hidden style={{ width: 34, height: 34, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
      background: id === 'data' ? 'rgba(242,97,34,0.10)' : 'linear-gradient(135deg, rgba(242,97,34,0.12), rgba(255,66,161,0.12), rgba(134,82,224,0.14))' }}>
      <svg width="19" height="19" viewBox="0 0 24 24">
        {id === 'power'
          ? <path fill={on ? '#D6247A' : RC.ink} d="M13.4 2.2c.4-.6-.3-1.3-.9-.9L4.6 12.2c-.4.5 0 1.3.6 1.3h5.3l-1.9 8.2c-.2.7.7 1.1 1.1.5l9.6-11.6c.4-.5 0-1.2-.6-1.2h-5.6l.3-7.2z" />
          : id === 'data'
          ? <path fill={on ? ORANGE : RC.ink} d="M21.2 14.6v-1.8l-7.6-4.6V3.6c0-.9-.7-1.6-1.6-1.6s-1.6.7-1.6 1.6v4.6l-7.6 4.6v1.8l7.6-2.3v4.9l-2.2 1.6V20l3.8-1.1 3.8 1.1v-1.2l-2.2-1.6v-4.9z" />
          : <path fill="none" stroke={on ? '#D6247A' : RC.ink} strokeWidth="2.3" strokeLinecap="round" d="M7 8.5c-2 0-3.5 1.6-3.5 3.5s1.5 3.5 3.5 3.5c3.5 0 6.5-7 10-7 2 0 3.5 1.6 3.5 3.5s-1.5 3.5-3.5 3.5c-3.5 0-6.5-7-10-7z" />}
      </svg>
    </span>
  );
  const tabs: { id: PlanTab; label: string; line: string }[] = [
    { id: 'data', label: 'Data', line: 'A set amount for your whole trip' },
    { id: 'power', label: 'Power', line: '3 GB a day at full speed' },
    { id: 'unl', label: 'Unlimited', line: 'Full speed every day, never cut off' },
  ];
  return (
    <div role="tablist" aria-label="Plan type" style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: 10 }}>
      {tabs.filter((t) => options.includes(t.id)).map((t) => {
        const on = t.id === value;
        return (
          <button key={t.id} type="button" role="tab" aria-selected={on} className="press" onClick={() => { if (!on) onChange(t.id); }}
            style={{ cursor: 'pointer', textAlign: 'left', padding: '12px 14px', borderRadius: 18, ...(on ? ringOn(t.id !== 'data') : ringOff) }}>
            {icon(t.id, on)}
            <span style={{ display: 'block', fontFamily: 'var(--font)', fontSize: 17, fontWeight: 600, color: RC.ink }}>{t.label}</span>
            <span style={{ display: 'block', marginTop: 2, fontFamily: 'var(--font)', fontSize: 13, color: RC.ink2, lineHeight: 1.35 }}>{t.line}</span>
          </button>
        );
      })}
    </div>
  );
}

/** A plain radio circle; the chosen one fills with its accent. */
function Radio({ on, shade }: { on: boolean; shade: string }) {
  return <span aria-hidden style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, boxSizing: 'border-box', marginTop: 3, border: on ? `6px solid ${shade}` : '1.5px solid rgba(26,15,46,0.3)' }} />;
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
  const [group, setGroup] = useState<Group>('trip');
  // The Saily way (owner 2026-10-24: "look at how apps do this and do the
  // same"): one list, Unlimited as one card with its days and daily amount.
  const [unlGb, setUnlGb] = useState<number | null>(null);
  // Screen 1, the tabs (owner 2026-10-24, after the choice research): Data or
  // Unlimited first, each explained in one line, then that tab's plans.
  const [tab, setTab] = useState<PlanTab>('data');
  const arm = useMemo(() => defaultArm(), []);
  // At most three plans on screen (choice overload), the rest one tap away.
  const [showAll, setShowAll] = useState(false);
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
      setGroup('trip');
      // A destination sold only as Unlimited opens on Unlimited.
      // Apple's products for every line here; a line Apple does not sell is
      // not offered. An empty answer is asked again before it is believed.
      // Paid by card: the site's lines and prices, no App Store products.
      if (CARD_PAYMENTS) { setProducts(new Map()); return; }
      const ids = [...c.plans, ...(c.app_plans ?? [])].map((p) => p.apple_product_id).filter((x): x is string => Boolean(x));
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
      if (CARD_PAYMENTS) { setCat(c); setErr(null); return; }
      const ids = [...c.plans, ...(c.app_plans ?? [])].map((p) => p.apple_product_id).filter((x): x is string => Boolean(x));
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

  // On the phone, a line is on sale when StoreKit returns it, unless it is paid by card.
  const native = iapAvailable() && !CARD_PAYMENTS;
  const productFor = (p: Plan): IapProduct | null => (p.apple_product_id && products?.get(p.apple_product_id)) || null;
  const unlimitedGlobal = Boolean(cat && cat.destination.id === 'global' && cat.meter_topups);
  // One list for the tier shown, cheapest first (owner 2026-09-25: the first
  // price seen is the cheapest); a tie goes to the shorter, then the smaller.
  const isUnlimitedLine = (p: Plan) => Boolean(p.app_only) || p.tier === 'unlimited';
  // Every one-off line on sale here, data and unlimited, keyed by its length.
  const allLines = useMemo(() => {
    if (!cat) return [] as Plan[];
    const sold = (p: Plan) => !native || Boolean(products && p.apple_product_id && products.has(p.apple_product_id));
    return [...cat.plans, ...(cat.app_plans ?? [])].filter(sold);
  }, [cat, native, products]);
  const plans = useMemo(() => {
    if (!cat) return [];
    const sold = (p: Plan) => !native || Boolean(products && p.apple_product_id && products.has(p.apple_product_id));
    // Global: the one monthly plan the website sells.
    if (cat.destination.id === 'global' && cat.meter_topups) {
      const one = cat.plans.filter((p) => p.mode === 'subscription' && sold(p)).sort((a, b) => (a.data_gb ?? 0) - (b.data_gb ?? 0))[0];
      return one ? [one] : [];
    }
    // Fixed data smallest first, then the unlimited lines (shown as one card).
    return [...allLines].sort((a, b) => (Number(Boolean(a.app_only)) - Number(Boolean(b.app_only))) || ((a.data_gb ?? 0) - (b.data_gb ?? 0)) || (a.days - b.days) || ((a.daily_gb ?? 0) - (b.daily_gb ?? 0)));
  }, [cat, allLines, native, products]);
  const byDays = (list: Plan[]) => [...list].sort((a, b) => a.days - b.days);
  // A set amount for the trip: data lines only (an unlimited trip line is not one).
  const dataLines = plans.filter((p) => !p.app_only && p.tier === 'data');
  // Power (3 GB a day) is its own box; the server only sends it where it beats
  // the cheapest rival and still clears cost, so most places show two tabs.
  const powerLines = byDays(plans.filter((p) => p.app_only && p.group === 'power'));
  // The day passes; where none is sold, the unlimited trip lines take the tab.
  const dayPasses = plans.filter((p) => p.app_only && p.group !== 'power');
  const unlLines = dayPasses.length ? dayPasses : plans.filter((p) => !p.app_only && p.tier === 'unlimited');
  // The Unlimited tab: the full-speed amount a day, then one card per length.
  const tierOptions = [...new Set(unlLines.map((p) => p.daily_gb ?? 0))].sort((a, b) => a - b);
  const tierGb = unlGb != null && tierOptions.includes(unlGb) ? unlGb : (tierOptions[0] ?? null);
  const tierLines = unlLines.filter((p) => (p.daily_gb ?? 0) === tierGb).sort((a, b) => a.days - b.days);
  const tabOptions = (['data', 'power', 'unl'] as PlanTab[]).filter((t) => (t === 'data' ? dataLines : t === 'power' ? powerLines : unlLines).length > 0);
  const shownTab: PlanTab = tabOptions.includes(tab) ? tab : (tabOptions[0] ?? 'data');
  // The Recommended line leads its tab (in both arms), so the plan that keeps
  // Ringo the most is the first thing seen; the rest keep their order.
  const leadFirst = (list: Plan[]) => [...list.filter((p) => p.best_margin), ...list.filter((p) => !p.best_margin)];
  const tabLines = leadFirst(shownTab === 'data' ? dataLines : shownTab === 'power' ? powerLines : tierLines);
  // Three on screen: the Recommended one, then the shortest lengths; the chosen
  // line always stays in view.
  const firstThree = tabLines.slice(0, 3);
  const chosenExtra = tabLines.find((p) => lineKey(p) === planId && !firstThree.includes(p));
  const visibleLines = showAll ? tabLines : chosenExtra ? [...firstThree.slice(0, 2), chosenExtra] : firstThree;
  const hiddenCount = showAll ? 0 : tabLines.length - visibleLines.length;
  // The test's default: the cheapest line, or the one that keeps Ringo the most.
  // (tabLines leads with the Recommended line, so the cheapest is looked for, not taken from the top.)
  const cheapestOf = (list: Plan[]) => list.reduce((a, b) => (b.billed_upfront_amount < a.billed_upfront_amount ? b : a), list[0]);
  const defaultOf = (list: Plan[]) => (arm === 'recommended' ? list.find((p) => p.best_margin) : undefined) ?? cheapestOf(list);

  // The chosen line stays while it is in the tab shown; otherwise the test's
  // default for that tab (owner 2026-10-24 replaced "cheapest first" with this test).
  useEffect(() => {
    const list = unlimitedGlobal ? plans : tabLines;
    if (!list.length) return;
    if (list.some((p) => lineKey(p) === planId)) return;
    setPlanId(lineKey(defaultOf(list)));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- defaultOf follows arm
  }, [plans, tabLines, planId, unlimitedGlobal]);
  // One view per screen for the test.
  useEffect(() => { if (cat && !unlimitedGlobal) logAb('view', { destination: id }); }, [cat?.destination.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = plans.find((p) => lineKey(p) === planId) || null;
  // The day families on sale here (a line Apple does not return is not offered).
  const groups = useMemo(() => {
    if (!cat?.app_plans?.length) return [];
    const sold = (p: Plan) => !native || Boolean(products && p.apple_product_id && products.has(p.apple_product_id));
    return DAY_GROUPS.filter((g) => cat.app_plans!.some((p) => p.group === g.id && sold(p)));
  }, [cat, native, products]);
  // A family no longer on sale falls back to the trip plans.
  useEffect(() => {
    if (group !== 'trip' && products && !groups.some((g) => g.id === group)) setGroup('trip');
  }, [group, groups, products]);
  const onTrip = group === 'trip';
  // Continue wears the chosen family's shade, like its tile and cards.
  // Two buttons (owner 2026-10-24): solid orange on the data plans, the
  // sunset gradient once you are on Unlimited.
  const ctaStyle = !(selected && isUnlimitedLine(selected))
    ? { background: ORANGE, color: '#FFFFFF', boxShadow: '0 10px 22px -16px rgba(242,97,34,0.8)' }
    : { background: SUNSET, color: '#FFFFFF', boxShadow: '0 10px 22px -16px rgba(255,66,161,0.8)' };
  const tiers = new Set(cat?.plans.map((p) => p.tier) ?? []);
  const hasBothTiers = onTrip && !unlimitedGlobal && tiers.has('data') && tiers.has('unlimited');
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
    <TickList items={selected && selected.app_only ? DAY_TICKS : selected && selected.tier === 'unlimited' ? UNLIMITED_TICKS : DATA_TICKS} />
  );

  const planList: ReactNode = cat && !loadingPrices && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: l.cardGap }}>
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
      {!unlimitedGlobal && tabOptions.length > 1 && (
        <PlanTabs value={shownTab} options={tabOptions} onChange={(t) => { hapticSelection(); setTab(t); setShowAll(false); }} />
      )}
      {!unlimitedGlobal && shownTab === 'unl' && tierOptions.length > 1 && (
        <div>
          <div style={{ fontFamily: 'var(--font)', fontSize: 14, color: RC.ink2, marginBottom: 8 }}>Full speed each day</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {tierOptions.map((g) => {
              const sel = g === tierGb;
              return (
                <button key={g} type="button" className="press" onClick={() => { hapticSelection(); setUnlGb(g); setShowAll(false); }}
                  style={{ flex: 1, cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, padding: '10px 0', borderRadius: 12, color: RC.ink, ...(sel ? ringOn(true) : ringOff) }}>
                  {g} GB a day
                </button>
              );
            })}
          </div>
        </div>
      )}
      {!unlimitedGlobal && shownTab === 'unl' && tierLines[0] && (tierGb ?? 0) > 0 && (
        <div style={{ marginTop: tierOptions.length > 1 ? -4 : 0, fontFamily: 'var(--font)', fontSize: 14, color: RC.ink2 }}>
          {tierGb === 10 ? 'For van travel or a hotspot for friends. ' : ''}{`Full speed up to ${tierGb} GB a day${tierLines[0].after_speed ? `, then ${tierLines[0].after_speed}` : ', never cut off'}.`}
        </div>
      )}
      {!unlimitedGlobal && visibleLines.map((p) => {
        const key = lineKey(p);
        return <PlanCard key={key} p={p} on={key === planId} price={priceOf(p, productFor(p))} onPick={() => { hapticSelection(); setPlanId(key); }} />;
      })}
      {!unlimitedGlobal && hiddenCount > 0 && (
        <button type="button" className="press" onClick={() => { hapticSelection(); setShowAll(true); }}
          style={{ alignSelf: 'center', cursor: 'pointer', background: 'transparent', border: 'none', padding: '6px 10px', fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, color: RC.ink2, textDecoration: 'underline', textUnderlineOffset: 3 }}>
          {`More lengths (${hiddenCount})`}
        </button>
      )}
    </div>
  );

  const notes = cat && !loadingPrices && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {unlimitedGlobal && <p style={{ margin: 0, ...TYPE.small, color: RC.ink2 }}>Use a lot? Add a top-up from My eSIM in one tap.</p>}
      {selected && selected.mode === 'subscription' && selectedPrice && (
        <p style={{ margin: 0, ...TYPE.caption, color: RC.inkMute }}>
          Renews at {selectedPrice.total} every {periodWord(selected)} until you turn renewal off under My eSIM. No minimum term.
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
                  <RingoButton onClick={continueTap} style={ctaStyle}>{`Continue, ${selectedPrice.total}${selected.mode === 'subscription' ? ' today' : ''}`}</RingoButton>
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
    padding: 8, paddingLeft: 18, borderRadius: SHEET_RADIUS + 4, background: CREAM, border: `1.5px solid ${LINE}`,
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
            <RingoButton round onClick={continueTap} style={ctaStyle}>Continue</RingoButton>
          </div>
        </div>
      )}
    </div>
  );
}
