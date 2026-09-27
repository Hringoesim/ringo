// App Store prices follow the website, one to one (owner 2026-09-27:
// "always use the prices of the website and update it 1-1").
//
// The live website is the only source: every destination's
// /api/esim-plans (USD) names the App Store product that sells each plan
// and top-up, and what the site charges for it. For each advertised product
// this makes App Store Connect agree:
//
//   missing      created with the mirror's steps (asc-iap.mjs): product,
//                en-US name and description, review note, every territory,
//                review screenshot, prices
//   USA          the site's USD amount, or Apple's nearest point ABOVE it
//                when Apple has no point at that amount (margin floor: never
//                under the website)
//   Belgium      the base storefront, at the euro cents written in the
//                product id, the same way; Apple equalizes the others (a
//                subscription gets every equalized point written)
//   over $1,000  cannot exist in the App Store; reported, never created
//   orphans      in App Store Connect but no longer advertised: listed only,
//                nothing is ever deleted
//
// Only what differs is touched, so it can run after every reprice.
// Nothing is submitted for review.
//
// Usage (from this folder):
//   node asc-price-sync.mjs --dry            scan and print the plan, change nothing
//   node asc-price-sync.mjs                  scan, then create and reprice
//   options: --only <productId>   --json <file> (every row, for a report)
//
// Note: each run opens every destination's offer on the site, which the
// site records as one "view" per destination in its demand table.
import { asc } from './asc.mjs';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const APP = '6787133742';
const SITE = 'https://ringoesim.com';
const BASE = 'BEL';
const REGION_GROUP_NAME = 'Ringo Plan';
const COUNTRY_GROUP_NAME = 'Ringo Country Plan';
const MAX_USD_CENTS = 100000;
const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
const DRY = process.argv.includes('--dry');
const ONLY = arg('--only');
const JSON_OUT = arg('--json');
const HERE = new URL('.', import.meta.url).pathname;
const SHOT = `${HERE}shots/4-destination.png`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const usd = (c) => `$${(c / 100).toFixed(2)}`;
const eur = (c) => `EUR ${(c / 100).toFixed(2)}`;
const toCents = (s) => Math.round(Number(s) * 100);
const today = new Date().toISOString().slice(0, 10);

// Apple answers bursts with 429: wait it out (asc() retries 5xx on its own).
async function call(method, path, body) {
  const p = path?.replace(/^https:\/\/api\.appstoreconnect\.apple\.com/, '');
  for (let t = 0; t < 8; t++) {
    const r = await asc(method, p, body);
    if (r.status !== 429) return r;
    await sleep(15000 * (t + 1));
  }
  throw new Error(`429 persisted on ${method} ${p}`);
}
async function all(path) {
  const out = []; let u = path; const inc = [];
  while (u) { const r = await call('GET', u); out.push(...(r.json?.data || [])); inc.push(...(r.json?.included || [])); u = r.json?.links?.next || null; }
  return { data: out, included: inc };
}

// ---------------------------------------------------------------- website
async function site(dest) {
  for (let t = 0; t < 4; t++) {
    try { const r = await fetch(`${SITE}/api/esim-plans?destination=${encodeURIComponent(dest)}&currency=usd`); if (r.ok) return await r.json(); } catch { /* retry */ }
    await sleep(1500 * (t + 1));
  }
  return null;
}
const PERIOD = { 1: 'ONE_MONTH', 2: 'TWO_MONTHS', 6: 'SIX_MONTHS', 12: 'ONE_YEAR' };
const GROUP_LEVEL = { ONE_YEAR: 1, SIX_MONTHS: 2, TWO_MONTHS: 3, ONE_MONTH: 4 };
const SUB_LABEL = { europe: 'Europe', asia: 'Asia', latam: 'LatAm', 'middle-east': 'Mid. East', global: 'Global', usa: 'USA' };

