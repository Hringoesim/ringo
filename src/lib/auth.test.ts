import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  native: true,
  platform: 'ios',
  plugins: {} as Record<string, Record<string, any>>,
  flags: {} as { google_ios_client_id?: string; google_signin?: boolean },
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => h.native, getPlatform: () => h.platform },
  registerPlugin: (name: string) => (h.plugins[name] ??= {}),
}));
vi.mock('./i18n', () => ({ t: (s: string) => s }));
vi.mock('../store/flags', () => ({ flags: { get: () => h.flags } }));
vi.mock('../store/account', () => ({ account: { get: vi.fn(() => null), set: vi.fn() } }));
vi.mock('../api/light', () => ({ light: { loginProvider: vi.fn() } }));

import { light } from '../api/light';
import { account } from '../store/account';

const loginProvider = vi.mocked(light.loginProvider);
const setAccount = vi.mocked(account.set);
let authorize: ReturnType<typeof vi.fn>;
let signIn: ReturnType<typeof vi.fn>;
let openAuth: ReturnType<typeof vi.fn>;

const SERVER = { ok: true, user_id: 'user-1', t: 'tok-1', email: 'server@example.com', provider: 'apple' };
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

// auth.ts reads VITE_GOOGLE_IOS_CLIENT_ID once at import, so each test loads
// a fresh copy with the build-time id it wants (none unless stated).
async function load(buildClientId = '') {
  vi.resetModules();
  vi.stubEnv('VITE_GOOGLE_IOS_CLIENT_ID', buildClientId);
  return import('./auth');
}

beforeEach(() => {
  vi.clearAllMocks();
  h.native = true;
  h.platform = 'ios';
  h.flags = {};
  authorize = vi.fn(async () => ({ response: { identityToken: 'apple.identity.token', user: 'apple-user', email: 'from-apple@example.com' } }));
  signIn = vi.fn(async () => ({ idToken: 'google.id.token' }));
  openAuth = vi.fn(async () => ({ callback: 'com.ringoesim.app://auth#access_token=supabase.access.token&token_type=bearer' }));
  Object.assign((h.plugins.SignInWithApple ??= {}), { authorize });
  Object.assign((h.plugins.GoogleSignIn ??= {}), { signIn, openAuth });
  loginProvider.mockResolvedValue(SERVER);
});

describe('signInWithApple', () => {
  it("hands Apple's identity token to the server and opens the account the server names", async () => {
    const { signInWithApple } = await load();
    await expect(signInWithApple()).resolves.toEqual({ ok: true, email: 'server@example.com' });
    expect(loginProvider).toHaveBeenCalledTimes(1);
    expect(loginProvider).toHaveBeenCalledWith('apple', 'apple.identity.token', expect.any(String));
    // Identity comes from the server's answer, never from what the sheet returned on the phone.
    expect(setAccount).toHaveBeenCalledWith({ userId: 'user-1', t: 'tok-1', email: 'server@example.com', purchaseRef: null });
  });

  it('gives Apple the SHA-256 of the nonce and the server the raw nonce', async () => {
    const { signInWithApple } = await load();
    await signInWithApple();
    const raw = loginProvider.mock.calls[0][2];
    expect(raw).toMatch(/^[0-9a-f]{48}$/);
    expect(authorize).toHaveBeenCalledWith({ nonce: sha256(raw) });
  });

  it('makes a new nonce for every attempt', async () => {
    const { signInWithApple } = await load();
    await signInWithApple();
    await signInWithApple();
    expect(loginProvider.mock.calls[0][2]).not.toBe(loginProvider.mock.calls[1][2]);
  });

  it('reads a dismissed sheet as cancelled (English message)', async () => {
    authorize.mockRejectedValue(Object.assign(new Error('The user canceled the authorization attempt.'), { code: '1001' }));
    const { signInWithApple } = await load();
    await expect(signInWithApple()).resolves.toEqual({ ok: false, cancelled: true });
    expect(loginProvider).not.toHaveBeenCalled();
    expect(setAccount).not.toHaveBeenCalled();
  });

  // Regression: "cancel" only appears in the English string, so a dismissed
  // sheet on a phone in any other language used to be shown as a failure.
  it.each([
    ['French', 'L’opération n’a pas pu s’achever.'],
    ['German', 'Der Vorgang konnte nicht abgeschlossen werden.'],
    ['Japanese', '操作を完了できませんでした。'],
    ['Dutch', 'De bewerking kan niet worden voltooid.'],
  ])('reads a dismissed sheet as cancelled on a %s phone, by Apple error code 1001', async (_lang, message) => {
    authorize.mockRejectedValue(Object.assign(new Error(message), { code: '1001' }));
    const { signInWithApple } = await load();
    await expect(signInWithApple()).resolves.toEqual({ ok: false, cancelled: true });
    expect(loginProvider).not.toHaveBeenCalled();
  });

  it('reads a dismissed sheet as cancelled when the code only appears in the message', async () => {
    authorize.mockRejectedValue(new Error('Der Vorgang konnte nicht abgeschlossen werden. (com.apple.AuthenticationServices.AuthorizationError Fehler 1001.)'));
    const { signInWithApple } = await load();
    await expect(signInWithApple()).resolves.toEqual({ ok: false, cancelled: true });
  });

  it('reports any other Apple error as a failure, not a cancel', async () => {
    authorize.mockRejectedValue(Object.assign(new Error('L’opération n’a pas pu s’achever.'), { code: '1000' }));
    const { signInWithApple } = await load();
    await expect(signInWithApple()).resolves.toEqual({ ok: false, error: 'Apple did not complete the sign-in.' });
    expect(loginProvider).not.toHaveBeenCalled();
  });

  // Regression: any message holding "1001" was read as a closed sheet, so a
  // network timeout (NSURLErrorDomain -1001) ended the sign-in without a word.
  it.each([
    ['a network timeout', 'The operation couldn’t be completed. (NSURLErrorDomain error -1001.)'],
    ['another number that only starts the same', 'The operation couldn’t be completed. (com.apple.AuthenticationServices.AuthorizationError error 10010.)'],
    ['1001 outside Apple\'s sign-in error', 'Request 1001 failed'],
  ])('reports %s as a failure, not a cancel', async (_name, message) => {
    authorize.mockRejectedValue(Object.assign(new Error(message), { code: '-1' }));
    const { signInWithApple } = await load();
    await expect(signInWithApple()).resolves.toEqual({ ok: false, error: 'Apple did not complete the sign-in.' });
    expect(loginProvider).not.toHaveBeenCalled();
  });

  it('fails, with nothing sent to the server, when Apple returns no identity token', async () => {
    authorize.mockResolvedValue({ response: { identityToken: '', user: 'apple-user' } });
    const { signInWithApple } = await load();
    await expect(signInWithApple()).resolves.toEqual({ ok: false, error: 'Apple did not complete the sign-in.' });
    expect(loginProvider).not.toHaveBeenCalled();
    expect(setAccount).not.toHaveBeenCalled();
  });

  it('is not signed in when the server rejects the token', async () => {
    loginProvider.mockRejectedValue(new Error('Token could not be verified'));
    const { signInWithApple } = await load();
    await expect(signInWithApple()).resolves.toEqual({ ok: false, error: 'Token could not be verified' });
    expect(setAccount).not.toHaveBeenCalled();
  });
});

