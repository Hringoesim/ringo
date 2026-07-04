// orchestrator — Ringo's vendor-agnostic Orchestration Layer (Workstream A).
// The app calls ONLY these Ringo endpoints; partner APIs live behind adapters.
// Provider is chosen by env ESIM_PROVIDER = mock | airalo (Transatel/1GLOBAL/
// Telna slot in the same way once their contracts + credentials land).
//
// Routes (Authorization: Bearer <user jwt>):
//   POST /orchestrator/esim/provision { planId }          → DATA-ONLY eSIM: order
//        + provider profile → returns { iccid, lpa, qrCodeUrl, installUrl, apn }
//   GET  /orchestrator/esim/usage?iccid=…                 → live data balance
//   POST /orchestrator/order         { planId, country }  → eSIM + number (full)
//   POST /orchestrator/esim/state    { profileId, state } → LPA state update
//   POST /orchestrator/consent       { kind, version, granted }
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ── Provider adapter seam ─────────────────────────────────────────────────────
interface EsimProfile {
  iccid: string;
  matchingId: string;
  smdp: string;
  lpa?: string;           // full "LPA:1$smdp$matchingId"
  qrCodeUrl?: string;     // hosted QR image
  installUrl?: string;    // iOS 17.4+ direct-install universal link
  apnType?: string;
  apnValue?: string;
  providerRef?: string;
}
interface EsimUsage {
  remaining: number | null;
  total: number | null;
  unit: string;
  status: string;         // NOT_ACTIVE | ACTIVE | FINISHED | EXPIRED | UNKNOWN
  expiresAt: string | null;
  unlimited: boolean;
}
interface EsimProvider {
  name: string;
  createProfile(userRef: string, planId: string): Promise<EsimProfile>;
  usage(iccid: string): Promise<EsimUsage>;
}
interface NumberProvider {
  name: string;
  reserve(country: string): Promise<{ msisdn: string; ref: string }>;
}

// ── Mock provider (default until a real one is configured) ────────────────────
const mockEsim: EsimProvider = {
  name: 'mock',
  async createProfile() {
    const rnd = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
    const iccid = '89440' + rnd(14);
    const matchingId = 'RINGO-' + crypto.randomUUID().slice(0, 8).toUpperCase();
    const smdp = 'rsp.ringoesim.com';
    return { iccid, matchingId, smdp, lpa: `LPA:1$${smdp}$${matchingId}` };
  },
  async usage() {
    return { remaining: 8_000, total: 10_000, unit: 'MB', status: 'ACTIVE', expiresAt: null, unlimited: false };
  },
};

// ── Airalo Partners adapter (real, data-only global eSIM) ─────────────────────
// Activates when ESIM_PROVIDER=airalo + AIRALO_CLIENT_ID/SECRET secrets are set.
const AIRALO_BASE = (Deno.env.get('AIRALO_SANDBOX') ?? 'true') === 'false'
  ? 'https://partners-api.airalo.com/v2'
  : 'https://sandbox-partners-api.airalo.com/v2';