async function readSite() {
  const first = await site('europe');
  if (!first?.destinations?.length) throw new Error('website catalogue unreadable');
  const dests = first.destinations;
  const labelOf = new Map(dests.map((d) => [d.id, d]));
  const products = new Map();   // productId -> row
  const failed = [];
  const lifted = new Set();
  for (const d of dests) {
    const c = d.id === 'europe' ? first : await site(d.id);
    if (!c) { failed.push(d.id); continue; }
    if (String(c.currency).toLowerCase() !== 'usd') { failed.push(`${d.id} (currency ${c.currency})`); continue; }
    const factor = Number(c.pricing?.factor) || 1;
    const planKey = c.destination?.id || d.id;
    const add = (pid, k, siteCents, info) => {
      if (!pid) return;
      const row = products.get(pid) || { productId: pid, kind: k, sitePrices: new Set(), liftedPrices: new Set(), where: new Set(), plans: new Set(), info };
      // A demand lift is per visitor and per day; the App Store price is the
      // catalogue floor, so a lifted plan price is not taken as the target.
      if (k !== 'topup' && factor !== 1) { row.liftedPrices.add(siteCents); lifted.add(planKey); } else row.sitePrices.add(siteCents);
      row.where.add(d.id); row.plans.add(planKey); products.set(pid, row);
    };
    for (const p of c.plans || []) {
      const sub = p.mode === 'subscription';
      // A renewing plan is one Apple subscription charged per Apple period.
      // A ONE_MONTH product (Global since 2026-09-27) is charged the site's
      // monthly amount; a term-priced one the term total (the site may bill
      // that term monthly, so the comparable amount is monthly x months).
      const cents = !sub ? p.billed_upfront_amount
        : p.apple_period === 'ONE_MONTH' ? p.monthly_amount
          : (p.billed_monthly ? p.monthly_amount * p.term_months : p.billed_upfront_amount);
      add(p.apple_product_id, sub ? 'sub' : 'plan', cents, { plan: p.plan, tier: p.tier, gb: p.data_gb, days: p.days, months: p.term_months });
    }
    for (const t of c.top_ups || c.topups || []) add(t.apple_product_id, 'topup', t.amount, { plan: t.plan, gb: t.data_gb });
  }
  for (const row of products.values()) {
    row.eurCents = Number(row.productId.split('.').slice(-2, -1)[0]);
    const s = [...row.sitePrices];
    row.siteCents = s.length ? Math.max(...s) : null;   // never under any price the site shows
    row.ambiguous = s.length > 1;
    row.destinations = [...row.plans];
    row.labels = row.destinations.map((id) => labelOf.get(id)?.label || id);
    row.regional = row.destinations.some((id) => labelOf.get(id)?.kind === 'region');
  }
  return { products, destinations: dests.length, failed, lifted: [...lifted] };
}

// What App Store Connect shows for a new product (mirrors appleProductCopy
// in the website's api/_apple-products.js; 30 / 45 character limits).
function copyFor(row) {
  const { info } = row;
  if (row.kind === 'topup') return { name: `${info.gb} GB top-up`, description: 'Extra data on your Ringo eSIM, 30 days' };
  if (row.kind === 'sub') {
    let where = row.destinations.length === 1 ? (SUB_LABEL[row.destinations[0]] || row.labels[0]) : 'Ringo';
    const len = info.months === 1 ? 'monthly' : `${info.months}mo`;
    const nameFor = (w) => (info.gb == null ? `${w} Unlimited ${len}` : `${w} ${info.gb}GB/mo ${len}`);
    if (nameFor(where).length > 30) where = where.slice(0, 30 - nameFor('').length).trim();
    return info.gb == null
      ? { name: nameFor(where), description: 'Unlimited travel data, renews, cancel anytime' }
      : { name: nameFor(where), description: `${info.gb} GB every month, renews, cancel anytime` };
  }
  return info.gb == null
    ? { name: `Unlimited eSIM, ${info.days} days`, description: `Unlimited travel data for ${info.days} days, fair use` }
    : { name: `${info.gb} GB eSIM, ${info.days} days`, description: `${info.gb} GB of travel data, no daily cap` };
}
// The review note the mirror writes (asc-iap.mjs).
const reviewNote = (row, name) => (row.kind === 'topup'
  ? `Extra ${row.info.gb} GB of mobile data added to the buyer's existing Ringo travel eSIM. Delivered to the eSIM within a minute of purchase.`
  : `Prepaid mobile data eSIM for travel (${name}). After purchase the eSIM activation code appears in the app under My eSIM (with an Install button that opens the iOS Add eSIM flow) and is emailed to the buyer. The destination is chosen in the app before purchase; this product covers every destination sold at this price.`);

