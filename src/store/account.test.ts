import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// account.ts caches what it read, so each test loads a fresh copy over a
// localStorage it has prepared.
const KEY = 'ringo_account_v1';
const PENDING = 'ringo_pending_purchases_v1';
let map: Map<string, string>;

async function load() {
  vi.resetModules();
  return import('./account');
}

beforeEach(() => {
  map = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, String(v)); },
    removeItem: (k: string) => { map.delete(k); },
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('account: what is read from the phone', () => {
  it('reads back a stored account as it was written', async () => {
    map.set(KEY, JSON.stringify({ userId: 'user-1', t: 'tok-1', email: 'a@example.com', purchaseRef: 'apple:1' }));
    const { account } = await load();
    expect(account.get()).toEqual({ userId: 'user-1', t: 'tok-1', email: 'a@example.com', purchaseRef: 'apple:1' });
  });

  it.each([
    ['nothing stored', null],
    ['text that is not JSON', '{oops'],
    ['a string', '"user-1"'],
    ['a list', '[]'],
    ['no token', JSON.stringify({ userId: 'user-1' })],
    ['an id that is not text', JSON.stringify({ userId: 7, t: 'tok-1' })],
    ['an empty id', JSON.stringify({ userId: '', t: 'tok-1' })],
    ['an empty token', JSON.stringify({ userId: 'user-1', t: '' })],
  ])('is signed out with %s', async (_name, raw) => {
    if (raw != null) map.set(KEY, raw);
    const { account } = await load();
    expect(account.get()).toBeNull();
  });

  // Regression: only the id and token were checked, so a damaged email came
  // back as-is and cardPay's `acct.email.toLowerCase()` threw at checkout.
  it('drops an email or purchase reference that is not text, keeping the account', async () => {
    map.set(KEY, JSON.stringify({ userId: 'user-1', t: 'tok-1', email: { a: 1 }, purchaseRef: 42 }));
    const { account } = await load();
    expect(account.get()).toEqual({ userId: 'user-1', t: 'tok-1', email: null, purchaseRef: null });
  });

  it('works in memory when storage throws', async () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }, removeItem: () => { throw new Error('denied'); } });
    const { account } = await load();
    expect(account.get()).toBeNull();
    account.set({ userId: 'user-1', t: 'tok-1', email: 'a@example.com' });
    expect(account.get()).toMatchObject({ userId: 'user-1', email: 'a@example.com' });
    expect(() => account.forget()).not.toThrow();
    expect(account.get()).toBeNull();
  });
});

describe('account.set', () => {
  it('stores the owner under the same key and format, and tells subscribers', async () => {
    const { account } = await load();
    const seen = vi.fn();
    account.subscribe(seen);
    account.set({ userId: 'user-1', t: 'tok-1', email: 'a@example.com', purchaseRef: 'apple:1' });
    expect(JSON.parse(map.get(KEY)!)).toEqual({ userId: 'user-1', t: 'tok-1', email: 'a@example.com', purchaseRef: 'apple:1' });
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("keeps the same account's email and purchase when a fresh token arrives without them", async () => {
    const { account } = await load();
    account.set({ userId: 'user-1', t: 'tok-1', email: 'a@example.com', purchaseRef: 'apple:1' });
    expect(account.set({ userId: 'user-1', t: 'tok-2', email: null, purchaseRef: null })).toEqual({ userId: 'user-1', t: 'tok-2', email: 'a@example.com', purchaseRef: 'apple:1' });
  });

  // Regression: the email fell back to whoever was signed in before, so a
  // purchase restored into another account carried the previous person's email.
  it("never hands one account's email or purchase to another", async () => {
    const { account } = await load();
    account.set({ userId: 'user-1', t: 'tok-1', email: 'first@example.com', purchaseRef: 'apple:1' });
    expect(account.set({ userId: 'user-2', t: 'tok-2', email: null, purchaseRef: null })).toEqual({ userId: 'user-2', t: 'tok-2', email: null, purchaseRef: null });
    expect(account.set({ userId: 'user-3', t: 'tok-3' })).toEqual({ userId: 'user-3', t: 'tok-3', email: null, purchaseRef: null });
  });

  it('forget signs out, removes the last checkout email and leaves purchases in flight', async () => {
    map.set('ringo_last_email', 'a@example.com');
    map.set(PENDING, JSON.stringify({ 'com.ringo.trip.7': [{ plan: 'trip_7', destination: 'japan', data_gb: null, email: 'a@example.com', startedAt: 5 }] }));
    const { account } = await load();
    account.set({ userId: 'user-1', t: 'tok-1' });
    account.forget();
    expect(account.get()).toBeNull();
    expect(map.has(KEY)).toBe(false);
    expect(map.has('ringo_last_email')).toBe(false);
    expect(map.has(PENDING)).toBe(true);
  });
});

describe('pendingPurchase: what a paid purchase in flight was for', () => {
  const ctx = (destination: string) => ({ plan: 'trip_7', destination, data_gb: null, email: 'a@example.com' });

  it('hands a redelivered transaction the oldest context, and clears exactly the one named', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const { pendingPurchase } = await load();
    const spain = pendingPurchase.set('p1', ctx('spain'));
    const france = pendingPurchase.set('p1', ctx('france'));
    expect(france.startedAt).toBeGreaterThan(spain.startedAt!);
    expect(pendingPurchase.get('p1')?.destination).toBe('spain');
    expect(pendingPurchase.get('p1', 1)?.destination).toBe('france');
    pendingPurchase.clear('p1', france.startedAt);
    expect(pendingPurchase.get('p1')?.destination).toBe('spain');
    pendingPurchase.clear('p1');
    expect(pendingPurchase.get('p1')).toBeNull();
    expect(JSON.parse(map.get(PENDING)!)).toEqual({});
  });

  it('reads the single context an older build stored, and ignores anything that is not one', async () => {
    map.set(PENDING, JSON.stringify({ old: { plan: 'trip_7', destination: 'japan', data_gb: 5, email: 'a@example.com' }, junk: 'x', half: [{ plan: 'p' }, null] }));
    const { pendingPurchase } = await load();
    expect(pendingPurchase.get('old')).toEqual({ plan: 'trip_7', destination: 'japan', data_gb: 5, email: 'a@example.com', startedAt: 0 });
    expect(pendingPurchase.get('junk')).toBeNull();
    expect(pendingPurchase.get('half')).toBeNull();
  });

  it('is empty, never a throw, when the stored value is garbage', async () => {
    map.set(PENDING, '{nope');
    const { pendingPurchase } = await load();
    expect(pendingPurchase.get('p1')).toBeNull();
    expect(() => pendingPurchase.clear('p1')).not.toThrow();
  });
});
