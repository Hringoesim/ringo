// Price every App Store product from the catalogue's EUR figure, not a USD
// conversion: base territory Belgium (EUR) at the catalogue cents, Apple
// equalizes the other 174 storefronts. Before this the base was USA at
// EUR x 1.15 and Apple's euro equalization landed 30% above the website
// (EUR 22.99 on the site was EUR 29.99 in the app).
// Usage: node asc-eur-base.mjs [--dry] [--only <productId>]
import { asc } from './asc.mjs';
const SITE = '/Users/hippolytevanmarcke/new website Ringo april 2026/NEW-website-app-api';
const { appleCatalog } = await import(`${SITE}/api/_apple-products.js`);
const { convert } = await import(`${SITE}/api/_light-currency.js`);   // the site's own USD figure (EUR x 1.15 on the .99 grid), kept for the US storefront
const DRY = process.argv.includes('--dry');
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const BASE = 'BEL';
const money = (c) => (c / 100).toFixed(2);

const iap = new Map(); let url = `/v1/apps/6787133742/inAppPurchasesV2?limit=200`;
while (url) { const r = await asc('GET', url); for (const x of r.json.data) iap.set(x.attributes.productId, x); url = r.json.links?.next?.replace(/^https:\/\/api\.appstoreconnect\.apple\.com/, '') || null; }
const subs = new Map(); for (const gid of ['22248864', '22395785']) for (const x of (await asc('GET', `/v1/subscriptionGroups/${gid}/subscriptions?limit=200`)).json.data) subs.set(x.attributes.productId, x);

