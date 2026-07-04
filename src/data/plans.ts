import type { Plan } from './types';

// The EXACT live ringoesim.com lineup (GBP): Essentials £15, Plus £28,
// Pro £47 (most popular), Unlimited £71. Features verbatim from the site.
// No add-ons by design — "No daily passes, no surprise fees."
export const PLANS: Plan[] = [
  {
    id: 'essentials', name: 'Essentials', price: 15, highspeed: '10 GB',
    tagline: 'Light traveller', current: true,
    feats: ['10 GB data / month', 'Calls & SMS in 60+ countries', '1 ported number', 'Cancel anytime'],
  },
  {
    id: 'plus', name: 'Plus', price: 28, highspeed: '50 GB',
    tagline: 'Average user',
    feats: ['50 GB data / month', 'Unlimited calls (in-network)', '180+ countries', '1 ported number'],
  },
  {
    id: 'pro', name: 'Pro', price: 47, highspeed: 'Unlimited',
    tagline: 'Heavy nomad', popular: true,
    feats: ['Unlimited data', '1 virtual + 2 ported numbers', '180+ countries', 'Priority network'],
  },
  {
    id: 'unlimited', name: 'Unlimited', price: 71, highspeed: 'Unlimited',
    tagline: 'Power user',
    feats: ['Everything in Pro', '4 numbers (3 ported)', 'Partner perks: airline miles, lounge passes, travel insurance', 'Dedicated account manager'],
  },
];

// ── Multi-currency pricing (site-exact, from ringoesim.com) ──────────────────
// Order matches PLANS: [essentials, plus, pro, unlimited].
export const PLAN_PRICES: Record<string, number[]> = {
  USD: [19, 35, 59, 89],
  GBP: [15, 28, 47, 71],
  EUR: [17, 32, 55, 82],
  AUD: [30, 55, 90, 135],
  NZD: [32, 58, 98, 148],
  CAD: [26, 48, 80, 120],
  JPY: [2900, 5300, 8900, 13400],
  SGD: [26, 48, 80, 120],
  HKD: [150, 275, 465, 700],
  AED: [70, 130, 220, 330],
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
    return new Intl.NumberFormat(navigator.language || 'en', {
      style: 'currency', currency, maximumFractionDigits: currency === 'JPY' ? 0 : 0,
    }).format(amount);
  } catch {
    return `$${amount}`;
  }
}
