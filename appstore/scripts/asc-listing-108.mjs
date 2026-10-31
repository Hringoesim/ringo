// Writes the 1.08 store listing (listing-1.08.json) to App Store Connect:
// name + subtitle on the editable appInfo, description/keywords/promo/What's New
// on the 1.08 version. Existing locales are patched, missing ones created.
import { readFileSync } from 'node:fs';
import { asc } from './asc.mjs';

const APP_INFO = '4fa5ce88-2ce5-49fa-b781-128e55ff8344';
const VERSION = '94da28e5-2691-496f-b07f-8e33d4b17d0a';
const L = JSON.parse(readFileSync(new URL('../listing-1.08.json', import.meta.url), 'utf8'));
const field = (loc, k) => { const v = L[loc][k]; return typeof v === 'string' && v.startsWith('@') ? L[v.slice(1)][k] : v; };

const infoLocs = (await asc('GET', `/v1/appInfos/${APP_INFO}/appInfoLocalizations?limit=50`)).json.data;
const verLocs = (await asc('GET', `/v1/appStoreVersions/${VERSION}/appStoreVersionLocalizations?limit=50`)).json.data;
const enGbDesc = verLocs.find((l) => l.attributes.locale === 'en-GB').attributes.description;

for (const loc of Object.keys(L)) {
  const info = { name: field(loc, 'name'), subtitle: field(loc, 'subtitle') };
  const hadInfo = infoLocs.find((l) => l.attributes.locale === loc);
  const r1 = hadInfo
    ? await asc('PATCH', `/v1/appInfoLocalizations/${hadInfo.id}`, { data: { type: 'appInfoLocalizations', id: hadInfo.id, attributes: info } })
    : await asc('POST', '/v1/appInfoLocalizations', { data: { type: 'appInfoLocalizations', attributes: { locale: loc, ...info, privacyPolicyUrl: 'https://ringoesim.com/privacy' }, relationships: { appInfo: { data: { type: 'appInfos', id: APP_INFO } } } } });

  const ver = { keywords: field(loc, 'keywords'), promotionalText: field(loc, 'promotionalText'), whatsNew: field(loc, 'whatsNew') };
  let desc = field(loc, 'description');
  if (desc === undefined || L[loc].description === '@en-GB') desc = enGbDesc;
  const hadVer = verLocs.find((l) => l.attributes.locale === loc);
  // Adding an appInfo locale creates an empty version locale too, so new locales
  // land here: give them their description and URLs as well.
  if (hadVer && loc !== 'en-GB') Object.assign(ver, { description: desc, supportUrl: 'https://ringoesim.com/contact', marketingUrl: 'https://ringoesim.com' });
  const r2 = hadVer
    ? await asc('PATCH', `/v1/appStoreVersionLocalizations/${hadVer.id}`, { data: { type: 'appStoreVersionLocalizations', id: hadVer.id, attributes: ver } })
    : await asc('POST', '/v1/appStoreVersionLocalizations', { data: { type: 'appStoreVersionLocalizations', attributes: { locale: loc, ...ver, description: desc, supportUrl: 'https://ringoesim.com/contact', marketingUrl: 'https://ringoesim.com' }, relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: VERSION } } } } });

  const err = (r) => (r.status >= 300 ? ` ${r.status} ${JSON.stringify(r.json?.errors?.map((e) => e.detail) ?? r.text)}` : ' ok');
  console.log(loc.padEnd(8), 'info' + err(r1), '| version' + err(r2));
}
