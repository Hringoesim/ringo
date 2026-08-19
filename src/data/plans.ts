import type { Plan } from './types';

// LAUNCH LINEUP — Ringo Light only.
//
// Ringo Light is one global data eSIM. Phone numbers, calls/SMS and porting
// are deferred, so the multi-tier lineup (Essentials/Plus/Pro/Unlimited, all
// of which sold ported numbers and calling) is not offered. The tier
// machinery below still works, it just has a single rung today — when numbers
// ship, add the higher plans back to this array and the switch/proration
// logic picks them up unchanged.
export const PLANS: Plan[] = [
  {
    id: 'light', name: 'Ringo Light', price: 39.99, highspeed: 'Global data',
    tagline: 'Global data + a real number', current: true, maxNumbers: 1,
    feats: [
      'A real phone number, included',
      '180+ countries, one allowance',
      'Slowed at the limit, never cut off',
      'Cancel anytime',
    ],
  },
];


// ── Billing cadence ─────────────────────────────────────────────────────────
// Ringo Light is sold on two cadences. Both are quoted PER MONTH — the annual
// one is charged once for twelve months, the short one every two months — so
// the comparison a traveller makes is monthly rate vs commitment length.

export type BillingPeriod = 'annual' | 'bimonthly';

export const BILLING: Record<
  BillingPeriod,
  { label: string; months: number; dataGB: number }
> = {
  // Same price per month on both. A longer commitment buys MORE DATA, never a
  // discount — Ringo does not do percentage-off, ever.
  annual: { label: '12 months', months: 12, dataGB: 40 },
  bimonthly: { label: '2 months', months: 2, dataGB: 20 },
};

/** Monthly data allowance for a term, in GB. */
export function periodDataGB(period: BillingPeriod): number {
  return BILLING[period].dataGB;
}

/** Hitting a limit throttles the line, it never cuts it — bank codes still
 *  arrive and calls still work. That is the product promise, and it is what
 *  makes a limit an upsell moment rather than a dead SIM. */
export const THROTTLE_NEVER_CUT = true;

/** One-tap top-up offered at the limit (and at the 80% warning).
 *  Priced to a 40% margin floor off the Africa rate. */
export const TOP_UP = { gb: 5, price: 26.99 };

/** Top-up price in the device (or given) currency. */
export function topUpPrice(currency = localCurrency()): number {
  const eur = TOP_UP.price;
  const scale = (MONTHLY_PRICE[currency] ?? MONTHLY_PRICE.EUR) / MONTHLY_PRICE.EUR;
  return currency === 'JPY' ? Math.round(eur * scale) : Math.round(eur * scale * 100) / 100;
}

/** Fair use on African networks — a daily cap, not a monthly one. */
export const AFRICA_DAILY_GB = 1;

/** "billed EUR479.88 every 12 months" — the line under the headline price. */
export function billingNote(period: BillingPeriod, currency = localCurrency()): string {
  const months = BILLING[period].months;
  return `billed ${fmtMoney(periodChargeTotal(period, currency), currency)} every ${months} months`;
}

export const DEFAULT_PERIOD: BillingPeriod = 'annual';

// Per-month price by currency, per cadence. USD/EUR/GBP carry the prices the
// owner set (39.99 annual, 44.26 bimonthly); the rest are scaled from the old
// table's ratios and still need per-market sign-off.
// One monthly rate, whatever the term. EUR is the authoritative figure from
// Ringo_Light_Master_PL.xlsx and is NET of VAT — the customer pays VAT on top
// (EUR39.99 net = EUR47.99 gross at 20%). Other currencies still need sign-off.
const MONTHLY_PRICE: Record<string, number> = {
  EUR: 39.99, GBP: 39.99, USD: 39.99, AUD: 62.99, NZD: 67.99,
  CAD: 54.99, JPY: 6100, SGD: 54.99, HKD: 315, AED: 147,
};

