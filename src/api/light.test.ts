import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The real client over a faked fetch: what leaves the phone, what is logged,
// and what an answer must hold before the app acts on it.
vi.mock('../lib/i18n', () => ({
  t: (s: string, vars?: Record<string, unknown>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (vars && vars[k] != null ? String(vars[k]) : m)),
  tk: (s: string) => s,
  i18n: { get: () => 'en' },
  currentLocale: () => 'en-GB',
}));

import { ApiError, light, money } from './light';

let fetchMock: ReturnType<typeof vi.fn>;
let warn: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;

/** The site's next answer: a JSON body (or raw text that is not JSON) with a status. */
function answer(body: unknown, status = 200) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  fetchMock.mockResolvedValueOnce(new Response(raw, { status }));
}
const sentUrl = () => String(fetchMock.mock.calls[0][0]);
const printed = () => JSON.stringify([...warn.mock.calls, ...error.mock.calls]);
async function failure(p: Promise<unknown>): Promise<ApiError> {
  const e = await p.then(() => null, (x: unknown) => x);
  expect(e).toBeInstanceOf(ApiError);
  return e as ApiError;
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  error = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('request: failures the buyer reads', () => {
  it("gives the site's own message and status on an error answer", async () => {
    answer({ error: 'That code does not match.' }, 401);
    const e = await failure(light.loginVerify('a@example.com', '123456'));
    expect(e.message).toBe('That code does not match.');
    expect(e.status).toBe(401);
    expect(e.code).toBeUndefined();
  });

  it('prefers `message` over `error`, and falls back to the status when the answer is not JSON', async () => {
    answer({ error: 'not_ready', message: 'Plans are not on sale yet.' }, 503);
    expect((await failure(light.appPay({ plan: 'p', destination: 'd', email: 'a@example.com' }))).message).toBe('Plans are not on sale yet.');
    answer('<html>Bad gateway</html>', 502);
    expect((await failure(light.summary())).message).toBe('Request failed (502)');
  });

  it('says no connection when the request never lands, and too long when it times out', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Load failed'));
    const offline = await failure(light.summary());
    expect(offline.message).toBe('No connection to Ringo. Check your internet and try again.');
    expect(offline.status).toBe(0);
    fetchMock.mockRejectedValueOnce(Object.assign(new Error('timed out'), { name: 'TimeoutError' }));
    expect((await failure(light.summary())).message).toBe('Ringo took too long to answer. Try again in a moment.');
  });

  // Regression: AbortSignal.timeout does not exist in WebViews before 2022;
  // the call threw inside the try and every request read as "No connection".
  it('still reaches the site on a WebView without AbortSignal.timeout', async () => {
    const original = AbortSignal.timeout;
    (AbortSignal as { timeout?: unknown }).timeout = undefined;
    try {
      answer({ from: { japan: 499 }, currency: 'eur' });
      await expect(light.summary()).resolves.toEqual({ from: { japan: 499 }, currency: 'eur' });
      expect((fetchMock.mock.calls[0][1] as RequestInit).signal).toBeInstanceOf(AbortSignal);
    } finally {
      AbortSignal.timeout = original;
    }
  });
});

describe('request: the session token and user id never reach a log', () => {
  const secret = 'tok.SECRET-9f2';
  const user = 'user-7c1d';

  it('redacts both on an error answer, a dropped connection and a timeout', async () => {
    answer({ error: 'Unauthorized' }, 401);
    await failure(light.profile(user, secret));
    fetchMock.mockRejectedValueOnce(new TypeError('Load failed'));
    await failure(light.usage(user, secret));
    fetchMock.mockRejectedValueOnce(Object.assign(new Error('timed out'), { name: 'TimeoutError' }));
    await failure(light.subscription(user, secret, { usage: true }));
    answer(null);
    await failure(light.catalog('japan', { userId: user, t: secret }));
    expect(warn.mock.calls.length + error.mock.calls.length).toBe(4);
    expect(printed()).not.toContain(secret);
    expect(printed()).not.toContain(user);
    expect(printed()).toContain('/app-profile?user=[redacted]&t=[redacted] -> 401 Unauthorized');
  });

  it('still sends them to the site, where the API reads them', async () => {
    answer({ esims: [], daily: [], totals: { used_mb: 0, days_online: 0 } });
    await light.usage(user, secret);
    expect(sentUrl()).toBe(`https://ringoesim.com/api/app-usage?user=${user}&t=${encodeURIComponent(secret)}`);
  });
});