// ------------------------------------------------------- App Store Connect
async function readStore() {
  const store = new Map();
  for (const x of (await all(`/v1/apps/${APP}/inAppPurchasesV2?limit=200`)).data) store.set(x.attributes.productId, { kind: 'iap', id: x.id, state: x.attributes.state, name: x.attributes.name });
  const groups = (await all(`/v1/apps/${APP}/subscriptionGroups?limit=50`)).data;
  for (const g of groups) for (const x of (await all(`/v1/subscriptionGroups/${g.id}/subscriptions?limit=200`)).data) store.set(x.attributes.productId, { kind: 'sub', id: x.id, state: x.attributes.state, name: x.attributes.name, group: g.id });
  return { store, groups };
}
const live = (d) => { const sd = d.attributes?.startDate; const ed = d.attributes?.endDate; return (!sd || sd <= today) && (!ed || ed > today); };

// Current USA and Belgium prices (cents), the IAP base territory, and how
// many storefronts a subscription is priced in.
async function currentPrices(s) {
  const out = { USA: null, BEL: null, base: null, territories: null };
  const take = (rows, inc, rel) => {
    const byId = new Map(inc.map((i) => [`${i.type}:${i.id}`, i]));
    const best = {};
    for (const d of rows) {
      const terr = d.relationships?.territory?.data?.id;
      if (!['USA', 'BEL'].includes(terr) || !live(d)) continue;
      const ref = d.relationships?.[rel]?.data; const pp = ref && byId.get(`${ref.type}:${ref.id}`);
      if (!pp) continue;
      const sd = d.attributes?.startDate || '';
      if (!best[terr] || sd >= best[terr].sd) best[terr] = { sd, cents: toCents(pp.attributes.customerPrice) };
    }
    for (const t of ['USA', 'BEL']) if (best[t] && out[t] == null) out[t] = best[t].cents;
  };
  if (s.kind === 'iap') {
    const b = await call('GET', `/v1/inAppPurchasePriceSchedules/${s.id}/baseTerritory`);
    out.base = b.json?.data?.id || null;
    const m = await all(`/v1/inAppPurchasePriceSchedules/${s.id}/manualPrices?include=inAppPurchasePricePoint,territory&limit=200`);
    take(m.data, m.included, 'inAppPurchasePricePoint');
    if (out.USA == null || out.BEL == null) {
      const a = await all(`/v1/inAppPurchasePriceSchedules/${s.id}/automaticPrices?filter[territory]=USA,BEL&include=inAppPurchasePricePoint,territory&limit=200`);
      take(a.data, a.included, 'inAppPurchasePricePoint');
    }
  } else {
    const r = await all(`/v1/subscriptions/${s.id}/prices?include=subscriptionPricePoint,territory&limit=200`);
    take(r.data, r.included, 'subscriptionPricePoint');
    out.territories = new Set(r.data.map((d) => d.relationships?.territory?.data?.id).filter(Boolean)).size;
  }
  return out;
}

