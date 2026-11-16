import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/light', () => ({ SITE: 'https://ringoesim.com' }));

const ARM = 'ringo_ab_default_v1';
const INSTALL = 'ringo_install_id_v1';
let map: Map<string, string>;
let fetchMock: ReturnType<typeof vi.fn>;
/** Each test gets a fresh module: the arm and install id are kept in memory once drawn. */
async function load() {
  vi.resetModules();
  return import('./abtest');
}
const working = () => ({
  getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
  setItem: (k: string, v: string) => { map.set(k, v); },
  removeItem: (k: string) => { map.delete(k); },
});
const sent = () => fetchMock.mock.calls.map((c) => JSON.parse(String((c[1] as RequestInit).body)) as { arm: string; install: string; event: string });

beforeEach(() => {
  map = new Map();
  vi.stubGlobal('localStorage', working());
  fetchMock = vi.fn(async () => new Response('{}'));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('defaultArm', () => {
  it('draws each arm half of the time and keeps the draw on the phone', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.49);
    expect((await load()).defaultArm()).toBe('cheapest');
    expect(map.get(ARM)).toBe('cheapest');
    map.clear();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect((await load()).defaultArm()).toBe('recommended');
    expect(map.get(ARM)).toBe('recommended');
  });

  it('keeps the stored arm for good, whatever a new draw would say', async () => {
    map.set(ARM, 'recommended');
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    expect((await load()).defaultArm()).toBe('recommended');
    expect(random).not.toHaveBeenCalled();
  });

  it('draws again over a stored value that is not an arm', async () => {
    map.set(ARM, 'banana');
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    expect((await load()).defaultArm()).toBe('recommended');
    expect(map.get(ARM)).toBe('recommended');
  });

  // Regression: when the write did not land, every call drew again, so one
  // phone showed one arm and logged its view and its purchase under others.
  it('stays in one arm for the session when the phone cannot store it', async () => {
    vi.stubGlobal('localStorage', { ...working(), setItem: () => { throw new Error('QuotaExceededError'); } });
    const random = vi.spyOn(Math, 'random').mockReturnValueOnce(0.9).mockReturnValue(0.1);
    const { defaultArm } = await load();
    expect([defaultArm(), defaultArm(), defaultArm()]).toEqual(['recommended', 'recommended', 'recommended']);
    expect(random).toHaveBeenCalledTimes(1);
  });

  // Regression: a phone with no storage at all always fell in 'cheapest'.
  it('still draws both arms when storage cannot be read at all', async () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }, removeItem: () => {} });
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    expect((await load()).defaultArm()).toBe('recommended');
  });
});

describe('logAb', () => {
  it('sends the view and the purchase of one phone under one arm and one install id', async () => {
    vi.stubGlobal('localStorage', { ...working(), setItem: () => { throw new Error('QuotaExceededError'); } });
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.9).mockReturnValue(0.1);
    const { logAb, defaultArm } = await load();
    const shown = defaultArm();
    logAb('view', { destination: 'japan' });
    logAb('purchase', { destination: 'japan', plan: 'trip_7', product: 'com.ringo.trip.7' });
    const [view, purchase] = sent();
    expect(view).toMatchObject({ test: 'plan_default_v1', event: 'view', arm: shown, destination: 'japan' });
    expect(purchase).toMatchObject({ event: 'purchase', arm: shown, plan: 'trip_7', product: 'com.ringo.trip.7' });
    expect(purchase.install).toBe(view.install);
    expect(view.install).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('reuses the install id already on the phone', async () => {
    map.set(INSTALL, 'install-from-before');
    map.set(ARM, 'cheapest');
    const { logAb } = await load();
    logAb('view', { destination: 'japan' });
    expect(sent()[0]).toMatchObject({ install: 'install-from-before', arm: 'cheapest' });
    expect(fetchMock.mock.calls[0][0]).toBe('https://ringoesim.com/api/app-ab');
  });

  it('never throws or rejects when the event cannot be sent', async () => {
    fetchMock.mockRejectedValue(new TypeError('Load failed'));
    const { logAb } = await load();
    expect(() => logAb('view', { destination: 'japan' })).not.toThrow();
    fetchMock.mockImplementation(() => { throw new Error('fetch is not available'); });
    expect(() => logAb('view', { destination: 'japan' })).not.toThrow();
  });
});
