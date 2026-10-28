// terms.ts — how long a plan lasts and what it is called, read from the
// term code in its App Store product id (com.ringoesim.app.plan.rl_14.…,
// com.ringoesim.app.sub.global_1m.…), never from term_months alone: since
// 2026-09-26 every region, country and trip is one payment with term_months
// 1, so a 2 weeks and a 30 days look the same there. The names are the
// website's (api/esim-plans.js TERM_LABEL), so the app and ringoesim.com say
// the same thing for the same plan. Global is sold in the app as a monthly
// App Store subscription (owner 2026-09-27): its product carries the term
// code global_1m, so it reads "Monthly" and renews every month, at the site's
// monthly price, even though the site bills the same plan over 12 months.
import type { Plan } from '../api/light';
import { t, tk, plural } from './i18n';

const NAME: Record<string, string> = {
  rl_14: tk('2 weeks'), rl_30: tk('30 days'), ul_3: tk('3 days'), ul_7: tk('7 days'), ul_30: tk('30 days'),
  rl_1m: tk('Monthly'), ul_1m: tk('Monthly'), rl_20: tk('2 months'), ul_20: tk('2 months'), rl_6: tk('6 months'), ul_6: tk('6 months'),
  rl_annual: tk('Annual'), ul_annual: tk('Annual'), global_1m: tk('Monthly'),
};
/** How many months one renewal of a subscription covers (Apple bills its whole period at once; Global's is one month). */
const SUB_MONTHS: Record<string, number> = { rl_1m: 1, ul_1m: 1, global_1m: 1, rl_20: 2, ul_20: 2, rl_6: 6, ul_6: 6, rl_annual: 12, ul_annual: 12 };

/** The term code of a line: from its product id, else the catalogue's plan id. */
export function termCode(p: Plan): string {
  const m = p.apple_product_id ? /\.(?:plan|sub)\.([a-z0-9_]+)\./.exec(p.apple_product_id) : null;
  return m ? m[1] : p.plan;
}

/** The term's name: "2 weeks", "30 days", "7 days", "Monthly", "Annual". */
export function termTitle(p: Plan): string {
  if (p.app_only) return p.days === 1 ? t('24 hours') : plural(p.days, '{n} day', '{n} days');
  const code = termCode(p);
  if (NAME[code]) return t(NAME[code]);
  if (p.mode === 'payment') return p.days === 14 ? t('2 weeks') : plural(p.days, '{n} day', '{n} days');
  return p.term_months === 12 ? t('Annual') : p.term_months === 1 ? t('Monthly') : plural(p.term_months, '{n} month', '{n} months');
}

/** Months one payment of a subscription covers; 1 on a one-off. */
export function subMonths(p: Plan): number {
  if (p.mode !== 'subscription') return 1;
  return SUB_MONTHS[termCode(p)] ?? Math.max(1, p.term_months || 1);
}

/** A subscription's renewal period in words: "every month", "every year", "every 6 months". */
export function periodWord(p: Plan): string {
  const n = subMonths(p);
  return n === 12 ? t('every year') : n === 1 ? t('every month') : plural(n, 'every {n} month', 'every {n} months');
}

/**
 * Global is one Unlimited monthly plan, the way ringoesim.com sells it (owner
 * 2026-10-23). Its App Store line still carries an allowance in data_gb (the
 * site meters top-ups against it), so it is named by its term code, never by
 * that number.
 */
export function isGlobalUnlimited(p: Plan): boolean {
  return termCode(p) === 'global_1m' || (p.mode === 'subscription' && /^global/.test(p.plan));
}

/** What the line holds: "10 GB", "10 GB a month" on a subscription, or "Unlimited". */
export function sizeOf(p: Plan): string {
  if (p.tier === 'unlimited' || p.data_gb == null || isGlobalUnlimited(p)) return t('Unlimited');
  return p.mode === 'subscription' ? t('{gb} GB a month', { gb: p.data_gb }) : t('{gb} GB', { gb: p.data_gb });
}

/** The App Store only day passes by family ("Power user, 7 days"); the catalogue's label wins. */
// The app's tier names (owner 2026-10-24): Day, Super, Ultra.
const APP_GROUP_NAME: Record<string, string> = { day: tk('Unlimited Day'), power: tk('Unlimited Super'), super: tk('Unlimited Ultra') };

/**
 * An unlimited line is called Unlimited (owner 2026-10-26: "don't say full
 * speed 1 GB a day then 1 Mbps, just call it unlimited"); the daily allowance
 * only picks the name, and its terms live in the Terms of Use.
 */
const TIER_NAME: Record<number, string> = { 1: tk('Unlimited'), 2: tk('Unlimited Plus'), 3: tk('Unlimited Pro'), 5: tk('Power'), 10: tk('Super User') };
export function tierName(dailyGb: number | null | undefined): string {
  return t((dailyGb && TIER_NAME[dailyGb]) || 'Unlimited');
}

/** Duration and data together, the way a card, the footer and checkout name a line: "2 weeks, 10 GB"; Global reads "Unlimited, monthly". */
export function planName(p: Plan): string {
  // The tier name, not the catalogue label, so the app reads Day, Super, Ultra everywhere.
  if (p.app_only) return t('{a}, {b}', { a: p.daily_gb ? tierName(p.daily_gb) : t(APP_GROUP_NAME[p.group ?? 'day']), b: termTitle(p) });
  if (isGlobalUnlimited(p)) return t('Unlimited, monthly');
  return t('{a}, {b}', { a: termTitle(p), b: sizeOf(p) });
}

/** A line's own key: several lines share one plan id (Afghanistan's 30 days in 1, 3, 5 and 10 GB). */
export function lineKey(p: Plan): string {
  return p.apple_product_id || `${p.plan}:${p.data_gb ?? 'ul'}`;
}