/** Per-month price for a cadence, in the device (or given) currency. */
export function periodMonthlyPrice(_period: BillingPeriod, currency = localCurrency()): number {
  return MONTHLY_PRICE[currency] ?? MONTHLY_PRICE.EUR;
}

/** What actually gets charged each time: the monthly rate x the interval. */
export function periodChargeTotal(period: BillingPeriod, currency = localCurrency()): number {
  return periodMonthlyPrice(period, currency) * BILLING[period].months;
}


// ── Plan ordering + entitlements (used by the switch / proration logic) ──────
/** Rank in the lineup. One rung today; higher plans slot in above it. */
export function planRank(planId: string): number {
  const i = PLANS.findIndex((p) => p.id === planId);
  return i < 0 ? 0 : i;
}

/** How many numbers a plan includes (the downgrade gate compares against this). */
export function planMaxNumbers(planId: string): number {
  const p = PLANS.find((x) => x.id === planId);
  return p ? p.maxNumbers : 1;
}

// ── Multi-currency pricing (site-exact, from ringoesim.com) ──────────────────
export const PLAN_PRICES: Record<string, number[]> = {
  // One entry per plan, in PLANS order — Ringo Light only for now.
  USD: [39.99], GBP: [39.99], EUR: [39.99], AUD: [62.99], NZD: [67.99],
  CAD: [54.99], JPY: [6100], SGD: [54.99], HKD: [315], AED: [147],
};

const REGION_CURRENCY: Record<string, string> = {
  GB: 'GBP', US: 'USD', AU: 'AUD', NZ: 'NZD', CA: 'CAD', JP: 'JPY', SG: 'SGD', HK: 'HKD', AE: 'AED',
  // Eurozone + Belgium and friends
  BE: 'EUR', NL: 'EUR', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', IE: 'EUR', PT: 'EUR',
  AT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR',
};

// Timezone → currency (primary signal: where the device actually is).
const TZ_CURRENCY: Record<string, string> = {
  'Europe/London': 'GBP', 'Europe/Brussels': 'EUR', 'Europe/Amsterdam': 'EUR',
  'Europe/Paris': 'EUR', 'Europe/Berlin': 'EUR', 'Europe/Madrid': 'EUR',
  'Europe/Rome': 'EUR', 'Europe/Dublin': 'EUR', 'Europe/Lisbon': 'EUR',
  'Europe/Vienna': 'EUR', 'Europe/Helsinki': 'EUR', 'Europe/Athens': 'EUR',
  'Europe/Luxembourg': 'EUR', 'Asia/Tokyo': 'JPY', 'Asia/Singapore': 'SGD',
  'Asia/Hong_Kong': 'HKD', 'Asia/Dubai': 'AED', 'Pacific/Auckland': 'NZD',
  'America/Toronto': 'CAD', 'America/Vancouver': 'CAD', 'America/Edmonton': 'CAD',
  'America/Winnipeg': 'CAD', 'America/Halifax': 'CAD', 'America/St_Johns': 'CAD',
};

/** Currency for where the device actually is (Belgium → EUR): timezone first,
 *  then language region, then USD — same fallback as the site. */
export function localCurrency(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (TZ_CURRENCY[tz]) return TZ_CURRENCY[tz];
    if (tz.startsWith('Australia/')) return 'AUD';
    if (tz.startsWith('America/')) return 'USD';
    const region = new Intl.Locale(navigator.language || 'en-US').maximize().region || 'US';
    const cur = REGION_CURRENCY[region] || 'USD';
    return PLAN_PRICES[cur] ? cur : 'USD';
  } catch {
    return 'USD';
  }
}

/** Local price for a plan id in the given (or device) currency. */
export function planPrice(planId: string, currency = localCurrency()): number {
  const idx = PLANS.findIndex((p) => p.id === planId);
  const table = PLAN_PRICES[currency] || PLAN_PRICES.USD;
  return table[Math.max(0, idx)];
}

