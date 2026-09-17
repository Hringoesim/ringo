// Upload a file as the version's App Review attachment: node asc-attach-video.mjs /path/to/recording.mp4
import { asc } from './asc.mjs';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';
const V = '41fd4b82-76ff-423b-a207-7ad0a0525eff';
const file = process.argv[2]; if (!file) { console.error('path?'); process.exit(1); }
const buf = readFileSync(file), size = statSync(file).size, md5 = createHash('md5').update(buf).digest('hex');
const rev = await asc('GET', `/v1/appStoreVersions/${V}/appStoreReviewDetail`); const rid = rev.json.data.id;
const existing = await asc('GET', `/v1/appStoreReviewDetails/${rid}/appStoreReviewAttachments`);
for (const a of existing.json?.data || []) console.log('existing attachment', a.attributes.fileName, a.attributes.assetDeliveryState?.state);
const res = await asc('POST', '/v1/appStoreReviewAttachments', { data: { type: 'appStoreReviewAttachments', attributes: { fileName: basename(file), fileSize: size }, relationships: { appStoreReviewDetail: { data: { type: 'appStoreReviewDetails', id: rid } } } } });
if (res.status !== 201) { console.log('reserve failed', res.status, JSON.stringify(res.json).slice(0, 400)); process.exit(1); }
const att = res.json.data;
for (const op of att.attributes.uploadOperations) {
  const up = await fetch(op.url, { method: op.method, headers: Object.fromEntries(op.requestHeaders.map(h => [h.name, h.value])), body: buf.subarray(op.offset, op.offset + op.length) });
  if (!up.ok) { console.log('chunk failed', up.status); process.exit(1); }
}
const done = await asc('PATCH', `/v1/appStoreReviewAttachments/${att.id}`, { data: { type: 'appStoreReviewAttachments', id: att.id, attributes: { uploaded: true, sourceFileChecksum: md5 } } });
console.log('attachment', done.status, done.json?.data?.attributes?.assetDeliveryState?.state, `${(size / 1e6).toFixed(1)} MB`);
