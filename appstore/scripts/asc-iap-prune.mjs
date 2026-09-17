// Delete App Store products the catalogue no longer sells (never submitted,
// so deletable): the per-country consumables and the USA subscriptions
// after the Global-or-regional ruling.
import { asc } from './asc.mjs';
const SITE = '/Users/hippolytevanmarcke/new website Ringo april 2026/NEW-website-app-api';
const { appleCatalog } = await import(`${SITE}/api/_apple-products.js`);
const keep = new Set(appleCatalog().map(p => p.productId));
const DRY = process.argv.includes('--dry');
let url = '/v1/apps/6787133742/inAppPurchasesV2?limit=200', iaps = [];
while (url) { const r = await asc('GET', url); iaps.push(...r.json.data); url = r.json.links?.next || null; }
const subs = (await asc('GET', '/v1/subscriptionGroups/22248864/subscriptions?limit=200')).json.data;
let del = 0, kept = 0;
for (const x of iaps) {
  if (keep.has(x.attributes.productId)) { kept++; continue; }
  if (DRY) { console.log('would delete iap', x.attributes.productId); continue; }
  const r = await asc('DELETE', `/v2/inAppPurchases/${x.id}`); console.log('delete iap', x.attributes.productId, r.status); del++;
}
for (const x of subs) {
  if (keep.has(x.attributes.productId)) { kept++; continue; }
  if (DRY) { console.log('would delete sub', x.attributes.productId); continue; }
  const r = await asc('DELETE', `/v1/subscriptions/${x.id}`); console.log('delete sub', x.attributes.productId, r.status); del++;
}
console.log({ kept, deleted: del, needed: keep.size });