// The Belgian price point at (or just above) the catalogue amount.
async function belPoint(kind, id, cents, terr = BASE) {
  const target = money(cents); let best = null;
  let u = kind === 'sub' ? `/v1/subscriptions/${id}/pricePoints?filter[territory]=${terr}&limit=200` : `/v2/inAppPurchases/${id}/pricePoints?filter[territory]=${terr}&limit=200`;
  while (u) {
    const r = await asc('GET', u);
    for (const p of r.json?.data || []) { const cp = Number(p.attributes.customerPrice); if (p.attributes.customerPrice === target) return p; if (cp >= cents / 100 && (!best || cp < Number(best.attributes.customerPrice))) best = p; }
    u = r.json?.links?.next?.replace(/^https:\/\/api\.appstoreconnect\.apple\.com/, '') || null;
  }
  return best;
}
const summary = { done: 0, skipped: 0, errors: [] };
for (const p of appleCatalog()) {
  if (ONLY && p.productId !== ONLY) continue;
  const kind = p.kind === 'sub' ? 'sub' : 'iap';
  const obj = kind === 'sub' ? subs.get(p.productId) : iap.get(p.productId);
  if (!obj) { summary.skipped++; continue; }
  const termCents = p.cents;   // the id's cents are the amount charged per term (a subscription's whole term, a plan's one payment)
  const log = (m) => console.log(`${p.productId} EUR ${money(termCents)} ${m}`);
  try {
    if (kind === 'iap') {
      const sched = await asc('GET', `/v2/inAppPurchases/${obj.id}/iapPriceSchedule?include=baseTerritory`);
      if (sched.json?.included?.[0]?.id === BASE) { summary.skipped++; continue; }
    } else {
      const pr = await asc('GET', `/v1/subscriptions/${obj.id}/prices?include=subscriptionPricePoint,territory&limit=200`);
      const rows = pr.json?.data || [];
      if (rows.length >= 175) {
        const bel = rows.find(r => r.relationships?.territory?.data?.id === BASE);
        const pp = (pr.json.included || []).find(i => i.id === bel?.relationships?.subscriptionPricePoint?.data?.id);
        if (pp && Number(pp.attributes.customerPrice) >= termCents / 100 && Number(pp.attributes.customerPrice) < termCents / 100 + 1) { summary.skipped++; continue; }
      }
    }
    const pt = await belPoint(kind, obj.id, termCents);
    if (!pt) throw new Error('no BEL price point');
    if (DRY) { log(`-> BEL point ${pt.attributes.customerPrice}`); continue; }
    // The US storefront keeps the site's USD figure (Apple's own equalization
    // of a VAT-inclusive euro price lands under the margin floor there).
    const usd = await belPoint(kind, obj.id, convert(termCents, 'usd'), 'USA');
    if (!usd) throw new Error('no USA price point');
    if (kind === 'iap') {
      const r = await asc('POST', '/v1/inAppPurchasePriceSchedules', {
        data: { type: 'inAppPurchasePriceSchedules', relationships: { inAppPurchase: { data: { type: 'inAppPurchases', id: obj.id } }, baseTerritory: { data: { type: 'territories', id: BASE } }, manualPrices: { data: [{ type: 'inAppPurchasePrices', id: '${p1}' }, { type: 'inAppPurchasePrices', id: '${p2}' }] } } },
        included: [
          { type: 'inAppPurchasePrices', id: '${p1}', attributes: { startDate: null }, relationships: { inAppPurchasePricePoint: { data: { type: 'inAppPurchasePricePoints', id: pt.id } } } },
          { type: 'inAppPurchasePrices', id: '${p2}', attributes: { startDate: null }, relationships: { inAppPurchasePricePoint: { data: { type: 'inAppPurchasePricePoints', id: usd.id } } } },
        ],
      });
      if (r.status !== 201) throw new Error(`schedule ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
      log(`USA ${usd.attributes.customerPrice}`);
    } else {
      // Belgium at the catalogue price, then Apple's equalized point for every other storefront.
      const r = await asc('POST', '/v1/subscriptionPrices', { data: { type: 'subscriptionPrices', attributes: { preserveCurrentPrice: false }, relationships: { subscription: { data: { type: 'subscriptions', id: obj.id } }, subscriptionPricePoint: { data: { type: 'subscriptionPricePoints', id: pt.id } } } } });
      if (r.status !== 201) throw new Error(`BEL price ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
      let eu = `/v1/subscriptionPricePoints/${pt.id}/equalizations?include=territory&limit=200`, ok = 0, fail = 0;
      while (eu) {
        const e = await asc('GET', eu);
        const todo = (e.json?.data || []).filter(q => q.relationships?.territory?.data?.id !== BASE);
        for (let i = 0; i < todo.length; i += 5) {
          await Promise.all(todo.slice(i, i + 5).map(async (q) => {
            let s;
            for (let a = 0; a < 4; a++) { s = await asc('POST', '/v1/subscriptionPrices', { data: { type: 'subscriptionPrices', attributes: { preserveCurrentPrice: false }, relationships: { subscription: { data: { type: 'subscriptions', id: obj.id } }, subscriptionPricePoint: { data: { type: 'subscriptionPricePoints', id: q.id } } } } }); if (s.status !== 429) break; await new Promise(r => setTimeout(r, 30000 * (a + 1))); }
            if (s.status === 201) ok++; else fail++;
          }));
        }
        eu = e.json?.links?.next?.replace(/^https:\/\/api\.appstoreconnect\.apple\.com/, '') || null;
      }
      const us = await asc('POST', '/v1/subscriptionPrices', { data: { type: 'subscriptionPrices', attributes: { preserveCurrentPrice: false }, relationships: { subscription: { data: { type: 'subscriptions', id: obj.id } }, subscriptionPricePoint: { data: { type: 'subscriptionPricePoints', id: usd.id } } } } });
      log(`territories ${ok} ok, ${fail} failed; USA ${usd.attributes.customerPrice} (${us.status})`);
    }
    summary.done++; log(`priced at BEL point ${pt.attributes.customerPrice}`);
  } catch (err) { summary.errors.push(`${p.productId}: ${err.message}`); log(`ERROR ${err.message}`); }
}
console.log(JSON.stringify(summary));
