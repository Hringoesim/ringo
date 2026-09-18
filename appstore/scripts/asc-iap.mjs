// Mirror the Ringo Light catalogue into App Store Connect in-app purchases.
// Usage: node asc-iap.mjs [--dry] [--only <productId>]
import { asc } from './asc.mjs';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
const SITE = '/Users/hippolytevanmarcke/new website Ringo april 2026/NEW-website-app-api';
const { appleCatalog } = await import(`${SITE}/api/_apple-products.js`);
const { convert } = await import(`${SITE}/api/_light-currency.js`);
const APP = '6787133742';
const GROUP = '22248864';               // regions: 'Ringo Plan'
const BASE = 'BEL';                     // prices come from the euro catalogue
const SP = new URL('.', import.meta.url).pathname;
const DRY = process.argv.includes('--dry');
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const MAX_USD = 1000;
const SHOT = `${SP}/shots/4-destination.png`;
const shotBuf = readFileSync(SHOT); const shotMd5 = createHash('md5').update(shotBuf).digest('hex'); const shotSize = statSync(SHOT).size;

const terr = await asc('GET', `/v1/territories?limit=200`);
const ALL_TERR = terr.json.data.map(t => ({ type: 'territories', id: t.id }));
const GROUP_LEVEL = { ONE_YEAR: 1, SIX_MONTHS: 2, TWO_MONTHS: 3 };
const reviewNote = (p) => p.kind === 'topup'
  ? `Extra ${Math.round(p.dataMb / 1024)} GB of mobile data added to the buyer's existing Ringo travel eSIM. Delivered to the eSIM within a minute of purchase.`
  : `Prepaid mobile data eSIM for travel (${p.name}). After purchase the eSIM activation code appears in the app under My eSIM (with an Install button that opens the iOS Add eSIM flow) and is emailed to the buyer. The destination is chosen in the app before purchase; this product covers every destination sold at this price.`;

function usdFor(cents) { return convert(cents, 'usd') / 100; }   // EUR cents -> USD amount on the .99 grid
const money = (n) => n.toFixed(2);

// Existing products by productId
const existingIap = new Map(); let url = `/v1/apps/${APP}/inAppPurchasesV2?limit=200`;
while (url) { const r = await asc('GET', url); for (const x of r.json?.data || []) existingIap.set(x.attributes.productId, x); url = r.json?.links?.next || null; }
const groups = (await asc('GET', `/v1/apps/${APP}/subscriptionGroups?limit=50`)).json.data;
let COUNTRY_GROUP = groups.find(g => g.attributes.referenceName === 'Ringo Country Plan')?.id;
if (!COUNTRY_GROUP && !DRY) {
  const g = await asc('POST', '/v1/subscriptionGroups', { data: { type: 'subscriptionGroups', attributes: { referenceName: 'Ringo Country Plan' }, relationships: { app: { data: { type: 'apps', id: APP } } } } });
  COUNTRY_GROUP = g.json?.data?.id; console.log('created group Ringo Country Plan', g.status, COUNTRY_GROUP);
  if (COUNTRY_GROUP) await asc('POST', '/v1/subscriptionGroupLocalizations', { data: { type: 'subscriptionGroupLocalizations', attributes: { locale: 'en-US', name: 'Ringo Country Plan', customAppName: 'Ringo eSIM' }, relationships: { subscriptionGroup: { data: { type: 'subscriptionGroups', id: COUNTRY_GROUP } } } } });
}
const REGIONS = new Set(['global', 'europe', 'asia', 'latam', 'middle-east', 'usa']);
const groupFor = (p) => (p.destinations.some(d => REGIONS.has(d)) ? GROUP : COUNTRY_GROUP);
const existingSub = new Map();
for (const gid of [GROUP, COUNTRY_GROUP].filter(Boolean)) { url = `/v1/subscriptionGroups/${gid}/subscriptions?limit=200`;
  while (url) { const r = await asc('GET', url); for (const x of r.json?.data || []) existingSub.set(x.attributes.productId, x); url = r.json?.links?.next || null; } }

async function pricePointFor(kind, id, amount, terr = 'USA') {
  const usd = amount;
  const target = money(usd);
  let u = kind === 'sub' ? `/v1/subscriptions/${id}/pricePoints?filter[territory]=${terr}&limit=200` : `/v2/inAppPurchases/${id}/pricePoints?filter[territory]=${terr}&limit=200`;
  let best = null;
  while (u) {
    const r = await asc('GET', u);
    for (const p of r.json?.data || []) {
      const cp = Number(p.attributes.customerPrice);
      if (p.attributes.customerPrice === target) return p;
      if (cp >= usd && (!best || cp < Number(best.attributes.customerPrice))) best = p;   // nearest at or above
    }
    u = r.json?.links?.next || null;
  }
  return best;
}