let airaloToken: { value: string; exp: number } | null = null;
async function airaloAuth(): Promise<string> {
  const now = Date.now();
  if (airaloToken && airaloToken.exp > now) return airaloToken.value;
  const form = new FormData();
  form.set('client_id', Deno.env.get('AIRALO_CLIENT_ID') ?? '');
  form.set('client_secret', Deno.env.get('AIRALO_CLIENT_SECRET') ?? '');
  form.set('grant_type', 'client_credentials');
  const r = await fetch(`${AIRALO_BASE}/token`, { method: 'POST', headers: { Accept: 'application/json' }, body: form });
  const j = await r.json();
  if (!r.ok) throw new Error('airalo token: ' + (j?.message || r.status));
  airaloToken = { value: j.data.access_token, exp: now + 23 * 3600 * 1000 };
  return airaloToken.value;
}
const airaloEsim: EsimProvider = {
  name: 'airalo',
  async createProfile(userRef, planId) {
    const token = await airaloAuth();
    // Map our plan → an Airalo package slug (set AIRALO_PACKAGE_<PLANID>, else default global).
    const pkg = Deno.env.get('AIRALO_PACKAGE_' + planId.toUpperCase()) || Deno.env.get('AIRALO_PACKAGE_DEFAULT') || 'discover-global-1gb-7days';
    const form = new FormData();
    form.set('quantity', '1');
    form.set('package_id', pkg);
    form.set('type', 'sim');
    form.set('description', `Ringo ${userRef}`);
    const r = await fetch(`${AIRALO_BASE}/orders`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, body: form });
    const j = await r.json();
    if (!r.ok) throw new Error('airalo order: ' + (j?.message || JSON.stringify(j?.errors || r.status)));
    const sim = j.data?.sims?.[0] || {};
    const lpa = sim.qrcode || sim.lpa || '';
    return {
      iccid: sim.iccid, matchingId: sim.matching_id, smdp: (lpa.split('$')[1] || ''),
      lpa, qrCodeUrl: sim.qrcode_url, installUrl: sim.direct_apple_installation_url,
      apnType: sim.apn_type, apnValue: sim.apn_value, providerRef: String(j.data?.id || sim.iccid),
    };
  },
  async usage(iccid) {
    const token = await airaloAuth();
    const r = await fetch(`${AIRALO_BASE}/sims/${iccid}/usage`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    const j = await r.json();
    if (!r.ok) throw new Error('airalo usage: ' + (j?.message || r.status));
    const d = j.data || {};
    return { remaining: d.remaining ?? null, total: d.total ?? null, unit: 'MB', status: d.status || 'UNKNOWN', expiresAt: d.expired_at ?? null, unlimited: !!d.is_unlimited };
  },
};

const mockNumbers: NumberProvider = {
  name: 'mock',
  async reserve(country: string) {
    const rnd = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
    const dial: Record<string, string> = { BE: '+32 4', GB: '+44 7', IE: '+353 8', ES: '+34 6', DE: '+49 1', NL: '+31 6' };
    return { msisdn: (dial[country] || '+44 7') + rnd(8), ref: 'mock_' + crypto.randomUUID().slice(0, 8) };
  },
};

const PROVIDER = (Deno.env.get('ESIM_PROVIDER') || 'mock').toLowerCase();
const esimProvider: EsimProvider = PROVIDER === 'airalo' ? airaloEsim : mockEsim;
const numberProvider = mockNumbers;