describe('signInWithGoogle with an iOS client id', () => {
  beforeEach(() => { h.flags = { google_ios_client_id: 'site-client.apps.googleusercontent.com' }; });

  it("hands Google's id token to the server with the same nonce Google was given", async () => {
    const { signInWithGoogle } = await load();
    await expect(signInWithGoogle()).resolves.toEqual({ ok: true, email: 'server@example.com' });
    const { nonce } = signIn.mock.calls[0][0] as { nonce: string };
    expect(nonce).toMatch(/^[0-9a-f]{48}$/);
    expect(signIn).toHaveBeenCalledWith({ clientId: 'site-client.apps.googleusercontent.com', nonce });
    expect(loginProvider).toHaveBeenCalledWith('google', 'google.id.token', nonce);
    expect(setAccount).toHaveBeenCalledWith({ userId: 'user-1', t: 'tok-1', email: 'server@example.com', purchaseRef: null });
    expect(openAuth).not.toHaveBeenCalled();
  });

  it('prefers a build-time client id over the one the site sends', async () => {
    const { signInWithGoogle } = await load('build-client.apps.googleusercontent.com');
    await signInWithGoogle();
    expect(signIn).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'build-client.apps.googleusercontent.com' }));
  });

  it.each([
    ['the sheet was dismissed', { cancelled: true }],
    ['no id token came back', {}],
    ['only an access token came back', { accessToken: 'ya29.x' }],
  ])('is cancelled, with nothing sent to the server, when %s', async (_name, result) => {
    signIn.mockResolvedValue(result);
    const { signInWithGoogle } = await load();
    await expect(signInWithGoogle()).resolves.toEqual({ ok: false, cancelled: true });
    expect(loginProvider).not.toHaveBeenCalled();
    expect(setAccount).not.toHaveBeenCalled();
  });

  it('reports a plugin failure as an error', async () => {
    signIn.mockRejectedValue(new Error('No presenting view controller'));
    const { signInWithGoogle } = await load();
    await expect(signInWithGoogle()).resolves.toEqual({ ok: false, error: 'No presenting view controller' });
    expect(loginProvider).not.toHaveBeenCalled();
  });

  it('is not signed in when the server rejects the token', async () => {
    loginProvider.mockRejectedValue(new Error('Wrong audience'));
    const { signInWithGoogle } = await load();
    await expect(signInWithGoogle()).resolves.toEqual({ ok: false, error: 'Wrong audience' });
    expect(setAccount).not.toHaveBeenCalled();
  });
});

