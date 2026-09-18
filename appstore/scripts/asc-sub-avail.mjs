// Make the single-country subscriptions submittable now: a USA price next to
// the Belgian one and availability limited to those two storefronts, so
// App Review can see them today while asc-eur-base fills the other
// territories (which takes hours at the API's rate limit) and then opens
// availability to every territory again.
import { asc } from './asc.mjs';
const SITE = '/Users/hippolytevanmarcke/new website Ringo april 2026/NEW-website-app-api';
const { appleCatalog } = await import(`${SITE}/api/_apple-products.js`);
const { convert } = await import(`${SITE}/api/_light-currency.js`);
const GROUP = process.argv[2] || '22395785';
const cents = new Map(appleCatalog().map(p => [p.productId, p.cents]));
const money = (n) => n.toFixed(2);
async function pricePoint(id, amount, terr) {
  let u = `/v1/subscriptions/${id}/pricePoints?filter[territory]=${terr}&limit=200`, best = null;
  while (u) {
    const r = await asc('GET', u);
    for (const p of r.json?.data || []) { const cp = Number(p.attributes.customerPrice); if (p.attributes.customerPrice === money(amount)) return p; if (cp >= amount && (!best || cp < Number(best.attributes.customerPrice))) best = p; }
    u = r.json?.links?.next || null;
  }
  return best;
}
const subs = (await asc('GET', `/v1/subscriptionGroups/${GROUP}/subscriptions?limit=200&fields[subscriptions]=productId,state`)).json.data;
const summary = { seen: 0, usaPriced: 0, availability: 0, ready: 0, errors: [] };
for (const s of subs) {
  if (s.attributes.state !== 'MISSING_METADATA') continue;
  summary.seen++;
  const id = s.id, pid = s.attributes.productId;
  try {
    const pr = await asc('GET', `/v1/subscriptions/${id}/prices?include=territory&limit=200`);
    const terrs = new Set((pr.json.data || []).map(r => r.relationships?.territory?.data?.id));
    if (!terrs.has('USA')) {
      const usd = convert(cents.get(pid), 'usd') / 100;
      const pt = await pricePoint(id, usd, 'USA');
      if (!pt) throw new Error(`no USA price point for ${usd}`);
      const r = await asc('POST', '/v1/subscriptionPrices', { data: { type: 'subscriptionPrices', attributes: { preserveCurrentPrice: false }, relationships: { subscription: { data: { type: 'subscriptions', id } }, subscriptionPricePoint: { data: { type: 'subscriptionPricePoints', id: pt.id } }, territory: { data: { type: 'territories', id: 'USA' } } } } });
      if (r.status !== 201) throw new Error(`USA price ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
      summary.usaPriced++;
    }
    const av = await asc('POST', '/v1/subscriptionAvailabilities', { data: { type: 'subscriptionAvailabilities', attributes: { availableInNewTerritories: false }, relationships: { subscription: { data: { type: 'subscriptions', id } }, availableTerritories: { data: [{ type: 'territories', id: 'BEL' }, { type: 'territories', id: 'USA' }] } } } });
    if (av.status !== 201) throw new Error(`availability ${av.status} ${JSON.stringify(av.json).slice(0, 200)}`);
    summary.availability++;
    const st = await asc('GET', `/v1/subscriptions/${id}?fields[subscriptions]=state`);
    const state = st.json.data.attributes.state; if (state === 'READY_TO_SUBMIT') summary.ready++;
    console.log(pid, 'terrs', terrs.size, '->', state);
  } catch (e) { summary.errors.push(`${pid}: ${e.message}`); console.log(pid, 'ERROR', e.message); }
}
console.log(JSON.stringify(summary, null, 1));
