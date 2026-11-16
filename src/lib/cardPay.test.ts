import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ native: true, plugins: {} as Record<string, Record<string, any>> }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => h.native, getPlatform: () => 'ios' },
  registerPlugin: (name: string) => (h.plugins[name] ??= {}),
}));
vi.mock('./i18n', () => ({ t: (s: string) => s }));
vi.mock('./inlinePay', () => ({ InlinePay: { confirmCard: vi.fn(), payApple: vi.fn() } }));
vi.mock('../store/account', () => ({ account: { get: vi.fn(() => null) } }));
vi.mock('../api/light', () => ({ light: { appPay: vi.fn(), cardStatus: vi.fn() } }));

import { light, type CardStatus } from '../api/light';
import { account, type Account } from '../store/account';
import { InlinePay } from './inlinePay';
import { payByCard, waitForOwner, type CardOrder, type CardOutcome } from './cardPay';

const appPay = vi.mocked(light.appPay);
const cardStatus = vi.mocked(light.cardStatus);
const getAccount = vi.mocked(account.get);
const confirmCard = vi.mocked(InlinePay.confirmCard);
const payApple = vi.mocked(InlinePay.payApple);
let present: ReturnType<typeof vi.fn>;

const NOT_STARTED = 'The payment could not be started. Nothing was charged. Please try again.';
const order: CardOrder = { plan: 'trip_7', destination: 'japan', data_gb: null, email: 'buyer@example.com' };
type Intent = Awaited<ReturnType<typeof light.appPay>>;
const intent = (over: Partial<Intent> = {}): Intent => ({
  client_secret: 'pi_1_secret', mode: 'payment', amount: 1999, currency: 'eur', label: 'Japan 7 days', payment_intent_id: 'pi_1', publishable_key: 'pk_test_x', ...over,
});
const status = (over: Partial<CardStatus> = {}): CardStatus => ({ status: 'processing', paid: false, pending: true, ...over });
const PAID = status({ status: 'succeeded', paid: true, pending: false });
const OWNED = status({ status: 'succeeded', paid: true, pending: false, user_id: 'user-1', t: 'tok-1' });
const acct = (over: Partial<Account> = {}): Account => ({ userId: 'user-9', t: 'tok-9', email: 'buyer@example.com', purchaseRef: null, ...over });

/** Settles the promise's state without awaiting it, so a test can assert "still waiting". */
function track(p: Promise<CardOutcome>) {
  const s: { settled: boolean; value?: CardOutcome; error?: unknown } = { settled: false };
  p.then((v) => { s.settled = true; s.value = v; }, (e) => { s.settled = true; s.error = e; });
  return s;
}

