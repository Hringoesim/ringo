import { beforeEach, describe, expect, it, vi } from 'vitest';

// iap.ts runs for real here, over a faked StoreKit plugin, so these tests see
// whether the native transaction itself is finished, not just a JS wrapper.
const h = vi.hoisted(() => ({ plugins: {} as Record<string, Record<string, any>> }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' },
  registerPlugin: (name: string) => (h.plugins[name] ??= {}),
}));
vi.mock('./log', () => ({ log: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('./i18n', () => ({ t: (s: string) => s, currentLocale: () => 'en-GB' }));
vi.mock('./abtest', () => ({ logAb: vi.fn() }));
vi.mock('./terms', () => ({ subMonths: (p: { mode: string; term_months?: number }) => (p.mode === 'subscription' ? p.term_months || 1 : 1) }));
vi.mock('../store/account', () => ({
  account: { get: vi.fn(() => null), set: vi.fn() },
  pendingPurchase: { get: vi.fn(), set: vi.fn(), clear: vi.fn() },
}));
vi.mock('../api/light', () => {
  class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) { super(message); this.status = status; }
  }
  return {
    ApiError,
    light: { appPurchase: vi.fn() },
    money: (minor: number, currency: string) => `${String(currency).toUpperCase()} ${(minor / 100).toFixed(2)}`,
  };
});

import { ApiError, light, type Plan, type PurchaseRecord } from '../api/light';
import { account, pendingPurchase } from '../store/account';
import { logAb } from './abtest';
import type { IapProduct, IapTransaction } from './iap';
import { appleMoney, priceOf, reportTransaction } from './purchase';

const tx: IapTransaction = { productId: 'com.ringo.trip.7', transactionId: '2000001', originalTransactionId: '2000001', jws: 'signed.jws.payload', purchaseDate: 1 };
const ctx = { plan: 'trip_7', destination: 'japan', data_gb: null, email: 'buyer@example.com', startedAt: 1234 };
const record = (over: Partial<PurchaseRecord> = {}): PurchaseRecord => ({
  ok: true, environment: 'Production', transaction_id: '2000001', subscription_id: null, delivered: true, user_id: 'user-1', t: 'tok-1', ...over,
});

const appPurchase = vi.mocked(light.appPurchase);
let nativeFinish: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  nativeFinish = vi.fn(async () => ({ finished: true }));
  Object.assign((h.plugins.StoreKit ??= {}), { finish: nativeFinish });
});

