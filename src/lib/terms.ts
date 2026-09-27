// terms.ts — how long a plan lasts and what it is called, read from the
// term code in its App Store product id (com.ringoesim.app.plan.rl_14.…,
// com.ringoesim.app.sub.rl_annual.…), never from term_months alone: since
// 2026-09-26 every region, country and trip is one payment with term_months
// 1, so a 2 weeks and a 30 days look the same there. The names are the
// website's (api/esim-plans.js TERM_LABEL), so the app and ringoesim.com say
// the same thing for the same plan.
import type { Plan } from '../api/light';

const NAME: Record<string, string> = {
  rl_14: '2 weeks', rl_30: '30 days', ul_3: '3 days', ul_7: '7 days', ul_30: '30 days',
  rl_1m: 'Monthly', ul_1m: 'Monthly', rl_20: '2 months', ul_20: '2 months', rl_6: '6 months', ul_6: '6 months',
  rl_annual: 'Annual', ul_annual: 'Annual',
};
/** How many months one renewal of a subscription covers (Apple bills the whole term at once). */
const SUB_MONTHS: Record<string, number> = { rl_1m: 1, ul_1m: 1, rl_20: 2, ul_20: 2, rl_6: 6, ul_6: 6, rl_annual: 12, ul_annual: 12 };

/** The term code of a line: from its product id, else the catalogue's plan id. */
export function termCode(p: Plan): string {
  const m = p.apple_product_id ? /\.(?:plan|sub)\.([a-z0-9_]+)\./.exec(p.apple_product_id) : null;
  return m ? m[1] : p.plan;
}

/** The term's name: "2 weeks", "30 days", "7 days", "Monthly", "Annual". */
export function termTitle(p: Plan): string {
  const code = termCode(p);
  if (NAME[code]) return NAME[code];
  if (p.mode === 'payment') return p.days === 14 ? '2 weeks' : `${p.days} days`;
  return p.term_months === 12 ? 'Annual' : p.term_months === 1 ? 'Monthly' : `${p.term_months} months`;
}

/** Months one payment of a subscription covers; 1 on a one-off. */
export function subMonths(p: Plan): number {
  if (p.mode !== 'subscription') return 1;
  return SUB_MONTHS[termCode(p)] ?? Math.max(1, p.term_months || 1);
}

/** A subscription's renewal period in words: "month", "year", "6 months". */
export function periodWord(p: Plan): string {
  const n = subMonths(p);
  return n === 12 ? 'year' : n === 1 ? 'month' : `${n} months`;
}

/** What the line holds: "10 GB", "10 GB a month" on a subscription, or "Unlimited". */
export function sizeOf(p: Plan): string {
  if (p.tier === 'unlimited' || p.data_gb == null) return 'Unlimited';
  return `${p.data_gb} GB${p.mode === 'subscription' ? ' a month' : ''}`;
}

/** Duration and data together, the way a card, the footer and checkout name a line: "2 weeks, 10 GB". */
export function planName(p: Plan): string {
  return `${termTitle(p)}, ${sizeOf(p)}`;
}

/** A line's own key: several lines share one plan id (Afghanistan's 30 days in 1, 3, 5 and 10 GB). */
export function lineKey(p: Plan): string {
  return p.apple_product_id || `${p.plan}:${p.data_gb ?? 'ul'}`;
}