describe('sign-in answers', () => {
  const ok = { ok: true, user_id: 'user-1', t: 'tok-1', email: 'a@example.com' };

  it('opens the account the site names, extra fields and all', async () => {
    answer({ ...ok, provider: 'apple', something_new: { nested: true } });
    await expect(light.loginProvider('apple', 'id.token', 'nonce')).resolves.toMatchObject(ok);
    answer(ok);
    await expect(light.loginVerify('a@example.com', '123456')).resolves.toEqual(ok);
  });

  it('accepts an answer without the email (the phone keeps the one typed)', async () => {
    answer({ ok: true, user_id: 'user-1', t: 'tok-1' });
    await expect(light.loginVerify('a@example.com', '123456')).resolves.toMatchObject({ user_id: 'user-1', t: 'tok-1' });
  });

  // Regression: `body as T` handed these on, and the app stored an account
  // with no id or no token and called itself signed in.
  it.each([
    ['an empty 200', ''],
    ['null', null],
    ['a page that is not JSON', '<html>Sign in to the Wi-Fi</html>'],
    ['a list', [ok]],
    ['no user id', { ok: true, t: 'tok-1', email: 'a@example.com' }],
    ['no token', { ok: true, user_id: 'user-1', email: 'a@example.com' }],
    ['an empty token', { ...ok, t: '' }],
    ['a user id that is not text', { ...ok, user_id: 42 }],
    ['an email that is not text', { ...ok, email: { address: 'a@example.com' } }],
  ])('refuses %s as a sign-in, as a handled error', async (_name, body) => {
    answer(body);
    const e = await failure(light.loginVerify('a@example.com', '123456'));
    expect(e.code).toBe('malformed_response');
    expect(e.status).toBe(200);
    expect(e.message).toBe('Request failed (200)');
    answer(body);
    expect((await failure(light.loginProvider('google', 'id.token', 'nonce'))).code).toBe('malformed_response');
  });

  it('takes the code step as sent or not, with or without a wait', async () => {
    answer({ ok: true, sent: false, review: true, retry_after: 60 });
    await expect(light.loginStart('a@example.com')).resolves.toMatchObject({ sent: false, retry_after: 60 });
    answer('');
    expect((await failure(light.loginStart('a@example.com'))).code).toBe('malformed_response');
  });
});

describe('payment answers', () => {
  const intent = { client_secret: 'pi_1_secret', mode: 'payment', amount: 1999, currency: 'eur', label: 'Japan 7 days', payment_intent_id: 'pi_1', publishable_key: 'pk_live_x' };
  const order = { plan: 'trip_7', destination: 'japan', email: 'a@example.com' };

  it('takes an intent as the site mints it: one payment, a subscription, with credit or a staff flag', async () => {
    answer(intent);
    await expect(light.appPay(order)).resolves.toEqual(intent);
    const sub = { client_secret: 'seti', mode: 'subscription', amount: 1500, currency: 'usd', label: 'Global', subscription_id: 'sub_1', publishable_key: 'pk_live_x' };
    answer(sub);
    await expect(light.appPay(order)).resolves.toEqual(sub);
    answer({ ...intent, credit_off: 300, list_amount: 2299, staff: true });
    await expect(light.appPay(order)).resolves.toMatchObject({ credit_off: 300, staff: true });
  });

  it('leaves a missing secret or key to cardPay, which refuses it with its own sentence', async () => {
    answer({ ...intent, client_secret: undefined, publishable_key: null });
    await expect(light.appPay(order)).resolves.toMatchObject({ amount: 1999, publishable_key: null });
  });

  it.each([
    ['an empty 200', ''],
    ['no amount', { ...intent, amount: undefined }],
    ['an amount that is text', { ...intent, amount: '19.99' }],
    ['a negative amount', { ...intent, amount: -1 }],
    ['no currency', { ...intent, currency: undefined }],
    ['a secret that is not text', { ...intent, client_secret: { id: 1 } }],
  ])('refuses %s as an intent', async (_name, body) => {
    answer(body);
    expect((await failure(light.appPay(order))).code).toBe('malformed_response');
  });

  it("reads Stripe's word only when `paid` is a real yes or no", async () => {
    answer({ kind: 'payment_intent', status: 'succeeded', paid: true, pending: false, amount: 1999, currency: 'eur', delivered: true, row_status: 'active', user_id: 'user-1', t: 'tok-1' });
    await expect(light.cardStatus({ pi: 'pi_1' })).resolves.toMatchObject({ paid: true, user_id: 'user-1', t: 'tok-1' });
    answer({ status: 'processing', paid: false, pending: true });
    await expect(light.cardStatus({ sub: 'sub_1' })).resolves.toMatchObject({ paid: false });
    expect(sentUrl()).toBe('https://ringoesim.com/api/light-status?pi=pi_1');
  });

  // Regression: `if (st.paid)` took the string "false" (or any stray value) as paid.
  it.each([
    ['paid as the string "false"', { status: 'processing', paid: 'false', pending: true }],
    ['paid as 1', { status: 'succeeded', paid: 1 }],
    ['no paid at all', { status: 'succeeded' }],
    ['an empty 200', ''],
    ['an owner id that is not text', { status: 'succeeded', paid: true, user_id: 7, t: 'tok-1' }],
  ])('never takes %s for a payment', async (_name, body) => {
    answer(body);
    expect((await failure(light.cardStatus({ pi: 'pi_1' }))).code).toBe('malformed_response');
  });

  it('takes a staff quote that applies only with a real price, and any answer saying it does not apply', async () => {
    answer({ amount: 450, currency: 'usd', staff: true });
    await expect(light.appQuote({ ...order, code: 'STAFF1' })).resolves.toEqual({ amount: 450, currency: 'usd', staff: true });
    answer({ amount: 1999, currency: 'usd', staff: false });
    await expect(light.appQuote({ ...order, code: 'NOPE' })).resolves.toMatchObject({ staff: false });
    answer({ staff: true, currency: 'usd' });
    expect((await failure(light.appQuote({ ...order, code: 'STAFF1' }))).code).toBe('malformed_response');
  });

  it('asks for a quote without minting, and for an intent as the app', async () => {
    answer({ amount: 450, currency: 'usd', staff: true });
    await light.appQuote({ ...order, code: 'STAFF1' });
    expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual({ ...order, code: 'STAFF1', quote: true, client: 'app' });
    answer(intent);
    await light.appPay({ ...order, code: 'STAFF1' });
    expect(JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body))).toEqual({ ...order, code: 'STAFF1', client: 'app' });
  });
});