// Apple's price points for one product in one storefront, cheapest first.
const pointCache = new Map();
async function points(s, terr) {
  const key = `${s.id}:${terr}`;
  if (!pointCache.has(key)) {
    const path = s.kind === 'sub' ? `/v1/subscriptions/${s.id}/pricePoints?filter[territory]=${terr}&limit=200` : `/v2/inAppPurchases/${s.id}/pricePoints?filter[territory]=${terr}&limit=200`;
    pointCache.set(key, (await all(path)).data.map((p) => ({ id: p.id, cents: toCents(p.attributes.customerPrice) })).sort((a, b) => a.cents - b.cents));
  }
  return pointCache.get(key);
}
const atOrAbove = (list, cents) => list.find((p) => p.cents >= cents) || null;

// The Apple USA point at or above a website amount, without a product at
// hand (used before a product exists): the ladder is the same for every
// product of a kind, so it is read from any existing one.
async function ladder(kind, store, terr) {
  const any = [...store.values()].find((s) => s.kind === kind);
  return any ? points(any, terr) : [];
}

// ------------------------------------------------------------------ writes
async function setIapPrices(s, belPt, usaPt) {
  const r = await call('POST', '/v1/inAppPurchasePriceSchedules', {
    data: { type: 'inAppPurchasePriceSchedules', relationships: { inAppPurchase: { data: { type: 'inAppPurchases', id: s.id } }, baseTerritory: { data: { type: 'territories', id: BASE } }, manualPrices: { data: [{ type: 'inAppPurchasePrices', id: '${p1}' }, { type: 'inAppPurchasePrices', id: '${p2}' }] } } },
    included: [
      { type: 'inAppPurchasePrices', id: '${p1}', attributes: { startDate: null }, relationships: { inAppPurchasePricePoint: { data: { type: 'inAppPurchasePricePoints', id: belPt.id } } } },
      { type: 'inAppPurchasePrices', id: '${p2}', attributes: { startDate: null }, relationships: { inAppPurchasePricePoint: { data: { type: 'inAppPurchasePricePoints', id: usaPt.id } } } },
    ],
  });
  if (r.status !== 201) throw new Error(`price schedule ${r.status} ${JSON.stringify(r.json?.errors || r.text).slice(0, 300)}`);
}
async function postSubPrice(s, pointId) {
  const r = await call('POST', '/v1/subscriptionPrices', { data: { type: 'subscriptionPrices', attributes: { preserveCurrentPrice: false }, relationships: { subscription: { data: { type: 'subscriptions', id: s.id } }, subscriptionPricePoint: { data: { type: 'subscriptionPricePoints', id: pointId } } } } });
  return r;
}
// Belgium at its point, every other storefront at Apple's equalization of
// it, then the USA at the site's USD point.
async function setSubPrices(s, belPt, usaPt, { belChanged, fillAll }) {
  let ok = 0, fail = 0; const errs = [];
  if (belChanged || fillAll) {
    const r = await postSubPrice(s, belPt.id);
    if (r.status !== 201) throw new Error(`BEL price ${r.status} ${JSON.stringify(r.json?.errors || r.text).slice(0, 300)}`);
    const eq = (await all(`/v1/subscriptionPricePoints/${belPt.id}/equalizations?include=territory&limit=200`)).data
      .filter((q) => !['BEL', 'USA'].includes(q.relationships?.territory?.data?.id));
    for (let i = 0; i < eq.length; i += 5) {
      await Promise.all(eq.slice(i, i + 5).map(async (q) => {
        const x = await postSubPrice(s, q.id);
        if (x.status === 201) ok++; else { fail++; if (errs.length < 3) errs.push(`${q.relationships?.territory?.data?.id} ${x.status}`); }
      }));
    }
  }
  const u = await postSubPrice(s, usaPt.id);
  if (u.status !== 201) throw new Error(`USA price ${u.status} ${JSON.stringify(u.json?.errors || u.text).slice(0, 300)}`);
  if (fail) throw new Error(`${fail} storefronts failed (${errs.join(', ')}), ${ok} ok`);
  return ok;
}