/** Format an amount in the given (or device) currency, e.g. €55, £47, ¥8,900. */
export function fmtMoney(amount: number, currency = localCurrency()): string {
  try {
    const whole = Math.abs(amount % 1) < 0.005;
    const digits = currency === 'JPY' || whole ? 0 : 2;
    return new Intl.NumberFormat(navigator.language || 'en', {
      style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `$${amount}`;
  }
}

/** A monthly billing period is 30 days for proration purposes. */
export const BILLING_DAYS = 30;

/** Prorated charge to switch UP *today*: you pay the price difference, but only
 *  for the days left in the month you've already paid for — the unused time on
 *  the old plan is credited. Same model Stripe uses for immediate upgrades. */
export function proratedUpgradeCharge(
  fromId: string,
  toId: string,
  daysLeft: number,
  currency = localCurrency(),
): number {
  const diff = planPrice(toId, currency) - planPrice(fromId, currency);
  if (diff <= 0) return 0; // not an upgrade → nothing charged now
  const frac = Math.max(0, Math.min(1, daysLeft / BILLING_DAYS));
  return Math.max(0, Math.round(diff * frac));
}

// ── Personalized recommendation + savings ───────────────────────────────────
// The onboarding quiz asks three things — where you go, what you need, how often
// you're away. We turn that into an estimated monthly data need and a numbers
// need, then recommend the SMALLEST plan that covers you (so a light traveller
// gets Essentials, not Pro), and compute a real trip-savings figure vs roaming.

/** Estimated high-speed data need per month (GB). Frequency sets the base; each
 *  extra destination adds a little (more places → more time on data). */
export function estimateMonthlyGB(freq: string, destCount: number): number {
  const base: Record<string, number> = { occasionally: 4, few: 10, monthly: 30, abroad: 60 };
  const b = base[freq] ?? 10;
  return Math.round(b * (1 + 0.12 * Math.max(0, destCount - 1)));
}

/** Recommend the smallest plan that covers the estimated data + number needs.
 *  Data drives the tier; wanting a *local* (virtual) number or unlimited calls
 *  can bump you up. "Mobile data" is NOT a bump — nearly everyone taps it. */
export function recommendPlan(_needs: string[], _freq: string, _destCount: number): string {
  // One plan on sale, so the sizing quiz always lands on Ringo Light. The
  // needs/frequency arguments stay in the signature for when the lineup grows.
  return 'light';
}

/** Roughly what mainstream carriers charge to roam, per day, in local currency
 *  (~€12/day — the midpoint of typical €10–15 daily roaming passes). */
const ROAMING_PER_DAY: Record<string, number> = {
  EUR: 12, GBP: 11, USD: 13, AUD: 18, NZD: 20, CAD: 16, JPY: 1800, SGD: 18, HKD: 100, AED: 45,
};

/** A representative trip length (days) for each travel frequency. */
export function typicalTripDays(freq: string): number {
  return (({ occasionally: 7, few: 10, monthly: 14, abroad: 30 }) as Record<string, number>)[freq] ?? 10;
}

/** Estimated money saved vs pay-as-you-go roaming on ONE typical trip:
 *  roaming day-rate × trip length, minus one month of the recommended plan.
 *  Returns every number used so the UI can show the working (transparency). */
export function estimateTripSavings(
  planId: string,
  freq: string,
  currency = localCurrency(),
): { days: number; perDay: number; roaming: number; ringo: number; saved: number } {
  const days = typicalTripDays(freq);
  const perDay = ROAMING_PER_DAY[currency] ?? ROAMING_PER_DAY.USD;
  const roaming = days * perDay;
  const ringo = planPrice(planId, currency);
  return { days, perDay, roaming, ringo, saved: Math.max(0, roaming - ringo) };
}

/** Short human date for renewals, e.g. "3 Jul". */
export function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(navigator.language || 'en', { day: 'numeric', month: 'short' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}
