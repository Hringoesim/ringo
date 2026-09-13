// Usage: node asc-sub-prices.mjs [maxSubsPerRun]
// Subscriptions need a price in EVERY territory they are available in (the
// consumables' price schedule equalizes on its own; subscriptions do not).
// For each subscription with only its USA price, POST Apple's equalized
// price point for every other territory. Resumable; N subs per run.
import { asc } from './asc.mjs';
const MAX_SUBS = Number(process.argv[2] || 6);
const subs = await asc('GET', '/v1/subscriptionGroups/22248864/subscriptions?limit=200');
let done = 0;
for (const s of subs.json.data) {
  if (done >= MAX_SUBS) break;
  const prices = await asc('GET', `/v1/subscriptions/${s.id}/prices?include=subscriptionPricePoint,territory&limit=200`);
  const have = new Set((prices.json.included || []).filter(i => i.type === 'territories').map(t => t.id));
  if (have.size >= 170) { console.log(s.attributes.productId, 'already priced in', have.size); continue; }
  const usa = (prices.json.included || []).find(i => i.type === 'subscriptionPricePoints');
  if (!usa) { console.log(s.attributes.productId, 'NO USA PRICE, skipped'); continue; }
  const eq = await asc('GET', `/v1/subscriptionPricePoints/${usa.id}/equalizations?include=territory&limit=200`);
  let ok = 0, fail = 0;
  const todo = (eq.json?.data || []).filter(p => { const t = p.relationships?.territory?.data?.id; return t && !have.has(t); });
  // Ten at a time: one at a time took a second each.
  for (let i = 0; i < todo.length; i += 10) {
    await Promise.all(todo.slice(i, i + 10).map(async (p) => {
      const r = await asc('POST', '/v1/subscriptionPrices', { data: { type: 'subscriptionPrices', attributes: { preserveCurrentPrice: false }, relationships: { subscription: { data: { type: 'subscriptions', id: s.id } }, subscriptionPricePoint: { data: { type: 'subscriptionPricePoints', id: p.id } } } } });
      if (r.status === 201) ok++; else { fail++; if (fail < 3) console.log('  fail', p.relationships?.territory?.data?.id, r.status, JSON.stringify(r.json).slice(0, 160)); }
    }));
  }
  const g = await asc('GET', `/v1/subscriptions/${s.id}`);
  console.log(s.attributes.productId, `priced ${ok} territories, ${fail} failed, state ${g.json?.data?.attributes?.state}`);
  done++;
}
console.log('subs handled this run', done);