let shotBuf = null;
async function uploadShot(kind, id) {
  shotBuf ||= readFileSync(SHOT);
  const md5 = createHash('md5').update(shotBuf).digest('hex');
  const type = kind === 'sub' ? 'subscriptionAppStoreReviewScreenshots' : 'inAppPurchaseAppStoreReviewScreenshots';
  const rel = kind === 'sub' ? { subscription: { data: { type: 'subscriptions', id } } } : { inAppPurchaseV2: { data: { type: 'inAppPurchases', id } } };
  const res = await call('POST', `/v1/${type}`, { data: { type, attributes: { fileName: 'ringo-plan.png', fileSize: statSync(SHOT).size }, relationships: rel } });
  if (res.status !== 201) throw new Error(`screenshot reserve ${res.status}`);
  const shot = res.json.data;
  for (const op of shot.attributes.uploadOperations) {
    const up = await fetch(op.url, { method: op.method, headers: Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value])), body: shotBuf.subarray(op.offset, op.offset + op.length) });
    if (!up.ok) throw new Error(`screenshot chunk ${up.status}`);
  }
  const done = await call('PATCH', `/v1/${type}/${shot.id}`, { data: { type, id: shot.id, attributes: { uploaded: true, sourceFileChecksum: md5 } } });
  if (done.status !== 200) throw new Error(`screenshot commit ${done.status}`);
}

// Create a missing product and everything but its prices (asc-iap.mjs steps).
async function create(row, groups, territories) {
  const { name, description } = copyFor(row);
  const ref = `${name} ${usd(row.siteCents)}`;
  let r;
  if (row.kind === 'sub') {
    const period = PERIOD[row.info.months];
    if (!period) throw new Error(`no Apple period for ${row.info.months} months`);
    const want = row.regional ? REGION_GROUP_NAME : COUNTRY_GROUP_NAME;
    const g = groups.find((x) => x.attributes.referenceName === want);
    if (!g) throw new Error(`subscription group "${want}" not found`);
    r = await call('POST', '/v1/subscriptions', { data: { type: 'subscriptions', attributes: { name: ref, productId: row.productId, subscriptionPeriod: period, groupLevel: GROUP_LEVEL[period], reviewNote: reviewNote(row, name), familySharable: false }, relationships: { group: { data: { type: 'subscriptionGroups', id: g.id } } } } });
  } else {
    r = await call('POST', '/v2/inAppPurchases', { data: { type: 'inAppPurchases', attributes: { name: ref, productId: row.productId, inAppPurchaseType: 'CONSUMABLE', reviewNote: reviewNote(row, name) }, relationships: { app: { data: { type: 'apps', id: APP } } } } });
  }
  if (r.status !== 201) {
    const dup = JSON.stringify(r.json || '').includes('DUPLICATE');
    throw new Error(`create ${r.status}${dup ? ' DUPLICATE: the id was used before (add it to BURNED_IDS in the website api/_apple-products.js)' : ''} ${JSON.stringify(r.json?.errors || r.text).slice(0, 300)}`);
  }
  const s = { kind: row.kind === 'sub' ? 'sub' : 'iap', id: r.json.data.id, state: r.json.data.attributes.state };
  await ensureMetadata(s, row, territories);
  return s;
}
async function ensureMetadata(s, row, territories) {
  const { name, description } = copyFor(row);
  const has = async (path) => { const x = await call('GET', path); return Array.isArray(x.json?.data) ? x.json.data.length > 0 : Boolean(x.json?.data); };
  const sub = s.kind === 'sub';
  if (!(await has(sub ? `/v1/subscriptions/${s.id}/subscriptionLocalizations` : `/v2/inAppPurchases/${s.id}/inAppPurchaseLocalizations`))) {
    const x = sub
      ? await call('POST', '/v1/subscriptionLocalizations', { data: { type: 'subscriptionLocalizations', attributes: { locale: 'en-US', name, description }, relationships: { subscription: { data: { type: 'subscriptions', id: s.id } } } } })
      : await call('POST', '/v1/inAppPurchaseLocalizations', { data: { type: 'inAppPurchaseLocalizations', attributes: { locale: 'en-US', name, description }, relationships: { inAppPurchaseV2: { data: { type: 'inAppPurchases', id: s.id } } } } });
    if (x.status !== 201) throw new Error(`localization ${x.status} ${JSON.stringify(x.json?.errors || '').slice(0, 200)}`);
  }
  if (!(await has(sub ? `/v1/subscriptions/${s.id}/subscriptionAvailability` : `/v2/inAppPurchases/${s.id}/inAppPurchaseAvailability`))) {
    const x = sub
      ? await call('POST', '/v1/subscriptionAvailabilities', { data: { type: 'subscriptionAvailabilities', attributes: { availableInNewTerritories: true }, relationships: { subscription: { data: { type: 'subscriptions', id: s.id } }, availableTerritories: { data: territories } } } })
      : await call('POST', '/v1/inAppPurchaseAvailabilities', { data: { type: 'inAppPurchaseAvailabilities', attributes: { availableInNewTerritories: true }, relationships: { inAppPurchase: { data: { type: 'inAppPurchases', id: s.id } }, availableTerritories: { data: territories } } } });
    if (x.status !== 201) throw new Error(`availability ${x.status} ${JSON.stringify(x.json?.errors || '').slice(0, 200)}`);
  }
  if (!(await has(sub ? `/v1/subscriptions/${s.id}/appStoreReviewScreenshot` : `/v2/inAppPurchases/${s.id}/appStoreReviewScreenshot`))) await uploadShot(s.kind, s.id);
}