describe('reportTransaction', () => {
  it("sends Apple's signed transaction and the purchase context to the site", async () => {
    appPurchase.mockResolvedValue(record());
    await reportTransaction(tx, ctx);
    expect(appPurchase).toHaveBeenCalledTimes(1);
    expect(appPurchase).toHaveBeenCalledWith({ signedTransaction: 'signed.jws.payload', plan: 'trip_7', destination: 'japan', data_gb: null, email: 'buyer@example.com' });
  });

  it('on a verified, owned purchase: remembers the account, finishes the transaction, consumes its context', async () => {
    const r = record();
    appPurchase.mockResolvedValue(r);
    await expect(reportTransaction(tx, ctx)).resolves.toBe(r);
    expect(account.set).toHaveBeenCalledWith({ userId: 'user-1', t: 'tok-1', email: 'buyer@example.com', purchaseRef: 'apple:2000001' });
    expect(nativeFinish).toHaveBeenCalledTimes(1);
    expect(nativeFinish).toHaveBeenCalledWith({ transactionId: '2000001' });
    expect(pendingPurchase.clear).toHaveBeenCalledWith('com.ringo.trip.7', 1234);
    expect(logAb).toHaveBeenCalledWith('purchase', { destination: 'japan', plan: 'trip_7', product: 'com.ringo.trip.7' });
  });

  it('does not finish the transaction until the site has answered', async () => {
    let answer!: (r: PurchaseRecord) => void;
    appPurchase.mockReturnValue(new Promise<PurchaseRecord>((res) => { answer = res; }));
    const pending = reportTransaction(tx, ctx);
    await Promise.resolve();
    await Promise.resolve();
    expect(nativeFinish).not.toHaveBeenCalled();
    expect(account.set).not.toHaveBeenCalled();
    answer(record());
    await pending;
    expect(nativeFinish).toHaveBeenCalledTimes(1);
  });

  it('remembers the account before finishing, so a finished purchase always has an owner on the phone', async () => {
    appPurchase.mockResolvedValue(record());
    await reportTransaction(tx, ctx);
    expect(vi.mocked(account.set).mock.invocationCallOrder[0]).toBeLessThan(nativeFinish.mock.invocationCallOrder[0]);
  });

  it.each([
    ['no user id', { user_id: undefined }],
    ['an empty user id', { user_id: '' }],
    ['no account token', { t: undefined }],
    ['an empty account token', { t: '' }],
    ['neither', { user_id: undefined, t: undefined }],
  ])('fail-safe: when the site answers with %s, the transaction is left unfinished for retry', async (_name, over) => {
    appPurchase.mockResolvedValue(record(over));
    const err = await reportTransaction(tx, ctx).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(502);
    expect((err as ApiError).message).toBe('Your purchase went through, but we could not open your account yet.');
    expect(nativeFinish).not.toHaveBeenCalled();
    expect(pendingPurchase.clear).not.toHaveBeenCalled();
    expect(account.set).not.toHaveBeenCalled();
    expect(logAb).not.toHaveBeenCalled();
  });

  it('fail-safe: when the site rejects or cannot be reached, the transaction is left unfinished for retry', async () => {
    appPurchase.mockRejectedValue(new ApiError('Signature could not be verified', 400));
    await expect(reportTransaction(tx, ctx)).rejects.toThrow('Signature could not be verified');
    expect(nativeFinish).not.toHaveBeenCalled();
    expect(pendingPurchase.clear).not.toHaveBeenCalled();
    expect(account.set).not.toHaveBeenCalled();
  });

  it("names the purchase by the site's verified transaction id, not the phone's", async () => {
    appPurchase.mockResolvedValue(record({ transaction_id: '2000999' }));
    await reportTransaction(tx, ctx);
    expect(account.set).toHaveBeenCalledWith(expect.objectContaining({ purchaseRef: 'apple:2000999' }));
    expect(nativeFinish).toHaveBeenCalledWith({ transactionId: '2000001' });
  });

  // Regression: an answer without the id stored the purchase as "apple:undefined",
  // a reference the site releases no eSIM against.
  it("falls back to Apple's own transaction id when the site's answer leaves it out", async () => {
    appPurchase.mockResolvedValue(record({ transaction_id: undefined as unknown as string }));
    await reportTransaction(tx, ctx);
    expect(account.set).toHaveBeenCalledWith(expect.objectContaining({ purchaseRef: 'apple:2000001' }));
    expect(nativeFinish).toHaveBeenCalledWith({ transactionId: '2000001' });
  });

  it('clears the oldest waiting context when the purchase carries no start stamp (a redelivered transaction)', async () => {
    appPurchase.mockResolvedValue(record());
    await reportTransaction(tx, { plan: 'trip_7', destination: 'japan', data_gb: 5, email: 'buyer@example.com' });
    expect(pendingPurchase.clear).toHaveBeenCalledWith('com.ringo.trip.7', undefined);
  });
});

describe('appleMoney', () => {
  it("formats an amount in Apple's currency", () => {
    expect(appleMoney(12.99, 'EUR')).toBe('€12.99');
    expect(appleMoney(5, 'USD')).toBe('US$5.00');
  });

  it('falls back to a plain figure for a currency code Intl rejects', () => {
    expect(appleMoney(3.5, 'not-a-currency')).toBe('not-a-currency 3.50');
  });
});

describe('priceOf', () => {
  const plan = (over: Partial<Plan>): Plan => ({ mode: 'payment', currency: 'eur', monthly_amount: 0, billed_upfront_amount: 0, ...over }) as Plan;
  const product = (over: Partial<IapProduct>): IapProduct => ({ id: 'p', displayName: '', description: '', displayPrice: '$23.99', price: 23.99, currency: 'USD', type: 'consumable', ...over });

  it("uses Apple's price and currency whenever the App Store product is known", () => {
    const out = priceOf(plan({ billed_upfront_amount: 1999, currency: 'eur' }), product({}));
    expect(out).toEqual({ total: '$23.99', monthly: 'US$23.99', currency: 'USD' });
  });

  it("spreads a multi-month subscription's Apple price per month", () => {
    const out = priceOf(plan({ mode: 'subscription', term_months: 12 }), product({ displayPrice: '$120.00', price: 120, type: 'subscription' }));
    expect(out.total).toBe('$120.00');
    expect(out.monthly).toBe('US$10.00');
  });

  it("falls back to the catalogue's one-payment price without a product", () => {
    expect(priceOf(plan({ billed_upfront_amount: 1999 }), null)).toEqual({ total: 'EUR 19.99', monthly: 'EUR 19.99', currency: 'EUR' });
  });

  it("falls back to the catalogue's monthly price times the term for a subscription", () => {
    expect(priceOf(plan({ mode: 'subscription', monthly_amount: 1500, term_months: 6 }), null)).toEqual({ total: 'EUR 90.00', monthly: 'EUR 15.00', currency: 'EUR' });
  });
});