async function uploadShot(kind, id) {
  const type = kind === 'sub' ? 'subscriptionAppStoreReviewScreenshots' : 'inAppPurchaseAppStoreReviewScreenshots';
  const rel = kind === 'sub' ? { subscription: { data: { type: 'subscriptions', id } } } : { inAppPurchaseV2: { data: { type: 'inAppPurchases', id } } };
  const res = await asc('POST', `/v1/${type}`, { data: { type, attributes: { fileName: 'ringo-plan.png', fileSize: shotSize }, relationships: rel } });
  if (res.status !== 201) return `shot reserve ${res.status} ${JSON.stringify(res.json).slice(0, 200)}`;
  const shot = res.json.data;
  for (const op of shot.attributes.uploadOperations) {
    const up = await fetch(op.url, { method: op.method, headers: Object.fromEntries(op.requestHeaders.map(h => [h.name, h.value])), body: shotBuf.subarray(op.offset, op.offset + op.length) });
    if (!up.ok) return `chunk ${up.status}`;
  }
  const done = await asc('PATCH', `/v1/${type}/${shot.id}`, { data: { type, id: shot.id, attributes: { uploaded: true, sourceFileChecksum: shotMd5 } } });
  return done.status === 200 ? 'ok' : `shot commit ${done.status}`;
}

