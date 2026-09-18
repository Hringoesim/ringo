// Replace the six App Store screenshots (6.9" iPhone set) with shots/*.png.
import { asc } from './asc.mjs';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
const SET = 'dcc08bad-9df1-452d-a6d4-05e55211b9ba';
const SP = new URL('.', import.meta.url).pathname;
const existing = await asc('GET', `/v1/appScreenshotSets/${SET}/appScreenshots`);
for (const s of existing.json.data) { const d = await asc('DELETE', `/v1/appScreenshots/${s.id}`); console.log('deleted', s.attributes.fileName, d.status); }
for (const f of ['1-landing.png', '2-store.png', '3-destination.png', '4-destination.png', '5-install.png', '6-help.png']) {
  const path = `${SP}/shots/${f}`, buf = readFileSync(path), size = statSync(path).size;
  const res = await asc('POST', '/v1/appScreenshots', { data: { type: 'appScreenshots', attributes: { fileName: f, fileSize: size }, relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: SET } } } } });
  if (res.status !== 201) { console.log('reserve failed', f, res.status, JSON.stringify(res.json).slice(0, 300)); continue; }
  const shot = res.json.data;
  for (const op of shot.attributes.uploadOperations) {
    const up = await fetch(op.url, { method: op.method, headers: Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value])), body: buf.subarray(op.offset, op.offset + op.length) });
    if (!up.ok) console.log('chunk failed', f, up.status);
  }
  const done = await asc('PATCH', `/v1/appScreenshots/${shot.id}`, { data: { type: 'appScreenshots', id: shot.id, attributes: { uploaded: true, sourceFileChecksum: createHash('md5').update(buf).digest('hex') } } });
  console.log('uploaded', f, done.status, done.json?.data?.attributes?.assetDeliveryState?.state);
}
