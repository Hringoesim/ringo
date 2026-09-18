// auth.ts — the two system sign-ins the app offers next to the email code
// (owner 2026-09-17): Sign in with Apple and Google. Each hands an identity
// token to ringoesim.com (/api/app-login, provider branch), which verifies
// it and opens the same account the email code opens. The nonce made here
// is sent to the provider and checked by the server, so a token cannot be
// replayed into another login.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { light } from '../api/light';
import { account } from '../store/account';
import { flags } from '../store/flags';

interface SignInWithApplePlugin {
  authorize(o: { nonce?: string }): Promise<{ response: { identityToken: string; user: string; email?: string; givenName?: string; familyName?: string } }>;
}
interface GoogleSignInPlugin {
  signIn(o: { clientId: string; nonce?: string }): Promise<{ idToken?: string; accessToken?: string; nonce?: string; cancelled?: boolean }>;
  openAuth(o: { url: string; scheme: string; loopbackPort?: number }): Promise<{ callback?: string; cancelled?: boolean }>;
}
const Apple = registerPlugin<SignInWithApplePlugin>('SignInWithApple');
const Google = registerPlugin<GoogleSignInPlugin>('GoogleSignIn');

export const GOOGLE_IOS_CLIENT_ID = (import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as string | undefined) || '';
// Ringo's Supabase project "APP3" already has Google (and Apple) sign-in
// configured, so Google needs no client of its own here: the system sheet
// opens Supabase's authorize page, Supabase talks to Google, and the session
// comes back to the app. Supabase only redirects to its Site URL,
// http://localhost:3000 (the redirect list is the owner's dashboard), so
// while the sheet is open the app itself answers on that port and forwards
// the session to its own scheme (RFC 8252 loopback, GoogleSignInPlugin).
// ringoesim.com then reads the account's email from the session
// (/api/app-login, provider "supabase").
export const SUPABASE_AUTH_URL = 'https://swfojlhulsgivzrxqtkv.supabase.co/auth/v1';
export const AUTH_LOOPBACK_PORT = 3000;
export const AUTH_RETURN = `http://localhost:${AUTH_LOOPBACK_PORT}`;
export const appleSignInAvailable = (): boolean => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
export const googleSignInAvailable = (): boolean => appleSignInAvailable() && (Boolean(GOOGLE_IOS_CLIENT_ID) || flags.get().google_signin === true);

function nonce(): string {
  const b = new Uint8Array(24); crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
}
async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((x) => x.toString(16).padStart(2, '0')).join('');
}

export type SignInResult = { ok: true; email: string } | { ok: false; cancelled: true } | { ok: false; cancelled?: false; error: string };

/** Apple's sheet, then the account. Apple gets the SHA-256 of the nonce; the server checks the raw one. */
export async function signInWithApple(): Promise<SignInResult> {
  const raw = nonce();
  let token: string;
  try {
    const { response } = await Apple.authorize({ nonce: await sha256Hex(raw) });
    token = response.identityToken;
  } catch (e) {
    const msg = String((e as Error)?.message || e);
    if (/cancel/i.test(msg) || /1001/.test(msg)) return { ok: false, cancelled: true };
    return { ok: false, error: 'Apple did not complete the sign-in.' };
  }
  return finish('apple', token, raw);
}

/** Google's sheet (system browser), then the account: through Supabase, or straight to Google when an iOS client is configured. */
export async function signInWithGoogle(): Promise<SignInResult> {
  if (!GOOGLE_IOS_CLIENT_ID) return signInWithGoogleViaSupabase();
  const raw = nonce();
  let token: string;
  try {
    const r = await Google.signIn({ clientId: GOOGLE_IOS_CLIENT_ID, nonce: raw });
    if (r.cancelled || !r.idToken) return { ok: false, cancelled: true };
    token = r.idToken;
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message || 'Google did not complete the sign-in.') };
  }
  return finish('google', token, raw);
}

async function signInWithGoogleViaSupabase(): Promise<SignInResult> {
  const url = `${SUPABASE_AUTH_URL}/authorize?${new URLSearchParams({ provider: 'google', redirect_to: AUTH_RETURN }).toString()}`;
  let callback: string;
  try {
    const r = await Google.openAuth({ url, scheme: 'com.ringoesim.app', loopbackPort: AUTH_LOOPBACK_PORT });
    if (r.cancelled || !r.callback) return { ok: false, cancelled: true };
    callback = r.callback;
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message || 'Google did not complete the sign-in.') };
  }
  // Supabase returns the session in the fragment (implicit flow); an error comes as query or fragment fields.
  const u = new URL(callback);
  const params = new URLSearchParams(u.hash.startsWith('#') ? u.hash.slice(1) : u.search.slice(1));
  const token = params.get('access_token');
  if (!token) return { ok: false, error: params.get('error_description') || 'Google did not complete the sign-in.' };
  return finish('supabase', token, '');
}

async function finish(provider: 'apple' | 'google' | 'supabase', token: string, raw: string): Promise<SignInResult> {
  try {
    const r = await light.loginProvider(provider, token, raw);
    account.set({ userId: r.user_id, t: r.t, email: r.email, purchaseRef: null });
    return { ok: true, email: r.email };
  } catch (e) {
    return { ok: false, error: (e as Error).message || 'Could not open the account.' };
  }
}