const catalog = appleCatalog().filter(p => !ONLY || p.productId === ONLY);
const summary = { created: 0, priced: 0, skippedTooDear: [], errors: [] };
for (const p of catalog) {
  const usd = usdFor(p.cents);
  if (usd > MAX_USD) { summary.skippedTooDear.push(`${p.productId} $${money(usd)}`); continue; }
  const kind = p.kind === 'sub' ? 'sub' : 'iap';
  const log = (m) => console.log(`${p.productId} [$${money(usd)}] ${m}`);
  if (DRY) { log(`would ensure ${kind} "${p.name}" / "${p.description}"${p.period ? ` ${p.period}` : ''} (${p.destinations.length} destinations)`); continue; }
  try {
    // 1. the product
    let obj = kind === 'sub' ? existingSub.get(p.productId) : existingIap.get(p.productId);
    if (!obj) {
      const r = kind === 'sub'
        ? await asc('POST', '/v1/subscriptions', { data: { type: 'subscriptions', attributes: { name: `${p.name} $${money(usd)}`, productId: p.productId, subscriptionPeriod: p.period, groupLevel: GROUP_LEVEL[p.period] || 3, reviewNote: reviewNote(p), familySharable: false }, relationships: { group: { data: { type: 'subscriptionGroups', id: groupFor(p) } } } } })
        : await asc('POST', '/v2/inAppPurchases', { data: { type: 'inAppPurchases', attributes: { name: `${p.name} $${money(usd)}`, productId: p.productId, inAppPurchaseType: 'CONSUMABLE', reviewNote: reviewNote(p) }, relationships: { app: { data: { type: 'apps', id: APP } } } } });
      if (r.status !== 201) throw new Error(`create ${r.status} ${JSON.stringify(r.json).slice(0, 300)}`);
      obj = r.json.data; summary.created++;
      log('created');
    }
    const id = obj.id;
    // 2. what it already has. The subscription GET ignores `include`, so its
    //    relationships are read one by one.
    let included = [];
    let state;
    if (kind === 'sub') {
      const g = await asc('GET', `/v1/subscriptions/${id}`); state = g.json?.data?.attributes?.state;
      for (const [rel, type] of [['subscriptionLocalizations', 'subscriptionLocalizations'], ['prices', 'subscriptionPrices'], ['subscriptionAvailability', 'subscriptionAvailabilities'], ['appStoreReviewScreenshot', 'subscriptionAppStoreReviewScreenshots']]) {
        const r = await asc('GET', `/v1/subscriptions/${id}/${rel}`);
        const d = r.json?.data; if (Array.isArray(d)) included.push(...d); else if (d) included.push(d);
        void type;
      }
    } else {
      const g = await asc('GET', `/v2/inAppPurchases/${id}`); state = g.json?.data?.attributes?.state;
      for (const [rel, type] of [['inAppPurchaseLocalizations', 'inAppPurchaseLocalizations'], ['iapPriceSchedule', 'inAppPurchasePriceSchedules'], ['inAppPurchaseAvailability', 'inAppPurchaseAvailabilities'], ['appStoreReviewScreenshot', 'inAppPurchaseAppStoreReviewScreenshots']]) {
        const r = await asc('GET', `/v2/inAppPurchases/${id}/${rel}`);
        const d = r.json?.data; if (Array.isArray(d)) included.push(...d); else if (d) included.push({ ...d, type: d.type || type });
      }
    }
    const inc = { json: { included } };
    const has = (t) => included.some(i => i.type === t);
    // 3. localization (a subscription's display name is renamed when the catalogue's differs)
    const locType = kind === 'sub' ? 'subscriptionLocalizations' : 'inAppPurchaseLocalizations';
    const existingLoc = (inc.json?.included || []).find(i => i.type === locType);
    if (existingLoc && (existingLoc.attributes.name !== p.name || existingLoc.attributes.description !== p.description)) {
      const r = await asc('PATCH', `/v1/${locType}/${existingLoc.id}`, { data: { type: locType, id: existingLoc.id, attributes: { name: p.name, description: p.description } } });
      if (r.status !== 200) throw new Error(`localization rename ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
      log(`renamed to "${p.name}"`);
    }
    if (!has(locType)) {
      const r = kind === 'sub'
        ? await asc('POST', '/v1/subscriptionLocalizations', { data: { type: 'subscriptionLocalizations', attributes: { locale: 'en-US', name: p.name, description: p.description }, relationships: { subscription: { data: { type: 'subscriptions', id } } } } })
        : await asc('POST', '/v1/inAppPurchaseLocalizations', { data: { type: 'inAppPurchaseLocalizations', attributes: { locale: 'en-US', name: p.name, description: p.description }, relationships: { inAppPurchaseV2: { data: { type: 'inAppPurchases', id } } } } });
      if (r.status !== 201) throw new Error(`localization ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
    }
    // 5. availability: every territory
    if (!has(kind === 'sub' ? 'subscriptionAvailabilities' : 'inAppPurchaseAvailabilities')) {
      const r = kind === 'sub'
        ? await asc('POST', '/v1/subscriptionAvailabilities', { data: { type: 'subscriptionAvailabilities', attributes: { availableInNewTerritories: true }, relationships: { subscription: { data: { type: 'subscriptions', id } }, availableTerritories: { data: ALL_TERR } } } })
        : await asc('POST', '/v1/inAppPurchaseAvailabilities', { data: { type: 'inAppPurchaseAvailabilities', attributes: { availableInNewTerritories: true }, relationships: { inAppPurchase: { data: { type: 'inAppPurchases', id } }, availableTerritories: { data: ALL_TERR } } } });
      if (r.status !== 201) throw new Error(`availability ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
    }
    // 4. price
    if (!has(kind === 'sub' ? 'subscriptionPrices' : 'inAppPurchasePriceSchedules')) {
      const eur = await pricePointFor(kind, id, p.cents / 100, BASE);
      const pt = await pricePointFor(kind, id, usd, 'USA');
      if (!eur || !pt) throw new Error(`no price point (BEL ${money(p.cents / 100)} / USA ${money(usd)})`);
      const r = kind === 'sub'
        ? await asc('POST', '/v1/subscriptionPrices', { data: { type: 'subscriptionPrices', attributes: { preserveCurrentPrice: false }, relationships: { subscription: { data: { type: 'subscriptions', id } }, subscriptionPricePoint: { data: { type: 'subscriptionPricePoints', id: eur.id } } } } })
        : await asc('POST', '/v1/inAppPurchasePriceSchedules', {
            data: { type: 'inAppPurchasePriceSchedules', relationships: { inAppPurchase: { data: { type: 'inAppPurchases', id } }, baseTerritory: { data: { type: 'territories', id: BASE } }, manualPrices: { data: [{ type: 'inAppPurchasePrices', id: '${p1}' }, { type: 'inAppPurchasePrices', id: '${p2}' }] } } },
            included: [
              { type: 'inAppPurchasePrices', id: '${p1}', attributes: { startDate: null }, relationships: { inAppPurchasePricePoint: { data: { type: 'inAppPurchasePricePoints', id: eur.id } } } },
              { type: 'inAppPurchasePrices', id: '${p2}', attributes: { startDate: null }, relationships: { inAppPurchasePricePoint: { data: { type: 'inAppPurchasePricePoints', id: pt.id } } } },
            ],
          });
      if (r.status !== 201) throw new Error(`price ${r.status} ${JSON.stringify(r.json).slice(0, 300)}`);
      summary.priced++;
    }
    // 6. review screenshot
    if (!has(kind === 'sub' ? 'subscriptionAppStoreReviewScreenshots' : 'inAppPurchaseAppStoreReviewScreenshots')) {
      const s = await uploadShot(kind, id);
      if (s !== 'ok') throw new Error(s);
    }
    log(`ensured (was ${state})`);
  } catch (err) {
    summary.errors.push(`${p.productId}: ${err.message}`);
    log(`ERROR ${err.message}`);
  }
}
console.log(JSON.stringify(summary, null, 1));
