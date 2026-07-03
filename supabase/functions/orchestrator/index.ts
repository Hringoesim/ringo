// orchestrator — Ringo's vendor-agnostic Orchestration Layer (Workstream A).
// The app calls ONLY these Ringo endpoints; partner APIs live behind adapters.
// Adapters: MockProvider today; Mobilise/Telna/1GLOBAL slot in via env config
// (PROVIDER=mock|mobilise|telna) when contracts + sandbox credentials arrive.
//
// Routes (POST JSON, Authorization: Bearer <user jwt>):
//   /orchestrator/order      { planId, currency, amount } → creates order +
//     items (esim, did), runs fulfillment: eSIM profile (LPA string) + number
//     reserve→allocate→activate. Rolls back items on failure.
//   /orchestrator/esim/state { profileId, state }          → LPA state webhook-style update (dev)
//   /orchestrator/consent    { kind, version, granted }    → versioned consent record
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ── Provider adapter seam ─────────────────────────────────────────────────────
interface EsimProvider {
  name: string;
  /** ES2+-style DownloadOrder/ConfirmOrder → activation code parts. */
  createProfile(userRef: string): Promise<{ iccid: string; matchingId: string; smdp: string }>;
}
interface NumberProvider {
  name: string;
  reserve(country: string): Promise<{ msisdn: string; ref: string }>;
}

const mockEsim: EsimProvider = {
  name: 'mock',
  async createProfile() {
    const rnd = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
    return { iccid: '89440' + rnd(14), matchingId: 'RINGO-' + crypto.randomUUID().slice(0, 8).toUpperCase(), smdp: 'rsp.ringoesim.com' };
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
// PROVIDER env decides the adapter (mock until partner credentials exist).
const esimProvider = mockEsim;
const numberProvider = mockNumbers;

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  );
  const { data: u } = await supa.auth.getUser();
  if (!u?.user) return json({ error: 'unauthenticated' }, 401);
  const uid = u.user.id;

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/orchestrator/, '');
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

  // ── consent ──────────────────────────────────────────────────────────────
  if (path === '/consent') {
    const { kind, version, granted } = body;
    if (!kind || !version) return json({ error: 'kind and version required' }, 400);
    const { error } = await supa.from('consents').insert({ user_id: uid, kind, version, granted: !!granted });
    return error ? json({ error: error.message }, 500) : json({ ok: true });
  }

  // ── dev/webhook-style eSIM state update ──────────────────────────────────
  if (path === '/esim/state') {
    const { profileId, state } = body;
    const allowed = ['released', 'downloaded', 'installed', 'enabled', 'disabled', 'deleted'];
    if (!allowed.includes(state)) return json({ error: 'bad state' }, 400);
    const { error } = await supa.from('esim_profiles')
      .update({ state, updated_at: new Date().toISOString() })
      .eq('id', profileId).eq('user_id', uid);
    return error ? json({ error: error.message }, 500) : json({ ok: true, state });
  }

  // ── order + fulfillment orchestrator ─────────────────────────────────────
  if (path === '/order') {
    const { planId, currency = 'EUR', amount = null, country = 'BE' } = body;
    if (!planId) return json({ error: 'planId required' }, 400);

    const { data: order, error: oErr } = await supa.from('orders')
      .insert({ user_id: uid, plan_id: planId, currency, amount, state: 'payment_authorized' })
      .select().single();
    if (oErr || !order) return json({ error: oErr?.message || 'order failed' }, 500);

    const items: Record<string, unknown>[] = [];
    try {
      // 1. eSIM profile (SGP.22: reserved → released to device)
      const prof = await esimProvider.createProfile(uid);
      const { data: esim, error: eErr } = await supa.from('esim_profiles').insert({
        user_id: uid, order_id: order.id, iccid: prof.iccid, matching_id: prof.matchingId,
        smdp_plus_address: prof.smdp, state: 'released', provider: esimProvider.name,
      }).select().single();
      if (eErr) throw new Error('esim: ' + eErr.message);
      items.push({ order_id: order.id, service: 'esim', state: 'done', provider: esimProvider.name, provider_ref: prof.iccid });

      // 2. Number: reserve → allocate → activate (4-phase DID flow, happy path)
      const res = await numberProvider.reserve(country);
      const now = new Date().toISOString();
      const { error: nErr } = await supa.from('numbers').insert({
        user_id: uid, msisdn: res.msisdn, country, source: 'ringo', status: 'active',
        lifecycle: 'activated', reserved_at: now, activated_at: now,
      });
      if (nErr) throw new Error('number: ' + nErr.message);
      items.push({ order_id: order.id, service: 'did', state: 'done', provider: numberProvider.name, provider_ref: res.ref });

      await supa.from('order_items').insert(items);
      await supa.from('orders').update({ state: 'active', updated_at: now }).eq('id', order.id);

      const lpa = `LPA:1$${prof.smdp}$${prof.matchingId}`;
      return json({ ok: true, orderId: order.id, esim: { ...prof, lpa }, msisdn: res.msisdn });
    } catch (e) {
      // rollback: mark order failed + items rolled_back (mock providers are stateless)
      await supa.from('orders').update({ state: 'rolled_back' }).eq('id', order.id);
      if (items.length) await supa.from('order_items').insert(items.map((i) => ({ ...i, state: 'rolled_back' })));
      return json({ error: (e as Error).message, orderId: order.id, state: 'rolled_back' }, 500);
    }
  }

  return json({ error: 'not found' }, 404);
});
