import { beforeEach, describe, expect, it, vi } from 'vitest';

// The native side is faked at the Capacitor boundary: registerPlugin hands
// back one plain object per plugin name, which each test fills with spies.
const h = vi.hoisted(() => ({ native: true, platform: 'ios', plugins: {} as Record<string, Record<string, any>> }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => h.native, getPlatform: () => h.platform },
  registerPlugin: (name: string) => (h.plugins[name] ??= {}),
}));
vi.mock('./log', () => ({ log: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { log } from './log';
import { finish, iapAvailable, loadProducts, manageSubscriptions, onTransaction, purchase, restoreTransactions, unfinished, type IapProduct, type IapTransaction } from './iap';

const product = (id: string): IapProduct => ({ id, displayName: id, description: '', displayPrice: '€9,99', price: 9.99, currency: 'EUR', type: 'consumable' });
const tx = (id: string): IapTransaction => ({ productId: 'com.ringo.trip', transactionId: id, originalTransactionId: id, jws: `jws-${id}`, purchaseDate: 1 });

let store: Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  h.native = true;
  h.platform = 'ios';
  store = {
    getProducts: vi.fn(async () => ({ products: [] })),
    purchase: vi.fn(async () => ({ state: 'cancelled' })),
    finish: vi.fn(async () => ({ finished: true })),
    unfinished: vi.fn(async () => ({ transactions: [] })),
    restore: vi.fn(async () => ({ transactions: [] })),
    manageSubscriptions: vi.fn(async () => ({ shown: true })),
    addListener: vi.fn(),
  };
  // Same object the module captured at import; only its methods are replaced.
  Object.assign((h.plugins.StoreKit ??= {}), store);
  vi.mocked(log.warn).mockClear();
});

describe('iapAvailable', () => {
  it('is true only in the native iOS app', () => {
    expect(iapAvailable()).toBe(true);
    h.platform = 'android';
    expect(iapAvailable()).toBe(false);
    h.platform = 'ios';
    h.native = false;
    expect(iapAvailable()).toBe(false);
  });
});

describe('purchase', () => {
  it('asks StoreKit for the product alone when there is no token or offer', async () => {
    await purchase('com.ringo.trip');
    expect(store.purchase).toHaveBeenCalledWith({ productId: 'com.ringo.trip' });
    await purchase('com.ringo.trip', undefined, null);
    expect(store.purchase).toHaveBeenLastCalledWith({ productId: 'com.ringo.trip' });
  });

  it('passes the account token and the signed offer through', async () => {
    const offer = { offerId: 'keep', keyId: 'K', nonce: 'n', timestamp: 1, signature: 's' };
    await purchase('com.ringo.sub.global', 'token-uuid', offer);
    expect(store.purchase).toHaveBeenCalledWith({ productId: 'com.ringo.sub.global', appAccountToken: 'token-uuid', offer });
  });

  it('returns the outcome as StoreKit gave it', async () => {
    store.purchase.mockResolvedValueOnce({ state: 'pending' });
    expect(await purchase('p')).toEqual({ state: 'pending' });
    store.purchase.mockResolvedValueOnce({ state: 'purchased', ...tx('100') });
    expect(await purchase('p')).toEqual({ state: 'purchased', ...tx('100') });
  });

  it('never finishes the transaction itself: a purchased outcome is left unfinished for the server to verify', async () => {
    store.purchase.mockResolvedValueOnce({ state: 'purchased', ...tx('100') });
    await purchase('com.ringo.trip');
    expect(store.finish).not.toHaveBeenCalled();
  });

  it('lets a StoreKit failure reach the caller', async () => {
    store.purchase.mockRejectedValueOnce(new Error('store down'));
    await expect(purchase('p')).rejects.toThrow('store down');
    expect(store.finish).not.toHaveBeenCalled();
  });
});

describe('finish', () => {
  it('finishes exactly the transaction it is given', async () => {
    await finish('100');
    expect(store.finish).toHaveBeenCalledTimes(1);
    expect(store.finish).toHaveBeenCalledWith({ transactionId: '100' });
  });

  it('does not throw when StoreKit refuses (the transaction is redelivered later)', async () => {
    store.finish.mockRejectedValueOnce(new Error('nope'));
    await expect(finish('100')).resolves.toBeUndefined();
    expect(log.warn).toHaveBeenCalled();
  });
});

describe('unfinished', () => {
  it('returns what StoreKit still holds', async () => {
    store.unfinished.mockResolvedValueOnce({ transactions: [tx('1'), tx('2')] });
    expect(await unfinished()).toEqual([tx('1'), tx('2')]);
  });

  it('is empty, without touching StoreKit, outside the iOS app', async () => {
    h.native = false;
    expect(await unfinished()).toEqual([]);
    expect(store.unfinished).not.toHaveBeenCalled();
  });

  it('is empty when StoreKit fails', async () => {
    store.unfinished.mockRejectedValueOnce(new Error('x'));
    expect(await unfinished()).toEqual([]);
  });
});

describe('restoreTransactions', () => {
  it('returns the restored transactions and finishes none of them', async () => {
    store.restore.mockResolvedValueOnce({ transactions: [tx('7')] });
    expect(await restoreTransactions()).toEqual([tx('7')]);
    expect(store.finish).not.toHaveBeenCalled();
  });

  it('is empty, without touching StoreKit, outside the iOS app', async () => {
    h.platform = 'web';
    expect(await restoreTransactions()).toEqual([]);
    expect(store.restore).not.toHaveBeenCalled();
  });

  it('surfaces a restore failure to the caller (so the screen can say so)', async () => {
    store.restore.mockRejectedValueOnce(new Error('not signed in to the App Store'));
    await expect(restoreTransactions()).rejects.toThrow('not signed in to the App Store');
  });
});

describe('loadProducts', () => {
  it('returns the products Apple sells and simply omits the ones it does not', async () => {
    store.getProducts.mockResolvedValueOnce({ products: [product('lp.a')] });
    const out = await loadProducts(['lp.a', 'lp.missing']);
    expect(store.getProducts).toHaveBeenCalledWith({ productIds: ['lp.a', 'lp.missing'] });
    expect([...out.keys()]).toEqual(['lp.a']);
    expect(out.get('lp.a')).toEqual(product('lp.a'));
  });

  it('asks the App Store only for ids it has not already got', async () => {
    store.getProducts.mockResolvedValueOnce({ products: [product('lp.b')] });
    await loadProducts(['lp.b']);
    store.getProducts.mockClear();
    store.getProducts.mockResolvedValueOnce({ products: [product('lp.c')] });
    const out = await loadProducts(['lp.b', 'lp.c']);
    expect(store.getProducts).toHaveBeenCalledWith({ productIds: ['lp.c'] });
    expect([...out.keys()]).toEqual(['lp.b', 'lp.c']);
    store.getProducts.mockClear();
    await loadProducts(['lp.b', 'lp.c']);
    expect(store.getProducts).not.toHaveBeenCalled();
  });

  it('asks again for every id when fresh', async () => {
    store.getProducts.mockResolvedValueOnce({ products: [product('lp.d')] });
    await loadProducts(['lp.d']);
    store.getProducts.mockResolvedValueOnce({ products: [{ ...product('lp.d'), displayPrice: '€7,99' }] });
    const out = await loadProducts(['lp.d'], { fresh: true });
    expect(store.getProducts).toHaveBeenLastCalledWith({ productIds: ['lp.d'] });
    expect(out.get('lp.d')?.displayPrice).toBe('€7,99');
  });

  it('gives an empty map, not a throw, when the App Store fails', async () => {
    store.getProducts.mockRejectedValueOnce(new Error('offline'));
    const out = await loadProducts(['lp.e']);
    expect(out.size).toBe(0);
    expect(log.warn).toHaveBeenCalled();
  });

  it('does nothing outside the iOS app or with no ids', async () => {
    expect((await loadProducts([])).size).toBe(0);
    h.native = false;
    expect((await loadProducts(['lp.f'])).size).toBe(0);
    expect(store.getProducts).not.toHaveBeenCalled();
  });
});

describe('onTransaction', () => {
  it('subscribes to redelivered transactions and unsubscribes on demand', async () => {
    const remove = vi.fn(async () => {});
    store.addListener.mockResolvedValueOnce({ remove });
    const fn = vi.fn();
    const off = await onTransaction(fn);
    expect(store.addListener).toHaveBeenCalledWith('transaction', fn);
    expect(remove).not.toHaveBeenCalled();
    off();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('is a no-op outside the iOS app', async () => {
    h.native = false;
    const off = await onTransaction(vi.fn());
    expect(store.addListener).not.toHaveBeenCalled();
    expect(() => off()).not.toThrow();
  });
});

describe('manageSubscriptions', () => {
  it("opens Apple's own sheet in the app", async () => {
    await manageSubscriptions();
    expect(store.manageSubscriptions).toHaveBeenCalledTimes(1);
  });

  it("opens Apple's subscriptions page in the browser preview", async () => {
    h.native = false;
    const open = vi.fn();
    vi.stubGlobal('window', { open });
    try {
      await manageSubscriptions();
    } finally {
      vi.unstubAllGlobals();
    }
    expect(open).toHaveBeenCalledWith('https://apps.apple.com/account/subscriptions', '_blank', 'noopener');
    expect(store.manageSubscriptions).not.toHaveBeenCalled();
  });
});
