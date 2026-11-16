import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ plugins: {} as Record<string, Record<string, any>>, account: null as { userId: string; t: string } | null }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' },
  registerPlugin: (name: string) => (h.plugins[name] ??= {}),
}));
vi.mock('./log', () => ({ log: { warn: vi.fn(), error: vi.fn() } }));
vi.mock('./location', () => ({ lastCountry: () => 'JP', readCountry: vi.fn(async () => 'JP') }));
vi.mock('../store/account', () => ({ account: { get: () => h.account, subscribe: () => () => {} } }));
vi.mock('../api/light', () => ({ light: { pushRegister: vi.fn() } }));

import { light } from '../api/light';

const pushRegister = vi.mocked(light.pushRegister);
type Body = Parameters<typeof light.pushRegister>[2];
type Answer = Awaited<ReturnType<typeof light.pushRegister>>;
const PREFS = 'ringo_push_prefs_v1';
const SENT = 'ringo_push_sent_v1';
let map: Map<string, string>;
let listeners: Record<string, (e: any) => void>;

/** A request the test answers when it chooses. */
function held() {
  let answer!: (v: Answer) => void;
  const promise = new Promise<Answer>((r) => { answer = r; });
  return { promise, answer };
}
const tick = async (n = 6) => { for (let i = 0; i < n; i++) await Promise.resolve(); };
const bodies = () => pushRegister.mock.calls.map((c) => c[2] as Body);

/** A signed-in phone with notifications allowed and its token already registered with the site. */
async function started(prefs = { service: true, offers: false }) {
  map.set(PREFS, JSON.stringify(prefs));
  vi.resetModules();
  const push = await import('./push');
  pushRegister.mockImplementation(async (_u, _t, b) => ({ ok: true, service_ok: b.service_ok, offers_ok: b.offers_ok }));
  push.startPush(() => {});
  await tick(12);
  expect(pushRegister).toHaveBeenCalledTimes(1);
  pushRegister.mockClear();
  return push;
}

beforeEach(() => {
  map = new Map();
  listeners = {};
  h.account = { userId: 'user-1', t: 'tok-1' };
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
  });
  vi.stubGlobal('document', { visibilityState: 'visible', addEventListener: () => {}, removeEventListener: () => {} });
  Object.assign((h.plugins.Notify ??= {}), {
    status: vi.fn(async () => ({ permission: 'granted', environment: 'production', token: 'apns-token-1' })),
    addListener: vi.fn(async (event: string, fn: (e: any) => void) => { listeners[event] = fn; return { remove: async () => {} }; }),
    requestPermission: vi.fn(async () => ({ granted: true })),
    openSettings: vi.fn(async () => {}),
  });
  pushRegister.mockReset();
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('syncPush: what the site is told', () => {
  it("registers this phone's token with the member's switches, the country and the account", async () => {
    map.set(PREFS, JSON.stringify({ service: true, offers: true }));
    vi.resetModules();
    const push = await import('./push');
    pushRegister.mockResolvedValue({ ok: true, service_ok: true, offers_ok: true });
    push.startPush(() => {});
    await tick(12);
    expect(pushRegister).toHaveBeenCalledTimes(1);
    expect(pushRegister).toHaveBeenCalledWith('user-1', 'tok-1', expect.objectContaining({ token: 'apns-token-1', environment: 'production', service_ok: true, offers_ok: true, country: 'JP' }));
  });

  it('tells the site once per change: the same token and switches are not sent twice', async () => {
    const push = await started();
    await push.syncPush();
    await push.syncPush();
    expect(pushRegister).not.toHaveBeenCalled();
  });

  it('sends nothing while signed out, and registers at the next sync once signed in', async () => {
    h.account = null;
    map.set(PREFS, JSON.stringify({ service: true, offers: false }));
    vi.resetModules();
    const push = await import('./push');
    pushRegister.mockResolvedValue({ ok: true, service_ok: true, offers_ok: false });
    push.startPush(() => {});
    await tick(12);
    expect(pushRegister).not.toHaveBeenCalled();
    h.account = { userId: 'user-2', t: 'tok-2' };
    await push.syncPush();
    expect(pushRegister).toHaveBeenCalledWith('user-2', 'tok-2', expect.objectContaining({ token: 'apns-token-1' }));
  });

  it('with notifications refused in iOS, registers the token with both switches off and no country', async () => {
    h.plugins.Notify.status = vi.fn(async () => ({ permission: 'denied', environment: 'production', token: 'apns-token-1' }));
    map.set(PREFS, JSON.stringify({ service: true, offers: true }));
    vi.resetModules();
    const push = await import('./push');
    pushRegister.mockResolvedValue({ ok: true, service_ok: false, offers_ok: false });
    push.startPush(() => {});
    await tick(12);
    expect(bodies()[0]).toMatchObject({ service_ok: false, offers_ok: false });
    expect(bodies()[0]).not.toHaveProperty('country');
    // What the member chose stays on the phone for when iOS is allowed again.
    expect(JSON.parse(map.get(PREFS)!)).toEqual({ service: true, offers: true });
  });

  it('follows the site when it answers with other switches than were sent', async () => {
    const push = await started({ service: true, offers: true });
    pushRegister.mockResolvedValue({ ok: true, service_ok: true, offers_ok: false });
    listeners.token({ token: 'apns-token-2', environment: 'production' });
    await tick(12);
    expect(JSON.parse(map.get(PREFS)!)).toEqual({ service: true, offers: false });
    void push;
  });

  it('a failed registration is not remembered as sent: the next sync tries again', async () => {
    const push = await started();
    pushRegister.mockRejectedValueOnce(new Error('No connection'));
    await push.setPushPref('offers', true);
    await push.syncPush();
    expect(pushRegister).toHaveBeenCalledTimes(2);
    expect(bodies()[1]).toMatchObject({ offers_ok: true });
  });
});