Deno.serve(async (req) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  );
  const { data: u } = await supa.auth.getUser();
  if (!u?.user) return json({ error: 'unauthenticated' }, 401);
  const uid = u.user.id;

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/orchestrator/, '');
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

  // ── consent ────────────────────────────────────────────────────────────────
  if (path === '/consent') {
    const { kind, version, granted } = body;
    if (!kind || !version) return json({ error: 'kind and version required' }, 400);
    const { error } = await supa.from('consents').insert({ user_id: uid, kind, version, granted: !!granted });
    return error ? json({ error: error.message }, 500) : json({ ok: true });
  }

  // ── DATA-ONLY eSIM provisioning (the MVP path) ───────────────────────────────
  if (path === '/esim/provision') {
    const { planId, currency = 'EUR', amount = null } = body;
    if (!planId) return json({ error: 'planId required' }, 400);
    const { data: order, error: oErr } = await supa.from('orders')
      .insert({ user_id: uid, plan_id: planId, currency, amount, state: 'payment_authorized' }).select().single();
    if (oErr || !order) return json({ error: oErr?.message || 'order failed' }, 500);
    try {
      const prof = await esimProvider.createProfile(uid, planId);
      const lpa = prof.lpa || `LPA:1$${prof.smdp}$${prof.matchingId}`;
      await supa.from('esim_profiles').insert({
        user_id: uid, order_id: order.id, iccid: prof.iccid, matching_id: prof.matchingId,
        smdp_plus_address: prof.smdp, state: 'released', provider: esimProvider.name,
      });
      await supa.from('order_items').insert({
        order_id: order.id, service: 'esim', state: 'done', provider: esimProvider.name, provider_ref: prof.iccid,
        detail: { qrCodeUrl: prof.qrCodeUrl, installUrl: prof.installUrl, apnType: prof.apnType, apnValue: prof.apnValue },
      });
      await supa.from('orders').update({ state: 'active', updated_at: new Date().toISOString() }).eq('id', order.id);
      return json({ ok: true, orderId: order.id, provider: esimProvider.name, esim: { iccid: prof.iccid, lpa, qrCodeUrl: prof.qrCodeUrl, installUrl: prof.installUrl, apnType: prof.apnType, apnValue: prof.apnValue } });
    } catch (e) {
      await supa.from('orders').update({ state: 'rolled_back' }).eq('id', order.id);
      return json({ error: (e as Error).message, state: 'rolled_back' }, 500);
    }
  }

  // ── live data-usage for an owned eSIM ────────────────────────────────────────
  if (path === '/esim/usage') {
    const iccid = url.searchParams.get('iccid') || body.iccid;
    if (!iccid) return json({ error: 'iccid required' }, 400);
    const { data: prof } = await supa.from('esim_profiles').select('iccid').eq('user_id', uid).eq('iccid', iccid).maybeSingle();
    if (!prof) return json({ error: 'not found' }, 404);
    try {
      return json({ ok: true, iccid, usage: await esimProvider.usage(iccid) });
    } catch (e) {
      return json({ error: (e as Error).message }, 502);
    }
  }

  // ── dev/webhook-style eSIM state update ──────────────────────────────────────
  if (path === '/esim/state') {
    const { profileId, state } = body;
    const allowed = ['released', 'downloaded', 'installed', 'enabled', 'disabled', 'deleted'];
    if (!allowed.includes(state)) return json({ error: 'bad state' }, 400);
    const { error } = await supa.from('esim_profiles').update({ state, updated_at: new Date().toISOString() }).eq('id', profileId).eq('user_id', uid);
    return error ? json({ error: error.message }, 500) : json({ ok: true, state });
  }

  // ── full order: eSIM + number (kept for the number-inclusive flow) ───────────
  if (path === '/order') {
    const { planId, currency = 'EUR', amount = null, country = 'BE' } = body;
    if (!planId) return json({ error: 'planId required' }, 400);
    const { data: order, error: oErr } = await supa.from('orders')
      .insert({ user_id: uid, plan_id: planId, currency, amount, state: 'payment_authorized' }).select().single();
    if (oErr || !order) return json({ error: oErr?.message || 'order failed' }, 500);
    const items: Record<string, unknown>[] = [];
    try {
      const prof = await esimProvider.createProfile(uid, planId);
      await supa.from('esim_profiles').insert({ user_id: uid, order_id: order.id, iccid: prof.iccid, matching_id: prof.matchingId, smdp_plus_address: prof.smdp, state: 'released', provider: esimProvider.name });
      items.push({ order_id: order.id, service: 'esim', state: 'done', provider: esimProvider.name, provider_ref: prof.iccid });
      const res = await numberProvider.reserve(country);
      const now = new Date().toISOString();
      const { error: nErr } = await supa.from('numbers').insert({ user_id: uid, msisdn: res.msisdn, country, source: 'ringo', status: 'active', lifecycle: 'activated', reserved_at: now, activated_at: now });
      if (nErr) throw new Error('number: ' + nErr.message);
      items.push({ order_id: order.id, service: 'did', state: 'done', provider: numberProvider.name, provider_ref: res.ref });
      await supa.from('order_items').insert(items);
      await supa.from('orders').update({ state: 'active', updated_at: now }).eq('id', order.id);
      const lpa = prof.lpa || `LPA:1$${prof.smdp}$${prof.matchingId}`;
      return json({ ok: true, orderId: order.id, esim: { ...prof, lpa }, msisdn: res.msisdn });
    } catch (e) {
      await supa.from('orders').update({ state: 'rolled_back' }).eq('id', order.id);
      if (items.length) await supa.from('order_items').insert(items.map((i) => ({ ...i, state: 'rolled_back' })));
      return json({ error: (e as Error).message, orderId: order.id, state: 'rolled_back' }, 500);
    }
  }

  return json({ error: 'not found' }, 404);
});