// -------------------------------------------------------------------- run
const t0 = Date.now();
const { products, destinations, failed: siteFailed, lifted } = await readSite();
const { store, groups } = await readStore();
const territories = (await all('/v1/territories?limit=200')).data.map((t) => ({ type: 'territories', id: t.id }));
const rows = [...products.values()].filter((r) => !ONLY || r.productId === ONLY).sort((a, b) => a.productId.localeCompare(b.productId));
const usaLadder = { sub: await ladder('sub', store, 'USA'), iap: await ladder('iap', store, 'USA') };
const belLadder = { sub: await ladder('sub', store, BASE), iap: await ladder('iap', store, BASE) };
const log = (row, m) => console.log(`${row.productId}  ${m}`);

for (const row of rows) {
  const k = row.kind === 'sub' ? 'sub' : 'iap';
  row.target = {};
  if (row.siteCents == null) { row.status = 'lifted_only'; row.note = 'site shows only demand-lifted prices'; continue; }
  if (row.siteCents > MAX_USD_CENTS) { row.status = 'impossible'; row.note = `${usd(row.siteCents)} is over Apple's $1,000 cap`; }
  let s = store.get(row.productId);
  row.inStore = Boolean(s);
  row.state = s?.state || null;
  try {
    if (!s) {
      if (row.status === 'impossible') continue;
      const u = atOrAbove(usaLadder[k], row.siteCents), b = atOrAbove(belLadder[k], row.eurCents);
      row.target = { USA: u?.cents ?? null, BEL: b?.cents ?? null };
      if (DRY) { row.status = 'would_create'; log(row, `would create ${k} "${copyFor(row).name}", USA ${usd(row.siteCents)} -> ${u ? usd(u.cents) : 'NO POINT'}, BEL ${eur(row.eurCents)} -> ${b ? eur(b.cents) : 'NO POINT'}`); continue; }
      s = await create(row, groups, territories);
      store.set(row.productId, s); row.inStore = true; row.created = true; row.state = s.state;
      log(row, 'created');
    } else if (!DRY && row.status !== 'impossible' && s.state === 'MISSING_METADATA') {
      await ensureMetadata(s, row, territories);
    }
    const cur = await currentPrices(s);
    row.usa = cur.USA; row.bel = cur.BEL; row.base = cur.base; row.territories = cur.territories;
    if (row.status === 'impossible') continue;
    const usaPts = await points(s, 'USA'); const belPts = await points(s, BASE);
    const usaPt = atOrAbove(usaPts, row.siteCents); const belPt = atOrAbove(belPts, row.eurCents);
    if (!usaPt || !belPt) { row.status = 'impossible'; row.note = !usaPt ? `no USA point at or above ${usd(row.siteCents)}` : `no Belgium point at or above ${eur(row.eurCents)}`; continue; }
    row.target = { USA: usaPt.cents, BEL: belPt.cents };
    const usaOk = cur.USA === usaPt.cents;
    const belOk = cur.BEL === belPt.cents && (k === 'sub' || cur.base === BASE);
    const fillAll = k === 'sub' && (cur.territories ?? 0) < 175;
    if (usaOk && belOk && !fillAll) { row.status = row.created ? 'created' : 'in_sync'; continue; }
    const what = `USA ${cur.USA == null ? 'none' : usd(cur.USA)} -> ${usd(usaPt.cents)}, BEL ${cur.BEL == null ? 'none' : eur(cur.BEL)} -> ${eur(belPt.cents)}${k === 'iap' && cur.base !== BASE ? ` (base ${cur.base} -> BEL)` : ''}${fillAll ? `, storefronts ${cur.territories} -> all` : ''}`;
    if (DRY) { row.status = 'would_reprice'; log(row, `would reprice: ${what}`); continue; }
    if (k === 'iap') await setIapPrices(s, belPt, usaPt);
    else await setSubPrices(s, belPt, usaPt, { belChanged: !belOk, fillAll });
    row.status = row.created ? 'created' : 'repriced'; row.was = { USA: cur.USA, BEL: cur.BEL };
    row.usa = usaPt.cents; row.bel = belPt.cents;
    log(row, `${row.created ? 'priced' : 'repriced'}: ${what}`);
  } catch (err) {
    row.status = 'failed'; row.error = err.message; log(row, `FAILED ${err.message}`);
  }
}

