// Tell App Review where each product lives in the app: destination(s), tab, size and term.
import { asc } from './asc.mjs';
const SITE = '/Users/hippolytevanmarcke/new website Ringo april 2026/NEW-website-app-api';
const { appleCatalog } = await import(`${SITE}/api/_apple-products.js`);
const { DESTINATIONS, TERMS } = await import(`${SITE}/api/_light-catalog.js`);
const ids = JSON.parse((await import('node:fs')).readFileSync(`${new URL('.', import.meta.url).pathname}/ids.json`, 'utf8'));
const byProduct = new Map([...ids.iap, ...ids.sub].map(([id, pid]) => [pid, id]));
const TERM_WORD = { rl_30: '30 days', ul_3: '3 days', ul_7: '7 days', ul_30: '30 days', rl_20: '2 months', rl_6: '6 months', rl_annual: '12 months', ul_20: '2 months', ul_6: '6 months', ul_annual: '12 months' };
let n = 0, fail = 0;
for (const p of appleCatalog()) {
  const id = byProduct.get(p.productId); if (!id) continue;
  const labels = p.destinations.map(d => DESTINATIONS[d]?.label || d);
  const rest = labels.slice(1);
  const where = labels.length > 6 ? `${labels.slice(0, 6).join(', ')} and ${labels.length - 6} more` : labels.join(', ');
  const also = rest.length > 5 ? `${rest.slice(0, 5).join(', ')} and ${rest.length - 5} more` : rest.join(', ');
  const gb = p.dataMb == null ? null : Math.round(p.dataMb / 1024);
  const how = p.kind === 'topup'
    ? `Where in the app: My eSIM tab (after a purchase) > Add data > ${gb} GB. Sold for eSIMs of: ${where}.`
    : `Where in the app: Browse eSIMs > open ${labels[0]}${rest.length ? ` (also under ${also})` : ''} > ${gb == null ? 'Unlimited tab' : `Data tab, ${gb} GB`} > ${TERM_WORD[p.plan]} > Continue.`;
  const base = p.kind === 'topup'
    ? `Extra ${gb} GB of mobile data added to the buyer's existing Ringo travel eSIM, delivered within a minute of purchase.`
    : `Prepaid mobile data eSIM for travel (${p.name}). After purchase the eSIM appears under My eSIM with an Install button (opens the iOS Add eSIM flow) and is emailed to the buyer. Sandbox purchases receive a real test eSIM profile; no carrier order is placed for them.`;
  const reviewNote = `${base} ${how}`;
  const cur = await asc('GET', p.kind === 'sub' ? `/v1/subscriptions/${id}` : `/v2/inAppPurchases/${id}`);
  if ((cur.json?.data?.attributes?.reviewNote || '') === reviewNote) { n++; continue; }
  const path = p.kind === 'sub' ? `/v1/subscriptions/${id}` : `/v2/inAppPurchases/${id}`;
  const type = p.kind === 'sub' ? 'subscriptions' : 'inAppPurchases';
  const r = await asc('PATCH', path, { data: { type, id, attributes: { reviewNote } } });
  if (r.status === 200) n++; else { fail++; console.log('fail', p.productId, r.status, JSON.stringify(r.json).slice(0, 200)); }
}
console.log({ updated: n, fail });
