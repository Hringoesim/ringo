// iPhone Duo inner display: 669 x 951 pt at 3x = 2007 x 2853 px (App Store APP_IPHONE_DUO).
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [,, port, outDir, only] = process.argv;
const plan = JSON.parse(readFileSync(new URL('./plan.json', import.meta.url))).filter((p) => !only || p.name === only);
const PROFILE = mkdtempSync(join(tmpdir(), 'ringo-duo-'));
const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=9334', `--user-data-dir=${PROFILE}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0; const pending = new Map();
for (let i = 0; i < 40; i++) { try { const v = await (await fetch('http://127.0.0.1:9334/json/version')).json(); ws = new WebSocket(v.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }); break; } catch { await sleep(300); } }
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}, sessionId) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const url = `http://localhost:${port}/?shot=1`;
try {
  for (const p of plan) {
    const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
    const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Emulation.setDeviceMetricsOverride', { width: 669, height: 951, deviceScaleFactor: 3, mobile: true }, sessionId);
    await send('Emulation.setTouchEmulationEnabled', { enabled: true }, sessionId);
    await send('Page.enable', {}, sessionId);
    await send('Page.navigate', { url }, sessionId);
    await sleep(2500);
    await send('Runtime.evaluate', { expression: `localStorage.clear(); ${p.setup || 'true'}` }, sessionId);
    await send('Page.reload', {}, sessionId);
    await sleep(3000);
    const r = await send('Runtime.evaluate', { expression: `(async()=>{${p.steps}})()`, awaitPromise: true }, sessionId);
    if (r.result?.exceptionDetails) console.log(p.name, 'step error', JSON.stringify(r.result.exceptionDetails).slice(0, 300));
    for (let i = 0; i < 40; i++) { const q = await send('Runtime.evaluate', { expression: '[...document.images].every((im) => im.complete)', returnByValue: true }, sessionId); if (q.result?.result?.value) break; await sleep(250); }
    await sleep(1500);
    const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
    writeFileSync(join(outDir, p.name), Buffer.from(shot.result.data, 'base64'));
    console.log('wrote', p.name);
    await send('Target.closeTarget', { targetId });
  }
} finally { try { ws.close(); } catch {} chrome.kill('SIGKILL'); }