describe('App Store purchase answers', () => {
  const recorded = { ok: true, environment: 'Production', transaction_id: '2000001', subscription_id: null, delivered: true, replay: false, user_id: 'user-1', t: 'tok-1' };

  it('takes a recorded purchase, with or without the owner named yet', async () => {
    answer(recorded);
    await expect(light.appPurchase({ signedTransaction: 'jws', plan: 'p', destination: 'd', email: 'a@example.com' })).resolves.toEqual(recorded);
    const unowned = { ok: true, environment: 'Production', transaction_id: '2000001', subscription_id: null, delivered: true, replay: true };
    answer(unowned);
    await expect(light.restorePurchase('jws')).resolves.toEqual(unowned);
  });

  it.each([
    ['an empty 200', ''],
    ['an owner id that is not text', { ...recorded, user_id: 12 }],
    ['a token that is not text', { ...recorded, t: true }],
    ['a transaction id that is not text', { ...recorded, transaction_id: { id: 1 } }],
  ])('refuses %s, so the transaction stays unfinished for a retry', async (_name, body) => {
    answer(body);
    expect((await failure(light.appPurchase({ signedTransaction: 'jws', plan: 'p', destination: 'd', email: 'a@example.com' }))).code).toBe('malformed_response');
    answer(body);
    expect((await failure(light.restorePurchase('jws'))).code).toBe('malformed_response');
  });
});

describe('answers the screens read at once', () => {
  it.each([
    ['summary', () => light.summary(), { from: {}, currency: 'eur' }, { currency: 'eur' }],
    ['catalog', () => light.catalog('japan'), { plans: [], destinations: [] }, { destinations: [] }],
    ['profile', () => light.profile('u', 't'), { badges: [], email: 'a@example.com' }, { email: 'a@example.com' }],
    ['usage', () => light.usage('u', 't'), { esims: [] }, { esims: null }],
    ['dashboard', () => light.dashboard('u', 't'), { user: {}, stats: null }, { user: null }],
    ['subscription', () => light.subscription('u', 't'), { subscription: null }, ''],
  ] as const)('%s: taken when it holds what is read, refused when it does not', async (_name, call, good, bad) => {
    answer(good);
    await expect(call()).resolves.toEqual(good);
    answer(bad);
    expect((await failure(call())).code).toBe('malformed_response');
  });

  it('does not judge answers nobody reads: an empty 200 to a delete or a push registration is a success', async () => {
    answer('');
    await expect(light.deleteAccount('u', 't')).resolves.toBeNull();
    answer('');
    await expect(light.pushRegister('u', 't', { token: 'apns', environment: 'production', service_ok: true, offers_ok: false })).resolves.toBeNull();
  });
});

describe('money', () => {
  it('formats minor units in the currency given', () => {
    expect(money(1299, 'eur')).toBe('€12.99');
    expect(money(1499, 'usd')).toBe('US$14.99');
    expect(money(500)).toBe('€5.00');
  });

  it('falls back to a plain figure for a currency code Intl rejects', () => {
    expect(money(1299, 'not-a-currency')).toBe('NOT-A-CURRENCY 12.99');
  });
});
