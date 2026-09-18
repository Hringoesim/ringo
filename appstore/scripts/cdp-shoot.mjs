// Drive one headless Chrome over CDP: 430x932 @3x, wait for the live prices, capture.
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SP = new URL('.', import.meta.url).pathname;
const [,, port, out, readyProbe] = process.argv;
const url = `http://localhost:${port}/?shot=1`;
const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=9333`, `--user-data-dir=${SP}/chrome-cdp-profile`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0; const pending = new Map();
async function connect() {
  for (let i = 0; i < 40; i++) {
    try {
      const v = await (await fetch('http://127.0.0.1:9333/json/version')).json();
      ws = new WebSocket(v.webSocketDebuggerUrl);
      await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
      ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
      return;
    } catch { await sleep(300); }
  }
  throw new Error('chrome did not come up');
}
const send = (method, params = {}, sessionId) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
try {
  await connect();
  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 3, mobile: true }, sessionId);
  await send('Emulation.setTouchEmulationEnabled', { enabled: true }, sessionId);
  await send('Page.enable', {}, sessionId);
  await send('Page.navigate', { url }, sessionId);
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    const r = await send('Runtime.evaluate', { expression: `document.body.innerText.includes(${JSON.stringify(readyProbe || '')})`, returnByValue: true }, sessionId);
    if (r.result?.result?.value) break;
  }
  // The store's photographs come from ringoesim.com: wait until every picture on screen has loaded.
  for (let i = 0; i < 40; i++) {
    const r = await send('Runtime.evaluate', { expression: `[...document.images].every((im) => im.complete)`, returnByValue: true }, sessionId);
    if (r.result?.result?.value) break;
    await sleep(250);
  }
  await sleep(1500);
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
  writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  console.log('wrote', out);
} finally {
  try { ws?.close(); } catch {}
  chrome.kill('SIGKILL');
}