describe('syncPush: one registration at a time', () => {
  // Regression: a switch flipped on then off sent two requests at once.
  // Whichever the site handled last won, so it could keep "offers on" under
  // a switch that showed off, and the phone believed it had already told it.
  it('holds the second change until the site has answered the first, and ends on the last choice', async () => {
    const push = await started();
    const first = held();
    const second = held();
    pushRegister.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    await push.setPushPref('offers', true);
    await push.setPushPref('offers', false);
    await tick();
    expect(pushRegister).toHaveBeenCalledTimes(1);
    expect(bodies()[0]).toMatchObject({ offers_ok: true });

    first.answer({ ok: true, service_ok: true, offers_ok: true });
    await tick();
    expect(pushRegister).toHaveBeenCalledTimes(2);
    expect(bodies()[1]).toMatchObject({ offers_ok: false });

    second.answer({ ok: true, service_ok: true, offers_ok: false });
    await push.syncPush();
    expect(pushRegister).toHaveBeenCalledTimes(2);
    expect(JSON.parse(map.get(PREFS)!)).toEqual({ service: true, offers: false });
    expect(JSON.parse(map.get(SENT)!)).toMatchObject({ offers_ok: false });
  });

  // Regression: a request that fails on the phone may still have reached the
  // site. The change back used to match the note of what was sent before and
  // was never sent, leaving the site on the lost request's switches.
  it('a registration that fails does not block the ones after it, and the change back is still sent', async () => {
    const push = await started();
    pushRegister.mockRejectedValueOnce(new Error('timed out')).mockResolvedValueOnce({ ok: true, service_ok: true, offers_ok: false });
    await push.setPushPref('offers', true);
    await push.setPushPref('offers', false);
    await push.syncPush();
    expect(bodies().map((b) => b.offers_ok)).toEqual([true, false]);
  });
});

describe('unregisterPush', () => {
  it('turns both switches off for this token on the site, and forgets what was sent', async () => {
    const push = await started({ service: true, offers: true });
    pushRegister.mockResolvedValue({ ok: true, service_ok: false, offers_ok: false });
    await push.unregisterPush();
    expect(pushRegister).toHaveBeenCalledWith('user-1', 'tok-1', expect.objectContaining({ token: 'apns-token-1', service_ok: false, offers_ok: false }));
    expect(map.has(SENT)).toBe(false);
  });

  it('never throws when the site cannot be reached', async () => {
    const push = await started();
    pushRegister.mockRejectedValue(new Error('No connection'));
    await expect(push.unregisterPush()).resolves.toBeUndefined();
  });
});
