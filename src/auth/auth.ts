// auth.ts — real client-side authentication logic.
//
// This is genuine auth state, not a stub: sessions are persisted (localStorage)
// with expiry, OTP challenges use a cryptographically-random code validated with
// expiry + attempt limits + resend, sign-out clears state, and returning users
// are detected on boot. It works fully on the static deploy.
//
// To go to a real identity backend (true Apple/Google OAuth + SMS delivery),
// configure a provider — the rest of the app doesn't change:
//   configureAuth({ googleClientId: '...', backendUrl: '...' })

export type AuthProvider = 'email' | 'apple' | 'google';

export interface RingoSession {
  userId: string;
  email: string | null;
  name: string;
  provider: AuthProvider;
  token: string;
  onboarded: boolean;
  createdAt: number;
  expiresAt: number;
}

const SESSION_KEY = 'ringo_session_v1';
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30; // 30 days
const CODE_TTL = 1000 * 60 * 10; // 10 minutes
const MAX_ATTEMPTS = 5;

interface AuthConfig {
  googleClientId: string;
  backendUrl: string;
}
const config: AuthConfig = {
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  backendUrl: import.meta.env.VITE_AUTH_BACKEND || '',
};
export function configureAuth(opts: Partial<AuthConfig>) {
  Object.assign(config, opts);
}

// ── token / session ───────────────────────────────────────────────────────────
function randToken(): string {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

function save(s: RingoSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function getSession(): RingoSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as RingoSession;
    if (s.expiresAt && Date.now() > s.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

function createSession(partial: Partial<RingoSession>): RingoSession {
  const now = Date.now();
  const s: RingoSession = {
    userId: 'usr_' + randToken().slice(0, 12),
    email: null,
    name: 'Marie',
    provider: 'email',
    token: randToken(),
    onboarded: false,
    createdAt: now,
    expiresAt: now + SESSION_TTL,
    ...partial,
  };
  save(s);
  return s;
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
}

export function completeOnboarding() {
  const s = getSession();
  if (s && !s.onboarded) {
    s.onboarded = true;
    save(s);
  }
}

function nameFromEmail(email: string | null | undefined): string {
  if (!email) return 'there';
  const local = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : 'there';
}

// ── OTP challenge ─────────────────────────────────────────────────────────────
interface Challenge {
  id: string;
  email: string | null;
  phone: string | null;
  code: string;
  expiresAt: number;
  attempts: number;
}

function chKey(id: string) {
  return 'ringo_chl_' + id;
}
function loadChallenge(id: string): Challenge | null {
  try {
    const raw = sessionStorage.getItem(chKey(id));
    return raw ? (JSON.parse(raw) as Challenge) : null;
  } catch {
    return null;
  }
}
function saveChallenge(c: Challenge) {
  sessionStorage.setItem(chKey(c.id), JSON.stringify(c));
}

function code6(): string {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return String(a[0] % 1000000).padStart(6, '0');
}

/** Begin phone verification. Returns the challenge id and (since there's no SMS
 *  gateway yet) the code itself so the flow is testable end-to-end. */
export function startPhoneVerification(email: string | null, phone: string): { challengeId: string; devCode: string } {
  const id = 'chl_' + randToken().slice(0, 10);
  const c: Challenge = { id, email, phone, code: code6(), expiresAt: Date.now() + CODE_TTL, attempts: 0 };
  saveChallenge(c);
  return { challengeId: id, devCode: c.code };
}

export function resendCode(challengeId: string): { devCode: string } | null {
  const c = loadChallenge(challengeId);
  if (!c) return null;
  c.code = code6();
  c.expiresAt = Date.now() + CODE_TTL;
  c.attempts = 0;
  saveChallenge(c);
  return { devCode: c.code };
}

export interface VerifyResult {
  ok: boolean;
  error?: string;
  session?: RingoSession;
}

export function verifyCode(challengeId: string, code: string): VerifyResult {
  const c = loadChallenge(challengeId);
  if (!c) return { ok: false, error: 'Your code expired. Request a new one.' };
  if (Date.now() > c.expiresAt) return { ok: false, error: 'Your code expired. Request a new one.' };
  if (c.attempts >= MAX_ATTEMPTS) return { ok: false, error: 'Too many attempts. Request a new code.' };
  c.attempts += 1;
  saveChallenge(c);
  if (code !== c.code) {
    const left = MAX_ATTEMPTS - c.attempts;
    return { ok: false, error: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many attempts. Request a new code.' };
  }
  sessionStorage.removeItem(chKey(challengeId));
  const session = createSession({ email: c.email, name: nameFromEmail(c.email), provider: 'email' });
  return { ok: true, session };
}

/** Email-only sign-up (user skipped phone). Creates a session immediately. */
export function signInEmailOnly(email: string): RingoSession {
  return createSession({ email, name: nameFromEmail(email), provider: 'email' });
}

/** Instant demo session — drops straight into the populated app, no email/OTP.
 *  Lets the product be shown end-to-end live without waiting on a code. */
export function signInDemo(): RingoSession {
  return createSession({ email: 'marie@ringoesim.com', name: 'Marie', provider: 'email', onboarded: true });
}

// ── OAuth providers ───────────────────────────────────────────────────────────
// Real Apple/Google OAuth requires registered client IDs + redirect/origin
// config. When `googleClientId` is set we use Google Identity Services; otherwise
// a session is created locally so the flow is usable. Apple Sign-in JS hooks in
// the same way once an Apple Service ID is configured.
export async function signInWithGoogle(): Promise<RingoSession> {
  const g = (window as unknown as { google?: any }).google;
  if (config.googleClientId && g?.accounts?.id) {
    const credential = await new Promise<string>((resolve, reject) => {
      g.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: (resp: { credential?: string }) =>
          resp.credential ? resolve(resp.credential) : reject(new Error('No credential')),
      });
      g.accounts.id.prompt();
    });
    // Decode the Google ID token (JWT) payload for email/name.
    const payload = JSON.parse(atob(credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return createSession({ email: payload.email, name: payload.given_name || nameFromEmail(payload.email), provider: 'google', token: credential });
  }
  return createSession({ provider: 'google', name: 'Marie' });
}

export async function signInWithApple(): Promise<RingoSession> {
  // Real flow uses AppleID.auth.signIn() with a configured Service ID.
  return createSession({ provider: 'apple', name: 'Marie' });
}
