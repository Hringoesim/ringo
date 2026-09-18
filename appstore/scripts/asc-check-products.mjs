import { asc } from './asc.mjs';
const SITE = '/Users/hippolytevanmarcke/new website Ringo april 2026/NEW-website-app-api';
const { appleCatalog } = await import(`${SITE}/api/_apple-products.js`);
const { convert } = await import(`${SITE}/api/_light-currency.js`);
// Every product the catalogue needs in the App Store (the few above Apple's $1,000 cap are skipped by the mirror and hidden by the app).
const want = new Set(appleCatalog().filter(p => convert(p.cents, 'usd') / 100 <= 1000).map(p => p.productId));
const have = new Map();
async function page(path) { let url = path; while (url) { const r = await asc('GET', url); for (const x of r.json.data || []) have.set(x.attributes.productId, x.attributes.state); const n = r.json.links?.next; url = n ? n.replace(/^https:\/\/api\.appstoreconnect\.apple\.com/, '') : null; } }
await page(`/v1/apps/6787133742/inAppPurchasesV2?limit=200`);
await page(`/v1/subscriptionGroups/22248864/subscriptions?limit=200`);
const missing = [...want].filter((id) => !have.has(id));
const notReady = [...want].filter((id) => have.has(id) && !['READY_TO_SUBMIT','APPROVED','WAITING_FOR_REVIEW','IN_REVIEW'].includes(have.get(id)));
console.log('catalogue ids', want.size, '| in ASC', [...want].filter((id) => have.has(id)).length, '| ASC total', have.size, '| missing', missing, '| not ready', notReady.map((id) => `${id}:${have.get(id)}`));
const states = {}; for (const [id, s] of have) if (want.has(id)) states[s] = (states[s] || 0) + 1; console.log('wanted by state', states);
const stale = [...have.keys()].filter((id) => !want.has(id)); console.log('stale in ASC (not in catalogue)', stale.length);
console.log('--- ASC .g2 ids ---'); console.log([...have.keys()].filter((id) => id.endsWith('.g2')).sort().join('\n'));
console.log('--- catalogue wants ---'); console.log([...want].sort().join('\n'));
