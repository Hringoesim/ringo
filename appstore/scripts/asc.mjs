// App Store Connect API helper for the Ringo app (ADMIN key 2VNC4UFQKK,
// .p8 in ~/Downloads, never in the repo). Usage: node asc.mjs GET /v1/apps/6787133742
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
const KEY_ID = '2VNC4UFQKK';
const ISSUER = 'cc230a7d-1e6b-4054-9cba-05f326deb02e';
const P8 = readFileSync(`${process.env.HOME}/Downloads/AuthKey_2VNC4UFQKK.p8`, 'utf8');
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
export function jwt() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' });
  const body = b64({ iss: ISSUER, iat: now, exp: now + 1100, aud: 'appstoreconnect-v1' });
  const sig = createSign('SHA256').update(`${head}.${body}`).sign({ key: P8, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${head}.${body}.${sig}`;
}
export async function asc(method, path, body, extra = {}) {
  const url = path.startsWith('http') ? path : `https://api.appstoreconnect.apple.com${path}`;
  // Apple's API answers with intermittent 500s and dropped connections under
  // a burst of writes; retry those (and only those) with a pause.
  let last = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json', ...extra }, body: body ? JSON.stringify(body) : undefined });
      const text = await res.text();
      let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
      last = { status: res.status, json, text };
      if (res.status < 500 && res.status !== 429) return last;
    } catch (err) {
      last = { status: 0, json: null, text: String(err?.message || err) };
    }
    await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
  }
  return last;
}
if (process.argv[1] && process.argv[1].endsWith('asc.mjs') && process.argv[2]) {
  const [, , method, path, bodyStr] = process.argv;
  const r = await asc(method, path, bodyStr ? JSON.parse(bodyStr) : undefined);
  console.log(r.status); console.log(JSON.stringify(r.json ?? r.text, null, 2));
}
