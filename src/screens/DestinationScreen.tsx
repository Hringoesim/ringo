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
import { termTitle, planName, periodWord, lineKey, tierName } from '../lib/terms';
import { takeQuizPick, setQuizPick, sendQuizPicked } from '../lib/quiz';
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
import { logAb } from '../lib/abtest';
import { payByCard as startCard, type CardOutcome } from '../lib/cardPay';
import { openInSheet } from '../lib/browser';
import { Lock, PayMethods } from '../components/PayMarks';
import { SITE } from '../api/light';
import { useLayout, contentColumn, type Layout } from '../lib/layout';
import { requestLightStatusBar } from '../lib/statusBar';
import { powerPhotoFor } from '../data/powerPhotos';
import { t, t as tr, tk, tn, plural, placeName as placeLabel, currentLocale, isRtl, fmtMoney } from '../lib/i18n';
import dishPhoto from '../assets/store/dish-wide.jpg'; // the store's Power card dish, full width (Unsplash Wj1D-qiOseE)
import { i18n } from '../lib/i18n';

export interface Selection {
  destination: string;
  destinationLabel: string;
  plan: Plan;
  data_gb: number | null;
  /** Apple's product and price for this line */
  product: IapProduct | null;
}

/** A payment the plan page already took through the sheet: Checkout carries on from it. */
export interface PaidStart { out: CardOutcome; email: string }

/** Which list is shown: the trip plans, or one family of App Store only day passes. */
type Group = 'trip' | 'day' | 'power' | 'super';
const DAY_GROUPS: { id: Exclude<Group, 'trip'>; label: string; line: string }[] = [
  { id: 'day', label: 'Day plans', line: 'Unlimited, never cut off' },
  { id: 'power', label: 'Power user', line: 'Unlimited Pro, for heavy use' },
  { id: 'super', label: 'Super user', line: 'Unlimited Ultra, for van travel or a hotspot for friends' },
];
const DAY_TICKS = [tk('Unlimited data'), tk('Never cut off'), tk('Data only, next to your own SIM')];

const SHEET_RADIUS = 28;
const GLOBAL_TICKS = [tk('Unlimited data'), tk('One plan, renews until you cancel'), tk('One price, no roaming bills'), tk('Data only, next to your own SIM and number')];
const DATA_TICKS = [tk('Full speed, no daily cap'), tk('Hotspot included'), tk('Data only, next to your own SIM')];
const UNLIMITED_TICKS = [tk('Unlimited data'), tk('Hotspot included'), tk('Data only, next to your own SIM')];




/** The destination's photograph (the Global mosaic for Global), filling its positioned parent. */
function Photo({ id, eager = true, src }: { id: string; eager?: boolean; src?: string }) {
  if (hasMosaic(id) && !src) return <PlaceMosaic id={id} />;
  return (
    <img
      src={src ?? pictureFor(id)}
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
  // A Power line reads like every Power line: its length, whatever list it came from.
  const powerLine = (Boolean(p.app_only) || p.tier === 'unlimited') && (p.daily_gb ?? 0) >= 5;
  const title = p.app_only || powerLine ? termTitle(p) : unlimited ? t('Unlimited') : p.data_gb ? t('{gb} GB', { gb: p.data_gb }) : planName(p);
  // An unlimited card names only its length; the day's amount is said once above the cards.
  const length = p.app_only || powerLine ? '' : sub ? periodWord(p) : termTitle(p);
  // True claim only: the 2-week plan is what most people buy (236 of 316 sales, 2026-10-24).
  const popular = !p.app_only && p.plan === 'rl_14';
  // A Power plan (5 and 10 GB a day) wears its own outline, the sunset
  // colours sliding round it (owner 2026-10-27: "some type of contour where
  // the change changes the colour"), thicker and glowing once chosen.
  const power = powerLine;
  const face = power
    ? { border: `${on ? 2.5 : 2}px solid transparent`, boxShadow: on ? '0 12px 28px -14px rgba(255,66,161,0.65)' : '0 6px 18px -16px rgba(26,15,46,0.25)' }
    : on ? ringOn(unlimited || Boolean(p.app_only)) : ringOff;
  return (
    <button type="button" className={power ? 'press power-contour' : 'press'} onClick={onPick} aria-pressed={on}
      style={{ textAlign: 'start', cursor: 'pointer', width: '100%', font: 'inherit', padding: 0, borderRadius: RADIUS.card, position: 'relative', overflow: 'hidden', ...face }}>
      <div style={{ display: 'flex', gap: 14, paddingBlock: 16, paddingInlineStart: 16, paddingInlineEnd: 18 }}>
        <Radio on={on} shade={unlimited || p.app_only ? '#FF42A1' : ORANGE} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontFamily: 'var(--font)', fontSize: 18, fontWeight: 600, color: RC.ink }}>{title}</span>
            <span style={{ fontFamily: 'var(--font)', fontSize: 18, fontWeight: 600, color: RC.ink, fontVariantNumeric: 'tabular-nums' }}>{sub ? price.monthly : price.total}</span>
          </div>
          {length && <div style={{ marginTop: 4, fontFamily: 'var(--font)', fontSize: 15, color: RC.ink2 }}>{length}</div>}
          {popular && <div style={{ marginTop: 4, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: ORANGE }}>{t('Most popular')}</div>}
          {p.member_pct ? <div style={{ marginTop: 4, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: RC.purpleInk }}>{t('Your Rewards price')}</div> : null}
        </div>
      </div>
    </button>
  );
}