describe('signInWithGoogle through Supabase (no iOS client id)', () => {
  it("opens Supabase's Google authorize page with the loopback return", async () => {
    const { signInWithGoogle, SUPABASE_AUTH_URL } = await load();
    await signInWithGoogle();
    expect(signIn).not.toHaveBeenCalled();
    const o = openAuth.mock.calls[0][0] as { url: string; scheme: string; loopbackPort: number };
    const url = new URL(o.url);
    expect(`${url.origin}${url.pathname}`).toBe(`${SUPABASE_AUTH_URL}/authorize`);
    expect(url.searchParams.get('provider')).toBe('google');
    expect(url.searchParams.get('redirect_to')).toBe('http://localhost:3000');
    expect(o.scheme).toBe('com.ringoesim.app');
    expect(o.loopbackPort).toBe(3000);
  });

  it('hands the session token from the callback fragment to the server', async () => {
    const { signInWithGoogle } = await load();
    await expect(signInWithGoogle()).resolves.toEqual({ ok: true, email: 'server@example.com' });
    expect(loginProvider).toHaveBeenCalledWith('supabase', 'supabase.access.token', '');
    expect(setAccount).toHaveBeenCalledWith({ userId: 'user-1', t: 'tok-1', email: 'server@example.com', purchaseRef: null });
  });

  it.each([
    ['the sheet was dismissed', { cancelled: true }],
    ['no callback came back', {}],
  ])('is cancelled, with nothing sent to the server, when %s', async (_name, result) => {
    openAuth.mockResolvedValue(result);
    const { signInWithGoogle } = await load();
    await expect(signInWithGoogle()).resolves.toEqual({ ok: false, cancelled: true });
    expect(loginProvider).not.toHaveBeenCalled();
  });

  it("shows the provider's own error from the callback (fragment or query)", async () => {
    const { signInWithGoogle } = await load();
    openAuth.mockResolvedValue({ callback: 'com.ringoesim.app://auth#error=access_denied&error_description=Access+was+denied' });
    await expect(signInWithGoogle()).resolves.toEqual({ ok: false, error: 'Access was denied' });
    openAuth.mockResolvedValue({ callback: 'com.ringoesim.app://auth?error=server_error&error_description=Try+again+later' });
    await expect(signInWithGoogle()).resolves.toEqual({ ok: false, error: 'Try again later' });
    expect(loginProvider).not.toHaveBeenCalled();
  });

  it('fails, with nothing sent to the server, when the callback carries no token', async () => {
    openAuth.mockResolvedValue({ callback: 'com.ringoesim.app://auth' });
    const { signInWithGoogle } = await load();
    await expect(signInWithGoogle()).resolves.toEqual({ ok: false, error: 'Google did not complete the sign-in.' });
    expect(loginProvider).not.toHaveBeenCalled();
  });

  // Regression: `new URL(callback)` sat outside the try, so a callback that
  // is not a URL rejected the whole sign-in instead of answering { ok: false }.
  it.each(['not a url', '://', 'access_token=abc'])('fails cleanly, never rejects, on the malformed callback %j', async (callback) => {
    openAuth.mockResolvedValue({ callback });
    const { signInWithGoogle } = await load();
    await expect(signInWithGoogle()).resolves.toEqual({ ok: false, error: 'Google did not complete the sign-in.' });
    expect(loginProvider).not.toHaveBeenCalled();
    expect(setAccount).not.toHaveBeenCalled();
  });

  it('reports a plugin failure as an error', async () => {
    openAuth.mockRejectedValue(new Error('Port 3000 is in use'));
    const { signInWithGoogle } = await load();
    await expect(signInWithGoogle()).resolves.toEqual({ ok: false, error: 'Port 3000 is in use' });
  });

  it('is not signed in when the server rejects the session', async () => {
    loginProvider.mockRejectedValue(new Error('Session expired'));
    const { signInWithGoogle } = await load();
    await expect(signInWithGoogle()).resolves.toEqual({ ok: false, error: 'Session expired' });
    expect(setAccount).not.toHaveBeenCalled();
  });
});

describe('availability', () => {
  it('Apple sign-in is offered only in the native iOS app', async () => {
    const { appleSignInAvailable } = await load();
    expect(appleSignInAvailable()).toBe(true);
    h.platform = 'android';
    expect(appleSignInAvailable()).toBe(false);
    h.platform = 'ios';
    h.native = false;
    expect(appleSignInAvailable()).toBe(false);
  });

  it('Google sign-in is offered on iOS once a client id or the site flag turns it on', async () => {
    const { googleSignInAvailable } = await load();
    expect(googleSignInAvailable()).toBe(false);
    h.flags = { google_signin: true };
    expect(googleSignInAvailable()).toBe(true);
    h.flags = { google_ios_client_id: 'site-client' };
    expect(googleSignInAvailable()).toBe(true);
    h.native = false;
    expect(googleSignInAvailable()).toBe(false);
  });
});
