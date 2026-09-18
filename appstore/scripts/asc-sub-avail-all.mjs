// Open every subscription of a group to all territories again (after the
// territory pricing has completed).
import { asc } from './asc.mjs';
const GROUP = process.argv[2] || '22395785';
const terr = (await asc('GET', '/v1/territories?limit=200')).json.data.map(t => ({ type: 'territories', id: t.id }));
const subs = (await asc('GET', `/v1/subscriptionGroups/${GROUP}/subscriptions?limit=200&fields[subscriptions]=productId,state`)).json.data;
let ok = 0, fail = 0;
for (const s of subs) {
  const av = await asc('GET', `/v1/subscriptions/${s.id}/subscriptionAvailability?include=availableTerritories&limit[availableTerritories]=200`);
  if ((av.json?.included || []).length >= terr.length - 1) continue;
  const pr = await asc('GET', `/v1/subscriptions/${s.id}/prices?limit=200`);
  if ((pr.json.data || []).length < terr.length - 1) { console.log(s.attributes.productId, 'not yet priced everywhere', (pr.json.data || []).length); continue; }
  const r = await asc('POST', '/v1/subscriptionAvailabilities', { data: { type: 'subscriptionAvailabilities', attributes: { availableInNewTerritories: true }, relationships: { subscription: { data: { type: 'subscriptions', id: s.id } }, availableTerritories: { data: terr } } } });
  if (r.status === 201) ok++; else { fail++; console.log(s.attributes.productId, 'availability', r.status, JSON.stringify(r.json).slice(0, 200)); }
}
console.log(JSON.stringify({ opened: ok, failed: fail }));
