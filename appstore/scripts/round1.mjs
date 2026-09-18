// Which products go into the first review submission (Apple caps a submission at 200 items):
// every product of the regional plans first, then the single countries by how much they travel.
const SITE = '/Users/hippolytevanmarcke/new website Ringo april 2026/NEW-website-app-api';
const { appleCatalog } = await import(`${SITE}/api/_apple-products.js`);
const REGIONS = ['global', 'europe', 'usa', 'asia', 'latam', 'middle-east'];
const POPULAR = ['japan','thailand','turkey','united-arab-emirates','mexico','canada','australia','indonesia','vietnam','india','south-korea','singapore','malaysia','china','egypt','morocco','south-africa','brazil','argentina','colombia','peru','chile','israel','saudi-arabia','qatar','philippines','sri-lanka','taiwan','hong-kong','new-zealand','kenya','tanzania','dominican-republic','costa-rica','cuba','jordan','oman','georgia','albania','montenegro','serbia','bosnia-and-herzegovina','north-macedonia','moldova','ukraine','armenia','azerbaijan','kazakhstan','uzbekistan','nepal','maldives','mauritius','cambodia','laos','pakistan','bangladesh','nigeria','ghana','senegal','ethiopia','uganda','rwanda','namibia','botswana','zambia','zimbabwe','madagascar','tunisia','algeria','kuwait','bahrain','lebanon','iraq','panama','guatemala','ecuador','bolivia','uruguay','paraguay','venezuela','jamaica','bahamas','puerto-rico','trinidad-and-tobago','fiji','papua-new-guinea','mongolia','bhutan','brunei','macao','kyrgyzstan','tajikistan','turkmenistan','afghanistan'];
const rank = (d) => { const i = POPULAR.indexOf(d); return i < 0 ? 999 : i; };
const cat = appleCatalog();
const term = (pid) => (pid.match(/\.(plan|sub|topup)\.([a-z_0-9]+)\./) || [])[2] || '';
const scored = cat.map(p => {
  const ds = p.destinations || [];
  const regional = ds.some(d => REGIONS.includes(d));
  const best = Math.min(...ds.map(rank));
  const t = term(p.productId);
  // tiers: 0 regional (everything) | 1 country 30-day data plans | 2 country unlimited 3/7/30-day | 3 country renewing plans | 4 top-ups
  const tier = regional ? 0 : p.kind === 'topup' ? 4 : p.kind === 'sub' ? 3 : t === 'rl_30' ? 1 : 2;
  const score = tier * 10000 + (regional ? 0 : Math.max(0, 200 - ds.length * 5) + best);
  return { pid: p.productId, kind: p.kind, ds, score, tier };
}).sort((a, b) => a.score - b.score);
const N = Number(process.argv[2] || 197);
const round1 = scored.slice(0, N), round2 = scored.slice(N);
const cov = (list) => new Set(list.flatMap(p => p.ds));
console.log('catalogue', cat.length, '| round1', round1.length, 'covers', cov(round1).size, 'destinations | round2', round2.length, 'covers', cov(round2).size);
console.log('round1 tiers', JSON.stringify(round1.reduce((a, p) => (a['t'+p.tier] = (a['t'+p.tier] || 0) + 1, a), {})), 'all tiers', JSON.stringify(scored.reduce((a, p) => (a['t'+p.tier] = (a['t'+p.tier] || 0) + 1, a), {})));
console.log('round1 kinds', JSON.stringify(round1.reduce((a, p) => (a[p.kind] = (a[p.kind] || 0) + 1, a), {})));
const with30 = [...cov(round1)].filter(d => round1.some(p => p.kind === 'plan' && term(p.pid) === 'rl_30' && p.ds.includes(d)));
console.log('destinations with a 30-day plan in round1:', with30.length, '| last country in:', round1.filter(p => p.tier === 1).slice(-3).map(p => p.ds.join('+')).join(' ; '));
const fullyCovered = with30;
import { writeFileSync } from 'node:fs';
writeFileSync(new URL('./round1.json', import.meta.url), JSON.stringify({ round1: round1.map(p => p.pid), round2: round2.map(p => p.pid), fullyCovered }));