/** The Power Use tiers by GB a day (owner 2026-10-27: "Power" is 5 GB a day, "Super User" 10). */
const POWER_TIER_NAME: Record<number, string> = { 3: tk('Day plan max'), 5: tk('Power'), 10: tk('Super User') };
/** What each Power Use tier is for, under its name (owner 2026-10-27: by use, not by GB). */
const POWER_TIER_USE: Record<number, string> = { 5: tk('Hotspot and laptop'), 10: tk('Van and streaming') };
/** What each tier gets on the network (owner 2026-10-27, his words). */
const POWER_TIER_PERK: Record<number, string> = {
  5: tk('Priority access and speed.'),
  10: tk('Priority network access, guaranteed high speed, priority at peak times.'),
};
/**
 * Power Use tiers on light grey glass (owner 2026-10-27: no blue or purple fills). Super User alone
 * wears the brand's sunset gradient as a softly pulsing edge, so it stands out without shouting.
 */
const POWER_GLASS = 'linear-gradient(160deg, rgba(255,255,255,0.85), rgba(240,236,244,0.75))';
const POWER_SUNSET = 'linear-gradient(120deg, #FF7A3D 0%, #FF4FA1 50%, #8B5CF6 100%)';
const POWER_PULSE_CSS = '@keyframes superPulse{0%,100%{opacity:.45}50%{opacity:1}}.super-pulse{animation:superPulse 2.8s ease-in-out infinite}@media (prefers-reduced-motion: reduce){.super-pulse{animation:none;opacity:.8}}';
/** Each Power Use tier's icon (owner 2026-10-27), as the plan tabs draw theirs: a laptop for Power, a van for Super User. */
function PowerTierIcon({ gb }: { gb: number; on: boolean }) {
  const fill = RC.ink;
  return (
    <span aria-hidden style={{ width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
      background: 'rgba(26,15,46,0.06)', border: '1px solid rgba(26,15,46,0.08)' }}>
      <svg width="20" height="20" viewBox="0 0 24 24">
        {gb >= 10
          ? <g fill={fill}><path fillRule="evenodd" d="M2 8a2 2 0 0 1 2-2h10.6a2 2 0 0 1 1.5.7l3.6 4.1 1.6.5a1 1 0 0 1 .7 1V16a1 1 0 0 1-1 1h-1.1a2.6 2.6 0 0 0-5.1 0H9.2a2.6 2.6 0 0 0-5.1 0H3a1 1 0 0 1-1-1V8zm12 0v3h3.6L15 8h-1zM4.5 8v3H8V8H4.5zm5 0v3h3V8h-3z" /><circle cx="6.6" cy="17.4" r="1.9" /><circle cx="17.4" cy="17.4" r="1.9" /></g>
          : <path fill={fill} fillRule="evenodd" d="M5 4.5h14A1.5 1.5 0 0 1 20.5 6v9.5h-17V6A1.5 1.5 0 0 1 5 4.5zM5.5 6.5v7h13v-7h-13zM1.5 17h21v.5a2 2 0 0 1-2 2h-17a2 2 0 0 1-2-2V17z" />}
      </svg>
    </span>
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
    { id: 'data', label: tr('Data'), line: tr('A set amount for your whole trip') },
    { id: 'unl', label: tr('Unlimited'), line: tr('Unlimited data, never cut off') },
    { id: 'power', label: tr('Power'), line: tr('For vans, hotspots and a secure connection') },
  ];
  return (
    <div role="tablist" aria-label={tr('Plan type')} style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, gap: options.length > 2 ? 8 : 10 }}>
      {tabs.filter((t) => options.includes(t.id)).map((t) => {
        const on = t.id === value;
        return (
          <button key={t.id} type="button" role="tab" aria-selected={on} className="press" onClick={() => { if (!on) onChange(t.id); }}
            style={{ cursor: 'pointer', textAlign: 'start', minWidth: 0, padding: options.length > 2 ? '10px 10px' : '12px 14px', borderRadius: 18, ...(on ? ringOn(t.id !== 'data') : ringOff) }}>
            {icon(t.id, on)}
            <span style={{ display: 'block', fontFamily: 'var(--font)', fontSize: options.length > 2 ? 15 : 17, fontWeight: 600, color: RC.ink, overflowWrap: 'anywhere' }}>{t.label}</span>
            {/* Three tabs leave no room for a line on a phone or the Duo's column: name and icon only. */}
            {options.length < 3 && <span style={{ display: 'block', marginTop: 2, fontFamily: 'var(--font)', fontSize: 13, color: RC.ink2, lineHeight: 1.35 }}>{t.line}</span>}
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


/** A regional plan's countries, folded under one row (owner 2026-10-26: "a drop down menu where you can see what countries are"). */
function CountryList({ list }: { list: { iso: string; name: string; flag: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 14, flexShrink: 0, borderRadius: 16, border: `1.5px solid ${RC.line}`, background: '#fff', overflow: 'hidden' }}>
      <button type="button" className="press" aria-expanded={open} onClick={() => { hapticSelection(); setOpen(!open); }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', minHeight: 48, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 16, fontWeight: 600, color: RC.ink, textAlign: 'start' }}>
        <span>{plural(list.length, 'Works in {n} country', 'Works in {n} countries')}</span>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><path d="M2 5l5 5 5-5" fill="none" stroke={RC.ink2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <ul style={{ listStyle: 'none', margin: 0, padding: '0 16px 12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', columnGap: 12 }}>
          {list.filter((c) => c && c.name).map((c) => ({ ...c, name: placeLabel(c.name, c.flag) })).sort((a, b) => a.name.localeCompare(b.name, currentLocale())).map((c) => (
            <li key={c.iso || c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', fontFamily: 'var(--font)', fontSize: 15, color: RC.ink, borderTop: `1px solid ${RC.line}` }}>
              <span aria-hidden style={{ fontSize: 18 }}>{c.flag}</span>{c.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Global on the site's dark plan card: Unlimited, the month's price, the ticks. */
function GlobalCard({ l, p, price }: { l: Layout; p: Plan; price: { total: string; monthly: string } }) {
  return (
    <div style={{ background: SKINS.unlimited, borderRadius: RADIUS.card, border: `1px solid ${ON_DARK.line}`, boxShadow: '0 18px 40px -20px rgba(147,33,79,0.55)', padding: l.isWide ? 28 : 20, color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ ...TYPE.h1, color: '#fff' }}>{t('Unlimited')}</div>
        {p.member_pct ? (
          <span style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, color: 'hsl(142,70%,64%)', background: 'hsla(142,60%,45%,0.20)', borderRadius: RADIUS.pill, padding: '5px 11px' }}>{t('Your Rewards price')}</span>
        ) : null}
      </div>
      <div style={{ marginTop: 4, ...TYPE.small, color: ON_DARK.text2 }}>{t('One plan, everywhere you go')}</div>
      <div style={{ marginTop: 18, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ ...typeFor('priceHero', l.size), color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{price.monthly}</span>
        <span style={{ ...TYPE.small, color: ON_DARK.text2 }}>{t('a month')}</span>
      </div>
      <TickList items={GLOBAL_TICKS.map((x) => t(x))} onDark size={16} style={{ marginTop: 18 }} />
    </div>
  );
}

export function DestinationScreen({ id, power = false, onPower, onBack, onContinue }: { id: string; power?: boolean; onPower?: (id: string) => void; onBack: () => void; onContinue: (s: Selection, paid?: PaidStart) => void }) {
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
  const [, setUnlGb] = useState<number | null>(null);
  // Screen 1, the tabs (owner 2026-10-24, after the choice research): Data or
  // Unlimited first, each explained in one line, then that tab's plans.
  // The data quiz's plan opens its tab with its line picked (lib/quiz.ts), once.
  const [quiz] = useState(() => takeQuizPick());
  // The place opened after the quiz is kept with its answer (once, not on the Power hop).
  useEffect(() => { if (quiz?.quizId && !power) sendQuizPicked(quiz.quizId, id); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [tab, setTab] = useState<PlanTab>(quiz?.tab ?? 'data');
  const [powerGb, setPowerGb] = useState<number | null>(quiz?.tab === 'power' ? quiz.dailyGb ?? null : null);
  // At most three plans on screen (choice overload), the rest one tap away.
  const [showAll, setShowAll] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // The sheet is up from this page; what it said when it could not start.
  const [paying, setPaying] = useState(false);
  const [payErr, setPayErr] = useState<string | null>(null);
  // Ringo credit on the account: spent in the sheet on a one-payment plan (the site decides how much).
  const [creditCents, setCreditCents] = useState(0);
  // Whether to spend it here: the toggle Checkout had (owner 2026-10-28, TestFlight 90: "where is the use credit toggle?").
  const [useCredit, setUseCredit] = useState(true);
  useEffect(() => {
    if (!acct) { setCreditCents(0); return; }
    let alive = true;
    light.profile(acct.userId, acct.t).then((pr) => { if (alive) setCreditCents(pr.credit?.balance_cents || 0); }).catch(() => {});
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `acct` follows memberKey
  }, [memberKey]);

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
    }).catch((e: Error) => { if (alive) setErr(e.message || t('Could not load the plans.')); });
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
  // Power Use (owner 2026-10-27: "power use is a different card than the data
  // + unlimited"): the 5 and 10 GB a day passes are a card of their own per
  // place, never a tab beside Data and Unlimited. A card that IS a place's
  // Power Use (Europe Power Use, power_of) shows every line it sells by its
  // GB a day; elsewhere the Power Use card is this screen opened with power.
  const POWER_MIN_GB = 5;
  // Power is the 5 and 10 GB a day options only (owner 2026-10-27), wherever they come from.
  const isPowerLine = (p: Plan) => (Boolean(p.app_only) || p.tier === 'unlimited') && (p.daily_gb ?? 0) >= POWER_MIN_GB;
  const ownPower = plans.filter(isPowerLine);
  const powerMode = (power || quiz?.tab === 'power' || Boolean(cat?.power_of)) && ownPower.length > 0;
  // A Power Use page opens on a satellite picture, not the place's photographs: its region from orbit, else the radio dish.
  const powerHero = powerMode ? (powerPhotoFor(id, cat?.power_of) ?? dishPhoto) : undefined;
  // Power asked for a place that has its own Power Use card (Europe): that card.
  useEffect(() => {
    if ((power || quiz?.tab === 'power') && cat?.power_destination && onPower) {
      // The quiz's plan goes on to that card, which picks its line.
      if (quiz?.tab === 'power') setQuizPick(quiz);
      onPower(cat.power_destination);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the catalogue arrives
  }, [cat?.power_destination]);
  // The way to this place's Power Use card from its Data and Unlimited.
  const powerLink = !powerMode && onPower ? (cat?.power_destination ?? (ownPower.length ? id : null)) : null;
  const allPower = ownPower;
  const powerTiers = [...new Set(allPower.map((p) => p.daily_gb ?? 0))].sort((a, b) => a - b);
  const powerGbShown = powerGb != null && powerTiers.includes(powerGb) ? powerGb : (powerTiers[0] ?? null);
  const powerLines = byDays(allPower.filter((p) => (p.daily_gb ?? 0) === powerGbShown));
  // The day passes; where none is sold, the unlimited trip lines take the tab.
  const dayPasses = plans.filter((p) => p.app_only && !isPowerLine(p));
  const unlLines = dayPasses.length ? dayPasses : plans.filter((p) => !p.app_only && p.tier === 'unlimited' && !isPowerLine(p));
  // The Unlimited tab: the full-speed amount a day, then one card per length.
  // One button per name: an allowance the app has no name for never shows a second "Unlimited".
  // One Unlimited (owner 2026-10-27: "We have Data and Unlimited", Unlimited
  // Plus added no value): the base daily allowance only, no tier picker;
  // heavier use is the Power suggestion below.
  const tierOptions = [...new Set(unlLines.map((p) => p.daily_gb ?? 0))].sort((a, b) => a - b).slice(0, 1);
  const tierGb = tierOptions[0] ?? null;
  const tierLines = unlLines.filter((p) => (p.daily_gb ?? 0) === tierGb).sort((a, b) => a.days - b.days);
  const tabOptions = (powerMode ? ['power'] as PlanTab[] : (['data', 'unl'] as PlanTab[]).filter((t) => (t === 'data' ? dataLines : unlLines).length > 0));
  // A tab not sold here (the quiz said Power, the place has none): Unlimited
  // covers a hotspot too, so that tab, and a line saying so.
  const shownTab: PlanTab = powerMode ? 'power' : tabOptions.includes(tab) ? tab : (tabOptions.includes('unl') && tab === 'power' ? 'unl' : (tabOptions[0] ?? 'data'));
  const quizMissing = Boolean(quiz && tab === quiz.tab && plans.length > 0 && !powerMode && !tabOptions.includes(quiz.tab));
  // Every tab reads cheapest first and opens on its cheapest line, as Power
  // does (owner 2026-10-28, TestFlight 89: the 30 days led the Unlimited list
  // above the 24 hours at US$1.99); a tie goes to the shorter line.
  const byPrice = (list: Plan[]) => [...list].sort((a, b) => a.billed_upfront_amount - b.billed_upfront_amount || a.days - b.days);
  const tabLines = shownTab === 'power' ? powerLines : byPrice(shownTab === 'data' ? dataLines : tierLines);
  // Three on screen: the cheapest three; the chosen line always stays in view.
  const firstThree = tabLines.slice(0, 3);
  const chosenExtra = tabLines.find((p) => lineKey(p) === planId && !firstThree.includes(p));
  const visibleLines = showAll ? tabLines : chosenExtra ? [...firstThree.slice(0, 2), chosenExtra] : firstThree;
  const hiddenCount = showAll ? 0 : tabLines.length - visibleLines.length;
  // The default: the cheapest line (owner 2026-10-28).
  const cheapestOf = (list: Plan[]) => list.reduce((a, b) => (b.billed_upfront_amount < a.billed_upfront_amount ? b : a), list[0]);
  const defaultOf = cheapestOf;

  // The chosen line stays while it is in the tab shown; otherwise the test's
  // default for that tab (owner 2026-10-24 replaced "cheapest first" with this test).
  useEffect(() => {
    const list = unlimitedGlobal ? plans : tabLines;
    if (!list.length) return;
    if (list.some((p) => lineKey(p) === planId)) return;
    // The quiz's plan: data, the smallest line that covers its size (and the
    // trip, where one does); Unlimited and Power, the shortest line that covers the trip.
    const days = quiz?.days ?? 0;
    const covers = (p: Plan) => p.days >= days;
    const bySize = (a: Plan, b: Plan) => (a.data_gb ?? 0) - (b.data_gb ?? 0) || a.days - b.days;
    const big = quiz?.gb && shownTab === 'data' ? list.filter((p) => (p.data_gb ?? 0) >= quiz.gb!) : [];
    const fit = !quiz ? undefined
      : shownTab === 'data' ? ([...big.filter(covers)].sort(bySize)[0] ?? [...big].sort(bySize)[0])
      : days ? (byDays(list).find(covers) ?? byDays(list)[list.length - 1]) : undefined;
    setPlanId(lineKey(fit ?? (shownTab === 'power' ? cheapestOf(list) : defaultOf(list))));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the quiz and the tab are read when the list changes
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
  const placeName = dest ? placeLabel(dest.label, dest.flag) : cat ? placeLabel(cat.destination.label) : id;
  const enLabel = dest?.label || cat?.destination.label || id;
  const name = powerMode && !/power use/i.test(enLabel) ? t('{place} Power Use', { place: placeName }) : placeName;
  // A line whose package connects in its own countries (Latin America's Power plans: no Mexico, US or Canada) says so.
  const coverage = selected?.coverage ? plural(selected.coverage.countries, 'Works in {n} country', 'Works in {n} countries') : cat ? (i18n.get() === 'en' ? cat.destination.coverage_line : cat.destination.countries > 1 ? plural(cat.destination.countries, 'Works in {n} country', 'Works in {n} countries') : t('Works across {place}', { place: placeName })) : dest ? (dest.countries > 1 ? plural(dest.countries, 'Works in {n} country', 'Works in {n} countries') : t('Works across {place}', { place: placeName })) : '';

  const selectionNow = (): Selection | null => cat && selected ? { destination: id, destinationLabel: cat.destination.id === id ? placeLabel(cat.destination.label) : t('{place} ({region} plan)', { place: dest ? placeLabel(dest.label, dest.flag) : id, region: placeLabel(cat.destination.label) }), plan: selected, data_gb: selected.tier === 'data' ? selected.data_gb : null, product: productFor(selected) } : null;
  // Signed in, the email known: the payment sheet opens on this page (owner
  // 2026-10-28, TestFlight 89: "the checkout card pop up should be on the
  // previous page"), and the app moves on only once the payment is confirmed.
  // Without an account, Checkout still asks for the email first.
  const payHere = CARD_PAYMENTS && Boolean(acct?.email);
  // Ringo credit can come off a one-payment plan (never Global's month); the site decides how much.
  const creditHere = payHere && creditCents > 0 && Boolean(selected) && selected?.mode !== 'subscription';
  const continueTap = async () => {
    const s = selectionNow();
    if (!s || paying) return;
    haptic('medium');
    const e = (acct?.email || '').trim().toLowerCase();
    if (!payHere || !e) { onContinue(s); return; }
    setPaying(true);
    setPayErr(null);
    try {
      const pay = await startCard({ plan: s.plan.plan, destination: id, data_gb: s.data_gb, email: e, currency: s.plan.currency, useCredit: creditHere && useCredit, via: 'sheet' });
      const out = await pay.done;
      setPaying(false);
      if (out.state === 'left') return;
      onContinue(s, { out, email: e });
    } catch (ex) {
      setPaying(false);
      setPayErr((ex as Error).message || t('The payment could not be started. Nothing was charged.'));
    }
  };
  // Before the sheet: the agreement the Checkout page carried (the Terms hold the right to cancel).
  const linkStyle: CSSProperties = { border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit', fontWeight: 700, color: RC.ink, textDecoration: 'underline', textUnderlineOffset: 2 };
  const terms = payHere && (
    <div style={{ ...TYPE.caption, color: RC.inkMute, textAlign: 'center' }}>
      {tn('By buying you agree to the {terms} and the {privacy}.', {
        terms: <button type="button" onClick={() => void openInSheet(`${SITE}/terms?app=1`)} style={linkStyle}>{t('Terms of Use')}</button>,
        privacy: <button type="button" onClick={() => void openInSheet(`${SITE}/privacy?app=1`)} style={linkStyle}>{t('Privacy Policy')}</button>,
      })}
    </div>
  );
  // The credit toggle and the lock line Checkout had, now that the sheet opens here (owner 2026-10-28, TestFlight 90).
  const creditBox = creditHere && (
    <div style={{ padding: '10px 14px', borderRadius: RADIUS.sm, background: RC.cream, border: `1px solid ${RC.line}`, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TYPE.bodyStrong, color: RC.ink }}>{t('Use Ringo credit')}</div>
        <div style={{ ...TYPE.small, color: RC.ink2, marginTop: 2 }}>{t('{amount} available', { amount: fmtMoney(creditCents / 100, 'EUR') })}</div>
      </div>
      <button type="button" role="switch" aria-checked={useCredit} aria-label={t('Use Ringo credit')} className="press"
        onClick={() => { hapticSelection(); setUseCredit(!useCredit); }}
        style={{ width: 51, height: 31, borderRadius: 16, border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0, background: useCredit ? RC.tick : RC.lineStrong, transition: 'background .2s' }}>
        <span style={{ display: 'block', width: 27, height: 27, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transform: useCredit ? `translateX(${isRtl() ? -20 : 20}px)` : 'none', transition: 'transform .2s' }} />
      </button>
    </div>
  );
  const payPrice = selected ? priceOf(selected, productFor(selected)).total : '';
  const payLabel = !selected ? '' : selected.mode === 'subscription' ? t('Subscribe securely, {price} a month', { price: payPrice }) : creditHere && useCredit ? t('Pay up to {price} securely', { price: payPrice }) : t('Pay {price} securely', { price: payPrice });
  const payButton = (
    <RingoButton onClick={() => void continueTap()} disabled={paying} style={ctaStyle}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Lock size={17} color="#fff" />{payLabel}</span></RingoButton>
  );
  const retry = () => { setErr(null); setProducts(null); setReloadKey((k) => k + 1); };
  const loadingPrices = native && cat && !products;
  const loading = (!cat || loadingPrices) && !err;
  const selectedPrice = selected ? priceOf(selected, productFor(selected)) : null;

  // ── Pieces shared by both layouts ────────────────────────────────────────
  const errorBlock = err && (
    <div>
      <ErrorBox>{err} {t('Check your connection and try again.')}</ErrorBox>
      <div style={{ marginTop: 12 }}>
        <RingoButton variant="soft" onClick={retry}>{t('Try again')}</RingoButton>
      </div>
    </div>
  );

  const skeleton = loading && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: l.cardGap }} aria-busy="true" aria-label={t('Loading plans')}>
      {[0, 1, 2].map((i) => <div key={i} style={{ height: 96, borderRadius: RADIUS.card, background: RC.cream, border: `1.5px solid ${RC.line}`, animation: 'ringoSheen 1.4s ease-in-out infinite' }} />)}
    </div>
  );

  const countryList = selected?.coverage?.list ?? (cat?.coverage?.list && cat.coverage.list.length > 1 ? cat.coverage.list : null);
  const ticks = !unlimitedGlobal && cat && !loadingPrices && plans.length > 0 && (
    <>
      {/* On Power the chosen tier's network line follows "Never cut off" (owner 2026-10-27). */}
      <TickList items={(() => {
        const base = selected && selected.app_only ? DAY_TICKS : selected && selected.tier === 'unlimited' ? UNLIMITED_TICKS : DATA_TICKS;
        const perk = shownTab === 'power' && powerGbShown != null ? POWER_TIER_PERK[powerGbShown] : undefined;
        const at = base.indexOf('Never cut off');
        const all = !perk ? base : at < 0 ? [...base, perk] : [...base.slice(0, at + 1), perk, ...base.slice(at + 1)];
        return all.map((x) => t(x));
      })()} />
      {countryList && <CountryList list={countryList} />}
    </>
  );

  const planList: ReactNode = cat && !loadingPrices && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: l.cardGap }}>
      {plans.length === 0 && (
        <div style={{ ...cardSurface(), padding: 18 }}>
          {native && products && products.size === 0
            ? (
              <>
                <div style={{ ...TYPE.body, color: RC.ink }}>{t('The App Store did not answer just now.')}</div>
                <div style={{ marginTop: 12 }}><RingoButton size="sm" variant="soft" full={false} onClick={retry}>{t('Try again')}</RingoButton></div>
              </>
            )
            : <div style={{ ...TYPE.body, color: RC.ink }}>{t('Not sold here yet.')}{hasBothTiers ? ` ${t('Try the other plan type.')}` : ''}</div>}
        </div>
      )}
      {unlimitedGlobal && plans[0] && (
        <GlobalCard l={l} p={plans[0]} price={priceOf(plans[0], productFor(plans[0]))} />
      )}
      {!unlimitedGlobal && tabOptions.length > 1 && (
        <PlanTabs value={shownTab} options={tabOptions} onChange={(t) => { hapticSelection(); setTab(t); setShowAll(false); }} />
      )}
      {!unlimitedGlobal && quizMissing && (
        <p style={{ margin: 0, fontFamily: 'var(--font)', fontSize: 14, color: RC.ink2 }}>
          {quiz?.tab === 'power' ? t('Power plans are not sold here yet. Unlimited covers a hotspot too.') : t('That plan type is not sold here. Here is what is.')}
        </p>
      )}
      {!unlimitedGlobal && shownTab === 'unl' && tierOptions.length > 1 && (
        <div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tierOptions.map((g) => {
              const sel = g === tierGb;
              return (
                <button key={g} type="button" className="press" onClick={() => { hapticSelection(); setUnlGb(g); setShowAll(false); }}
                  style={{ flex: '1 1 30%', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, padding: '10px 0', borderRadius: 12, color: RC.ink, ...(sel ? ringOn(true) : ringOff) }}>
                  {tierName(g)}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {!unlimitedGlobal && shownTab === 'power' && (
        <div>
          <p style={{ margin: '0 0 12px', fontFamily: 'var(--font)', fontSize: 16, lineHeight: 1.4, color: RC.ink }}>
            {t('Unlimited data for a van, hotspot or laptop.')}
          </p>
          <style>{POWER_PULSE_CSS}</style>
          {/* What is what (owner 2026-10-27): each tier says what it is for, not its GB a day. */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            {powerTiers.map((g) => {
              const sel = g === powerGbShown;
              return (
                <button key={g} type="button" className="press" aria-pressed={sel} onClick={() => { hapticSelection(); setPowerGb(g); setShowAll(false); }}
                  style={{ flex: 1, minWidth: 0, cursor: 'pointer', fontFamily: 'var(--font)', padding: 2, borderRadius: 20, border: 'none', textAlign: 'start', position: 'relative',
                    background: sel ? RC.ink : 'rgba(26,15,46,0.10)', boxShadow: sel ? '0 12px 26px -14px rgba(26,15,46,0.45)' : 'none', transition: 'box-shadow .2s, background .2s' }}>
                  {g >= 10 && <span aria-hidden className="super-pulse" style={{ position: 'absolute', inset: 0, borderRadius: 20, background: POWER_SUNSET }} />}
                  <span style={{ position: 'relative', display: 'block', height: '100%', boxSizing: 'border-box', padding: '12px 12px 12px', borderRadius: 18, background: POWER_GLASS, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', color: RC.ink }}>
                    {sel && <span aria-hidden style={{ position: 'absolute', top: 12, insetInlineEnd: 12, width: 22, height: 22, borderRadius: 11, background: RC.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="13" height="13" viewBox="0 0 24 24"><path fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>}
                    <PowerTierIcon gb={g} on={sel} />
                    <span style={{ display: 'block', fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>{POWER_TIER_NAME[g] ? t(POWER_TIER_NAME[g]) : tierName(g)}</span>
                    <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: RC.ink2 }}>{POWER_TIER_USE[g] ? t(POWER_TIER_USE[g]) : t('{gb} GB a day', { gb: g })}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {/* Power Use is offered from Unlimited only (owner 2026-10-27: on Data it confuses). */}
      {!unlimitedGlobal && powerLink && shownTab === 'unl' && (
        <button type="button" className="press" onClick={() => { hapticSelection(); onPower?.(powerLink); }}
          style={{ textAlign: 'start', cursor: 'pointer', padding: '16px', borderRadius: 22, border: 'none', background: `linear-gradient(90deg, rgba(26,15,46,0.7) 0%, rgba(26,15,46,0.35) 55%, rgba(26,15,46,0) 80%), url(${dishPhoto}) 0 56% / 100% auto, #1A0F2E`, fontFamily: 'var(--font)', color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span aria-hidden style={{ width: 40, height: 40, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}><svg width="22" height="22" viewBox="0 0 24 24"><path fill="#fff" d="M13.4 2.2c.4-.6-.3-1.3-.9-.9L4.6 12.2c-.4.5 0 1.3.6 1.3h5.3l-1.9 8.2c-.2.7.7 1.1 1.1.5l9.6-11.6c.4-.5 0-1.2-.6-1.2h-5.6l.3-7.2z" /></svg></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 16, fontWeight: 700 }}>{t('{place} Power Use', { place: placeName })}</span>
            <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: 'rgba(255,255,255,0.92)' }}>{t('Power and Super User plans.')}</span>
          </span>
        </button>
      )}
      {!unlimitedGlobal && visibleLines.map((p) => {
        const key = lineKey(p);
        return <PlanCard key={key} p={p} on={key === planId} price={priceOf(p, productFor(p))} onPick={() => { hapticSelection(); setPlanId(key); }} />;
      })}
      {!unlimitedGlobal && hiddenCount > 0 && (
        <button type="button" className="press" onClick={() => { hapticSelection(); setShowAll(true); }}
          style={{ alignSelf: 'center', cursor: 'pointer', background: 'transparent', border: 'none', padding: '6px 10px', fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, color: RC.ink2, textDecoration: 'underline', textUnderlineOffset: 3 }}>
          {t('More lengths ({n})', { n: hiddenCount })}
        </button>
      )}
    </div>
  );

  const notes = cat && !loadingPrices && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {unlimitedGlobal && <p style={{ margin: 0, ...TYPE.small, color: RC.ink2 }}>{t('Use a lot? Add a top-up from My eSIM in one tap.')}</p>}
      {selected && selected.mode === 'subscription' && selectedPrice && (
        <p style={{ margin: 0, ...TYPE.caption, color: RC.inkMute }}>
          {t('Renews at {price} {every} until you turn renewal off under My eSIM. No minimum term.', { price: selectedPrice.total, every: periodWord(selected) })}
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
                <Photo id={id} src={powerHero} />
                <div aria-hidden style={{ position: 'absolute', inset: 0, background: PHOTO_OVERLAY }} />
                <div style={{ position: 'absolute', insetInline: 22, bottom: 20 }}>
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
                  {payErr && <ErrorBox>{payErr}</ErrorBox>}
                  {creditBox}
                  {terms}
                  {payHere ? payButton : <RingoButton onClick={() => void continueTap()} disabled={paying} style={ctaStyle}>{selected.mode === 'subscription' ? t('Continue, {price} today', { price: selectedPrice.total }) : t('Continue, {price}', { price: selectedPrice.total })}</RingoButton>}
                  {payHere && <PayMethods />}
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
    padding: payHere ? 12 : 8, paddingInlineStart: payHere ? 12 : 18, borderRadius: SHEET_RADIUS + 4, background: CREAM, border: `1.5px solid ${LINE}`,
    boxShadow: '0 2px 8px rgba(26,15,46,0.06), 0 18px 40px -16px rgba(26,15,46,0.30)', display: 'flex', flexDirection: 'column', gap: 8,
  };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'relative', height: heroH, flexShrink: 0, background: skyFor(id), overflow: 'hidden' }}>
        <Photo id={id} src={powerHero} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(26,15,46,0.30) 0%, rgba(26,15,46,0) 32%, rgba(26,15,46,0.78) 100%)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>
          <RingoHeader leading={<BackBtn onClick={onBack} />} />
        </div>
        <div style={{ position: 'absolute', left: l.gutter, right: l.gutter, bottom: SHEET_RADIUS + 12 }}>
          <PhotoTitle l={l} dest={dest} name={name} coverage={coverage} />
        </div>
      </div>

      {/* The content sheet rides up over the photo so the screen reads as layers. */}
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', position: 'relative', marginTop: -SHEET_RADIUS, borderRadius: `${SHEET_RADIUS}px ${SHEET_RADIUS}px 0 0`, background: RC.bg, boxShadow: '0 -10px 24px -16px rgba(26,15,46,0.45)', padding: `22px ${l.gutter}px ${payHere ? 330 : 160}px`, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {errorBlock}
        {skeleton}
        {planList}
        {ticks}
        {notes}
      </div>

      {cat && selected && selectedPrice && (
        <div style={footer}>
          {payErr && <ErrorBox>{payErr}</ErrorBox>}
          {creditBox}
          {terms && <div style={{ paddingTop: 2 }}>{terms}</div>}
          {payHere ? payButton : <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flexShrink: 1, minWidth: 0, fontFamily: 'var(--font)' }}>
            <div style={{ ...TYPE.caption, color: RC.inkMute, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{planName(selected)}</div>
            <div style={{ marginTop: 2, fontSize: 19, fontWeight: 800, lineHeight: 1.2, color: RC.ink, letterSpacing: '-0.02em', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              {selected.mode === 'subscription' ? t('{price} today', { price: selectedPrice.total }) : selectedPrice.total}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 132 }}>
            <RingoButton round onClick={() => void continueTap()} disabled={paying} style={ctaStyle}>{t('Continue')}</RingoButton>
          </div>
          </div>}
          {payHere && <PayMethods />}
        </div>
      )}
    </div>
  );
}
