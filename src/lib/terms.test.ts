// A Global tier is billed one month at a time. Global says so through its App
// Store product id (sub.global_1m); Global Plus has no App Store product and
// says so with apple_period. Read as its twelve-month term, the pay button
// printed "US$659.88 a month" for a US$54.99 plan (seen 2026-11-16).
import { describe, it, expect, vi } from 'vitest';
import type { Plan } from '../api/light';

vi.mock('./i18n', () => ({ t: (s: string) => s, tk: (s: string) => s, plural: (n: number, one: string, many: string) => (n === 1 ? one : many).replace('{n}', String(n)) }));

import { subMonths, termCode, termTitle } from './terms';

const line = (over: Partial<Plan>): Plan => ({ plan: 'rl_annual', mode: 'subscription', term_months: 12, days: 30, apple_product_id: null, ...over }) as Plan;

describe('a Global tier renews every month', () => {
  it('Global: the App Store product id carries the monthly term', () => {
    const p = line({ apple_product_id: 'com.ringoesim.app.sub.global_1m.10gb.4299.g2', apple_period: 'ONE_MONTH' });
    expect(termCode(p)).toBe('global_1m');
    expect(subMonths(p)).toBe(1);
    expect(termTitle(p)).toBe('Monthly');
  });

  it('Global Plus: no App Store product, the site says ONE_MONTH', () => {
    const p = line({ apple_product_id: null, apple_period: 'ONE_MONTH' });
    expect(termCode(p)).toBe('global_1m');
    expect(subMonths(p)).toBe(1);
    expect(termTitle(p)).toBe('Monthly');
  });

  it('a renewing plan with neither is still read from its own term', () => {
    const p = line({ apple_product_id: null, apple_period: null });
    expect(termCode(p)).toBe('rl_annual');
    expect(subMonths(p)).toBe(12);
  });

  it('a one-payment plan is never touched by apple_period', () => {
    const p = line({ plan: 'rl_14', mode: 'payment', term_months: 1, apple_period: 'ONE_MONTH' });
    expect(termCode(p)).toBe('rl_14');
    expect(subMonths(p)).toBe(1);
  });
});