// Orphans: in App Store Connect, not advertised by the site any more.
const advertised = new Set(products.keys());
const orphans = ONLY ? [] : [...store.entries()].filter(([pid]) => !advertised.has(pid)).map(([pid, s]) => ({ productId: pid, kind: s.kind, state: s.state }));

const count = (st) => rows.filter((r) => r.status === st).length;
const priced = rows.filter((r) => r.target?.USA != null && ['in_sync', 'repriced', 'created'].includes(r.status));
const exact = priced.filter((r) => r.target.USA === r.siteCents).length;
const summary = {
  at: new Date().toISOString(), dry: DRY, seconds: Math.round((Date.now() - t0) / 1000),
  site: { destinations, products: products.size, unreadable: siteFailed, demandLifted: lifted, ambiguousPrice: rows.filter((r) => r.ambiguous).map((r) => r.productId) },
  store: { products: store.size, advertisedInStore: rows.filter((r) => r.inStore).length },
  inSync: count('in_sync'), repriced: count('repriced'), created: count('created'),
  wouldCreate: count('would_create'), wouldReprice: count('would_reprice'),
  usaExact: exact, usaAboveSite: priced.length - exact,
  impossible: rows.filter((r) => r.status === 'impossible').map((r) => `${r.productId} ${r.note}`),
  failed: rows.filter((r) => r.status === 'failed').map((r) => `${r.productId}: ${r.error}`),
  orphans: orphans.length,
};
console.log(JSON.stringify(summary, null, 1));
if (orphans.length) console.log(`orphans (listed, not deleted):\n${orphans.map((o) => `  ${o.productId} ${o.kind} ${o.state}`).join('\n')}`);
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ summary, orphans, rows: rows.map((r) => ({ ...r, sitePrices: [...r.sitePrices], liftedPrices: [...r.liftedPrices], where: [...r.where], plans: undefined })) }, null, 1));
