// summary.ts — the store's from-prices, fetched once per launch and shared by
// every card. The currency (EUR or USD) is decided by the site from the IP.
//
// On the phone the plan screen shows Apple's price, and Apple's price tiers
// can differ from the site's by a few dollars, so a card's "From" is Apple's
// too wherever the app knows that destination's App Store products: every
// destination opened remembers its lines (product id and term), and the
// cards read the cheapest StoreKit price among them. A destination never
// opened, or StoreKit not answering, keeps the catalogue figure.
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

/** The cheapest monthly StoreKit price per destination, formatted by Apple's currency; empty off the phone or before StoreKit answers. */
export function useAppleFrom(): Record<string, string> {
  const known = useSyncExternalStore((l) => { lineListeners.add(l); return () => lineListeners.delete(l); }, () => lines, () => lines);
  const [from, setFrom] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!iapAvailable()) return;
    let alive = true;
    const ids = [...new Set(Object.values(known).flatMap((l) => l.map(([id]) => id)))];
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
  }, [known]);
  return from;
}