beforeEach(() => {
  vi.useFakeTimers();
  // cardPay waits with window.setTimeout; under Node the global stands in.
  vi.stubGlobal('window', globalThis);
  vi.clearAllMocks();
  h.native = true;
  getAccount.mockReturnValue(null);
  appPay.mockResolvedValue(intent());
  cardStatus.mockResolvedValue(status());
  present = vi.fn(async () => ({ status: 'completed' }));
  Object.assign((h.plugins.PaymentSheet ??= {}), { present });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('payByCard: starting the payment', () => {
  it('refuses outside the native app without minting anything', async () => {
    h.native = false;
    await expect(payByCard(order)).rejects.toThrow('Payments are taken in the Ringo iPhone app.');
    expect(appPay).not.toHaveBeenCalled();
    expect(present).not.toHaveBeenCalled();
  });

  it.each(['missing_secret', 'Unknown plan', 'Could not start checkout', ''])('turns the server code %j into a sentence the buyer can read', async (code) => {
    appPay.mockRejectedValue(new Error(code));
    await expect(payByCard(order)).rejects.toThrow(NOT_STARTED);
    expect(present).not.toHaveBeenCalled();
  });

  // An answer api/light.ts refused (an empty 200, an amount that is not a
  // number): its technical message never reaches the buyer.
  it('turns an answer the app could not read into the same sentence, and opens no sheet', async () => {
    appPay.mockRejectedValue(Object.assign(new Error('Request failed (200)'), { status: 200, code: 'malformed_response' }));
    await expect(payByCard(order)).rejects.toThrow(NOT_STARTED);
    expect(present).not.toHaveBeenCalled();
    expect(cardStatus).not.toHaveBeenCalled();
  });

  it("keeps the server's own sentence when it is one", async () => {
    appPay.mockRejectedValue(new Error('This plan is not sold in your country yet.'));
    await expect(payByCard(order)).rejects.toThrow('This plan is not sold in your country yet.');
  });

  it.each([
    ['no client secret', { client_secret: '' }],
    ['no publishable key', { publishable_key: null }],
    ['no intent or subscription id', { payment_intent_id: undefined, subscription_id: undefined }],
  ])('does not open the sheet when the site returns %s', async (_name, over) => {
    appPay.mockResolvedValue(intent(over));
    await expect(payByCard(order)).rejects.toThrow('The payment could not be started. Nothing was charged.');
    expect(present).not.toHaveBeenCalled();
    expect(cardStatus).not.toHaveBeenCalled();
  });

  it("opens the sheet with the site's secret and key and the buyer's email", async () => {
    const p = await payByCard(order);
    await vi.advanceTimersByTimeAsync(0);
    p.stop();
    expect(present).toHaveBeenCalledWith({ clientSecret: 'pi_1_secret', publishableKey: 'pk_test_x', email: 'buyer@example.com' });
    expect(confirmCard).not.toHaveBeenCalled();
    expect(payApple).not.toHaveBeenCalled();
  });

  it('confirms through the inline card field when asked', async () => {
    confirmCard.mockResolvedValue({ status: 'canceled' });
    const p = await payByCard({ ...order, via: 'card' });
    await expect(p.done).resolves.toEqual({ state: 'left' });
    expect(confirmCard).toHaveBeenCalledWith({ clientSecret: 'pi_1_secret', publishableKey: 'pk_test_x', email: 'buyer@example.com' });
    expect(present).not.toHaveBeenCalled();
  });

  it("confirms through Apple Pay with the site's amount, currency and label", async () => {
    payApple.mockResolvedValue({ status: 'canceled' });
    const p = await payByCard({ ...order, via: 'applePay' });
    await p.done;
    expect(payApple).toHaveBeenCalledWith({ clientSecret: 'pi_1_secret', publishableKey: 'pk_test_x', amount: 1999, currency: 'eur', label: 'Japan 7 days', monthly: false });
    expect(present).not.toHaveBeenCalled();
  });

  it('marks an Apple Pay subscription as monthly and falls back to a default label', async () => {
    appPay.mockResolvedValue(intent({ mode: 'subscription', label: '', payment_intent_id: undefined, subscription_id: 'sub_1' }));
    payApple.mockResolvedValue({ status: 'canceled' });
    const p = await payByCard({ ...order, via: 'applePay' });
    await p.done;
    expect(payApple).toHaveBeenCalledWith(expect.objectContaining({ label: 'Ringo eSIM', monthly: true }));
  });
});

describe('payByCard: what the site is told', () => {
  const sent = () => appPay.mock.calls[0][0] as Record<string, unknown>;
  const run = async (o: CardOrder) => { const p = await payByCard(o); p.stop(); };

  it('sends the order as shown, without client-only fields', async () => {
    await run({ ...order, via: 'sheet', useCredit: true, currency: 'usd' });
    expect(sent()).toEqual({ plan: 'trip_7', destination: 'japan', data_gb: null, email: 'buyer@example.com', currency: 'usd' });
  });

  it("adds the member's account when the order is for their own email (any letter case)", async () => {
    getAccount.mockReturnValue(acct({ email: 'Buyer@Example.com' }));
    await run(order);
    expect(sent()).toMatchObject({ user: 'user-9', t: 'tok-9' });
    expect(sent()).not.toHaveProperty('use_credit');
  });

  it("leaves the account out when the plan is for someone else's email, credit included", async () => {
    getAccount.mockReturnValue(acct({ email: 'me@example.com' }));
    await run({ ...order, useCredit: true });
    expect(sent()).not.toHaveProperty('user');
    expect(sent()).not.toHaveProperty('t');
    expect(sent()).not.toHaveProperty('use_credit');
  });

  it('always sends the account with a top-up', async () => {
    getAccount.mockReturnValue(acct({ email: 'me@example.com' }));
    await run({ ...order, topUp: true });
    expect(sent()).toMatchObject({ user: 'user-9', t: 'tok-9', topUp: true });
  });

  it('sends a staff code as typed, with or without an account, and never credit beside a stranger\'s email', async () => {
    await run({ ...order, code: 'STAFF-7Q' });
    expect(sent()).toEqual({ plan: 'trip_7', destination: 'japan', data_gb: null, email: 'buyer@example.com', code: 'STAFF-7Q' });
    appPay.mockClear();
    getAccount.mockReturnValue(acct({ email: 'me@example.com' }));
    await run({ ...order, code: 'STAFF-7Q', useCredit: true });
    expect(sent()).toMatchObject({ code: 'STAFF-7Q' });
    expect(sent()).not.toHaveProperty('user');
    expect(sent()).not.toHaveProperty('use_credit');
  });

  it('names the eSIM a top-up is for, with the account that owns it', async () => {
    getAccount.mockReturnValue(acct());
    await run({ ...order, topUp: true, subscription: 'sub-row-42' });
    expect(sent()).toMatchObject({ topUp: true, subscription: 'sub-row-42', user: 'user-9', t: 'tok-9' });
  });

  it('sends an account that has no email on file with the order (nothing to compare the typed email with)', async () => {
    getAccount.mockReturnValue(acct({ email: null }));
    await run({ ...order, useCredit: true });
    expect(sent()).toMatchObject({ user: 'user-9', t: 'tok-9', use_credit: true });
  });

  it('asks to spend credit only when the buyer chose to and the account rides along', async () => {
    getAccount.mockReturnValue(acct());
    await run({ ...order, useCredit: true });
    expect(sent()).toMatchObject({ user: 'user-9', t: 'tok-9', use_credit: true });
  });
});

describe('payByCard: outcomes', () => {
  it('left: the buyer closed the sheet, and Stripe is never asked', async () => {
    present.mockResolvedValue({ status: 'canceled' });
    const p = await payByCard(order);
    await expect(p.done).resolves.toEqual({ state: 'left' });
    expect(cardStatus).not.toHaveBeenCalled();
  });

  it("failed: rejects with the sheet's message, and Stripe is never asked", async () => {
    present.mockResolvedValue({ status: 'failed', message: 'Your card was declined.' });
    const p = await payByCard(order);
    await expect(p.done).rejects.toThrow('Your card was declined.');
    expect(cardStatus).not.toHaveBeenCalled();
  });

  it('failed without a message: rejects with a sentence saying nothing was charged', async () => {
    present.mockResolvedValue({ status: 'failed' });
    const p = await payByCard(order);
    await expect(p.done).rejects.toThrow('The payment did not go through. Nothing was charged.');
  });

  it('paid: Stripe says paid and the site names the owner', async () => {
    cardStatus.mockResolvedValue(OWNED);
    const p = await payByCard(order);
    await expect(p.done).resolves.toEqual({ state: 'paid', session: 'pi_1', userId: 'user-1', t: 'tok-1' });
    expect(cardStatus).toHaveBeenCalledTimes(1);
    expect(cardStatus).toHaveBeenCalledWith({ pi: 'pi_1' });
  });

  it('paid: a subscription is asked about by its subscription id', async () => {
    appPay.mockResolvedValue(intent({ mode: 'subscription', payment_intent_id: undefined, subscription_id: 'sub_1' }));
    cardStatus.mockResolvedValue(OWNED);
    const p = await payByCard(order);
    await expect(p.done).resolves.toEqual({ state: 'paid', session: 'sub_1', userId: 'user-1', t: 'tok-1' });
    expect(cardStatus).toHaveBeenCalledWith({ sub: 'sub_1' });
  });

  it("the sheet's own \"completed\" is never taken as paid: it keeps asking every 2.5 s until Stripe says so", async () => {
    cardStatus
      .mockResolvedValueOnce(status())
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(PAID) // paid, owner not named yet
      .mockResolvedValueOnce(OWNED);
    const p = await payByCard(order);
    const s = track(p.done);
    await vi.advanceTimersByTimeAsync(0);
    expect(cardStatus).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2499);
    expect(cardStatus).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(cardStatus).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2500);
    expect(cardStatus).toHaveBeenCalledTimes(3);
    expect(s.settled).toBe(false);
    await vi.advanceTimersByTimeAsync(2500);
    expect(s.value).toEqual({ state: 'paid', session: 'pi_1', userId: 'user-1', t: 'tok-1' });
    expect(cardStatus).toHaveBeenCalledTimes(4);
  });

  it('paid needs both the user id and the token: one without the other keeps waiting', async () => {
    cardStatus.mockResolvedValueOnce({ ...PAID, user_id: 'user-1' }).mockResolvedValueOnce({ ...PAID, t: 'tok-1' }).mockResolvedValue(OWNED);
    const p = await payByCard(order);
    const s = track(p.done);
    await vi.advanceTimersByTimeAsync(2500);
    expect(s.settled).toBe(false);
    await vi.advanceTimersByTimeAsync(2500);
    expect(s.value).toMatchObject({ state: 'paid' });
  });

  it('received: a top-up settles as soon as Stripe says paid, with no owner to wait for', async () => {
    cardStatus.mockResolvedValueOnce(status()).mockResolvedValue(PAID);
    const p = await payByCard({ ...order, topUp: true });
    const s = track(p.done);
    await vi.advanceTimersByTimeAsync(0);
    expect(s.settled).toBe(false);
    await vi.advanceTimersByTimeAsync(2500);
    expect(s.value).toEqual({ state: 'received', session: 'pi_1', query: { pi: 'pi_1' } });
  });

  it('received: a top-up is not told paid while Stripe has not said so', async () => {
    const p = await payByCard({ ...order, topUp: true });
    const s = track(p.done);
    await vi.advanceTimersByTimeAsync(95_000);
    expect(s.value).toEqual({ state: 'unconfirmed', session: 'pi_1', query: { pi: 'pi_1' } });
  });

  it('received: paid but the owner is still not named after 90 s', async () => {
    cardStatus.mockResolvedValue(PAID);
    const p = await payByCard(order);
    const s = track(p.done);
    await vi.advanceTimersByTimeAsync(90_000);
    expect(s.settled).toBe(false);
    await vi.advanceTimersByTimeAsync(2500);
    expect(s.value).toEqual({ state: 'received', session: 'pi_1', query: { pi: 'pi_1' } });
  });

  it('unconfirmed: Stripe never says paid within 90 s (a slow bank), so the buyer is never told it is paid', async () => {
    const p = await payByCard(order);
    const s = track(p.done);
    await vi.advanceTimersByTimeAsync(90_000);
    expect(s.settled).toBe(false);
    await vi.advanceTimersByTimeAsync(2500);
    expect(s.value).toEqual({ state: 'unconfirmed', session: 'pi_1', query: { pi: 'pi_1' } });
  });

  it('unconfirmed: the status check failing every time is not a payment', async () => {
    cardStatus.mockRejectedValue(new Error('offline'));
    const p = await payByCard(order);
    const s = track(p.done);
    await vi.advanceTimersByTimeAsync(95_000);
    expect(s.value).toEqual({ state: 'unconfirmed', session: 'pi_1', query: { pi: 'pi_1' } });
    expect(s.error).toBeUndefined();
  });

  it('paid once seen stays seen: a later failed check still ends as received, not unconfirmed', async () => {
    cardStatus.mockResolvedValueOnce(PAID).mockRejectedValue(new Error('offline'));
    const p = await payByCard(order);
    const s = track(p.done);
    await vi.advanceTimersByTimeAsync(95_000);
    expect(s.value).toMatchObject({ state: 'received' });
  });

  it('stop(): ends the wait as unconfirmed when nothing was paid, and stops asking', async () => {
    const p = await payByCard(order);
    const s = track(p.done);
    await vi.advanceTimersByTimeAsync(2500);
    p.stop();
    await vi.advanceTimersByTimeAsync(2500);
    expect(s.value).toEqual({ state: 'unconfirmed', session: 'pi_1', query: { pi: 'pi_1' } });
    const asked = cardStatus.mock.calls.length;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(cardStatus).toHaveBeenCalledTimes(asked);
  });

  it('stop(): ends the wait as received when Stripe had already said paid', async () => {
    cardStatus.mockResolvedValue(PAID);
    const p = await payByCard(order);
    const s = track(p.done);
    await vi.advanceTimersByTimeAsync(2500);
    p.stop();
    await vi.advanceTimersByTimeAsync(2500);
    expect(s.value).toEqual({ state: 'received', session: 'pi_1', query: { pi: 'pi_1' } });
  });
});

