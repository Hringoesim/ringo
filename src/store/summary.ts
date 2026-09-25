// summary.ts — the store's from-prices, fetched once per launch and shared by
// every card. The currency (EUR or USD) is decided by the site from the IP.
//
// On the phone the plan screen shows Apple's price, and Apple's price tiers
// can differ from the site's by a few dollars, so a card's "From" is Apple's
// too. The summary names, per destination, the App Store product of its
// cheapest offer on each term (from_lines), so every card is priced in one
// StoreKit request as soon as the summary arrives; a destination opened also
// remembers its full lines (product id and term), which count as well. Off
// the phone, or with StoreKit not answering, a card keeps the catalogue figure.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { light, type Plan, type Summary } from '../api/light';
import { iapAvailable, loadProducts } from '../lib/iap';
import { appleMoney } from '../lib/purchase';

let cache: Summary | null = null;

export function useSummary(): Summary | null {
  const [s, setS] = useState<Summary | null>(cache);
  useEffect(() => {
    let alive = true;
    light.summary().then((v) => { cache = v; if (alive) setS(v); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return s;
}

/** An App Store product sold for a destination, and what divides its price into the monthly figure (as priceOf does). */
type AppleLine = [productId: string, perMonths: number];
const LINES_KEY = 'ringo_apple_lines_v1';
let lines: Record<string, AppleLine[]> = (() => {
  try { const raw = localStorage.getItem(LINES_KEY); const v: unknown = raw ? JSON.parse(raw) : {}; return v && typeof v === 'object' ? (v as Record<string, AppleLine[]>) : {}; } catch { return {}; }
})();
const lineListeners = new Set<() => void>();

/** Called when a destination's catalogue is open: its App Store lines, under every id it answers to. */
export function rememberAppleLines(ids: string[], plans: Plan[]): void {
  const list: AppleLine[] = plans
    .filter((p) => p.apple_product_id)
    .map((p) => [p.apple_product_id!, p.mode === 'subscription' && p.term_months > 1 ? p.term_months : 1]);
  if (!list.length) return;
  const same = ids.every((id) => JSON.stringify(lines[id]) === JSON.stringify(list));
  if (same) return;
  lines = { ...lines, ...Object.fromEntries(ids.map((id) => [id, list])) };
  try { localStorage.setItem(LINES_KEY, JSON.stringify(lines)); } catch { /* ignore */ }
  lineListeners.forEach((l) => l());
}

/** Renewing terms that bill several months at once, by the term in a product id (com.ringoesim.app.sub.<term>.…). */
const TERM_MONTHS: Record<string, number> = { rl_20: 2, ul_20: 2, rl_6: 6, ul_6: 6, rl_annual: 12, ul_annual: 12 };
/** What divides a product's price into the monthly figure, read from its id (as priceOf does from the plan). */
function perMonths(productId: string): number {
  const m = /\.sub\.([a-z0-9_]+)\./.exec(productId);
  return m ? (TERM_MONTHS[m[1]] ?? 1) : 1;
}

/** The cheapest monthly StoreKit price per destination, formatted by Apple's currency; empty off the phone or before StoreKit answers. */
export function useAppleFrom(summary: Summary | null): Record<string, string> {
  const remembered = useSyncExternalStore((l) => { lineListeners.add(l); return () => lineListeners.delete(l); }, () => lines, () => lines);
  const fromLines = summary?.from_lines;
  const [from, setFrom] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!iapAvailable()) return;
    let alive = true;
    // The summary's lines for every destination, plus the lines of any
    // destination opened; one batched StoreKit request (loadProducts caches).
    const known: Record<string, AppleLine[]> = {};
    for (const [dest, ids] of Object.entries(fromLines ?? {})) known[dest] = ids.map((id): AppleLine => [id, perMonths(id)]);
    for (const [dest, list] of Object.entries(remembered)) known[dest] = [...(known[dest] ?? []), ...list];
    const ids = [...new Set(Object.values(known).flatMap((l) => l.map(([id]) => id)))];
    if (!ids.length) return;
    void loadProducts(ids).then((products) => {
      if (!alive) return;
      const out: Record<string, string> = {};
      for (const [dest, list] of Object.entries(known)) {
        let best: { amount: number; currency: string } | null = null;
        for (const [id, per] of list) {
          const p = products.get(id);
          if (p && (!best || p.price / per < best.amount)) best = { amount: p.price / per, currency: p.currency };
        }
        if (best) out[dest] = appleMoney(best.amount, best.currency);
      }
      setFrom(out);
    });
    return () => { alive = false; };
  }, [remembered, fromLines]);
  return from;
}
