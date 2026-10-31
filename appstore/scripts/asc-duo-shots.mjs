// Replace the iPhone Duo screenshot set (APP_IPHONE_DUO, 2007x2853) of one
// App Store version's en-GB localization with ../screenshots-1.03-duo/*.png,
// in file name order. Dry by default: it lists what it would delete and
// upload. Pass --go to write. Refuses when the version is not editable
// (anything but PREPARE_FOR_SUBMISSION, DEVELOPER_REJECTED, REJECTED,
// METADATA_REJECTED), because Apple locks assets while a version is in review
// and nothing may be submitted from here.
//   node asc-duo-shots.mjs <appStoreVersionId> [--go]
import { asc } from './asc.mjs';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
const [, , VERSION, flag] = process.argv;
if (!VERSION) { console.error('usage: node asc-duo-shots.mjs <appStoreVersionId> [--go]'); process.exit(2); }
const GO = flag === '--go';
const DIR = new URL('../screenshots-1.03-duo/', import.meta.url).pathname;
const EDITABLE = ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED'];
const v = await asc('GET', `/v1/appStoreVersions/${VERSION}`);
const state = v.json?.data?.attributes?.appVersionState ?? v.json?.data?.attributes?.appStoreState;
console.log('version', v.json?.data?.attributes?.versionString, state);
if (!EDITABLE.includes(state)) { console.error(`refusing: ${state} is not editable`); process.exit(1); }
const locs = await asc('GET', `/v1/appStoreVersions/${VERSION}/appStoreVersionLocalizations?limit=50`);
const en = locs.json.data.find((l) => l.attributes.locale === 'en-GB');
const sets = await asc('GET', `/v1/appStoreVersionLocalizations/${en.id}/appScreenshotSets?limit=50`);
const set = sets.json.data.find((s) => s.attributes.screenshotDisplayType === 'APP_IPHONE_DUO');
if (!set) { console.error('no APP_IPHONE_DUO set on en-GB'); process.exit(1); }
console.log('duo set', set.id);
const files = readdirSync(DIR).filter((f) => /^\d\d-.*\.png$/.test(f)).sort();
const existing = await asc('GET', `/v1/appScreenshotSets/${set.id}/appScreenshots?limit=50`);
for (const s of existing.json.data) console.log(GO ? 'delete' : 'would delete', s.attributes.fileName, s.id);
for (const f of files) console.log(GO ? 'upload' : 'would upload', f);
if (!GO) process.exit(0);
for (const s of existing.json.data) { const d = await asc('DELETE', `/v1/appScreenshots/${s.id}`); console.log('deleted', s.attributes.fileName, d.status); }
const ids = [];
for (const f of files) {
  const path = `${DIR}${f}`, buf = readFileSync(path), size = statSync(path).size;
  const res = await asc('POST', '/v1/appScreenshots', { data: { type: 'appScreenshots', attributes: { fileName: f, fileSize: size }, relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: set.id } } } } });
  if (res.status !== 201) { console.log('reserve failed', f, res.status, JSON.stringify(res.json).slice(0, 300)); process.exit(1); }
  const shot = res.json.data; ids.push(shot.id);
  for (const op of shot.attributes.uploadOperations) {
    const up = await fetch(op.url, { method: op.method, headers: Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value])), body: buf.subarray(op.offset, op.offset + op.length) });
    if (!up.ok) { console.log('chunk failed', f, up.status); process.exit(1); }
  }
  const done = await asc('PATCH', `/v1/appScreenshots/${shot.id}`, { data: { type: 'appScreenshots', id: shot.id, attributes: { uploaded: true, sourceFileChecksum: createHash('md5').update(buf).digest('hex') } } });
  console.log('uploaded', f, done.status, done.json?.data?.attributes?.assetDeliveryState?.state);
}
// Pin the order and wait for every asset to finish processing.
await asc('PATCH', `/v1/appScreenshotSets/${set.id}/relationships/appScreenshots`, { data: ids.map((id) => ({ type: 'appScreenshots', id })) });
for (let i = 0; i < 20; i++) {
  const r = await asc('GET', `/v1/appScreenshotSets/${set.id}/appScreenshots?limit=50`);
  const states = r.json.data.map((s) => `${s.attributes.fileName} ${s.attributes.assetDeliveryState?.state}`);
  console.log(states.join(' | '));
  if (r.json.data.every((s) => ['COMPLETE', 'UPLOAD_COMPLETE'].includes(s.attributes.assetDeliveryState?.state))) break;
  await new Promise((res) => setTimeout(res, 5000));
}