describe('waitForOwner', () => {
  it('asks every 5 s and returns the owner once the site names one', async () => {
    cardStatus.mockResolvedValueOnce(PAID).mockRejectedValueOnce(new Error('network')).mockResolvedValue(OWNED);
    let out: unknown = 'waiting';
    void waitForOwner({ pi: 'pi_1' }).then((v) => { out = v; });
    await vi.advanceTimersByTimeAsync(5000);
    expect(out).toBe('waiting');
    await vi.advanceTimersByTimeAsync(5000);
    expect(out).toEqual({ userId: 'user-1', t: 'tok-1' });
    expect(cardStatus).toHaveBeenCalledTimes(3);
    expect(cardStatus).toHaveBeenCalledWith({ pi: 'pi_1' });
  });

  it('does not accept an owner on a payment Stripe has not called paid', async () => {
    cardStatus.mockResolvedValue(status({ user_id: 'user-1', t: 'tok-1' }));
    let out: unknown = 'waiting';
    void waitForOwner({ pi: 'pi_1' }).then((v) => { out = v; });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(out).toBe('waiting');
  });

  it('gives up with null once it is no longer wanted', async () => {
    cardStatus.mockResolvedValue(PAID);
    let wanted = true;
    let out: unknown = 'waiting';
    void waitForOwner({ sub: 'sub_1' }, () => wanted).then((v) => { out = v; });
    await vi.advanceTimersByTimeAsync(5000);
    wanted = false;
    await vi.advanceTimersByTimeAsync(5000);
    expect(out).toBeNull();
  });

  it('gives up with null after ten minutes', async () => {
    cardStatus.mockResolvedValue(PAID);
    let out: unknown = 'waiting';
    void waitForOwner({ pi: 'pi_1' }).then((v) => { out = v; });
    await vi.advanceTimersByTimeAsync(9 * 60_000);
    expect(out).toBe('waiting');
    await vi.advanceTimersByTimeAsync(61_000 + 5000);
    expect(out).toBeNull();
  });
});
