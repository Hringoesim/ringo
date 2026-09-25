// light.ts — the app's client for ringoesim.com. The website's backend is the
// only backend: it holds the catalogue, records App Store purchases, fulfils
// the eSIM with the supplier and answers what a buyer owns. The app never
// computes a price or decides a payment is done on its own; it asks.
//
// Endpoints (all on ringoesim.com/api, CORS allows capacitor://localhost):
//   GET  esim-plans?summary=1              from-prices per destination
//   GET  esim-plans?destination=<id>       the plans of one destination
//   POST app-purchase                      a StoreKit signed transaction -> eSIM
//   GET  esim-subscription?user&t[&usage=1][&install=apple:…]
//   POST esim-subscription                 resend_install | report_problem
//   POST app-login                         email -> code by email -> { user_id, t }
import { log } from '../lib/log';

export const SITE = 'https://ringoesim.com';
const API = `${SITE}/api`;

export type Currency = 'eur' | 'usd';

export interface Plan {
  /** the App Store product that sells this line (null = not sold in the app) */
  apple_product_id: string | null;
  plan: string;
  tier: 'data' | 'unlimited';
  data_gb: number | null;
  label: string;
  term_months: number;
  days: number;
  mode: 'payment' | 'subscription';
  monthly_amount: number;
  billed_upfront_amount: number;
  currency: Currency;
  allowance?: string;
  recommended: boolean;
}

export interface TopUp {
  apple_product_id: string | null;
  plan: string;
  label: string;
  data_gb: number;
  amount: number;
  currency: Currency;
  validity_days: number;
}

export interface Catalog {
  currency: Currency;
  destination: { id: string; label: string; kind: string; countries: number; coverage_line: string; data_gb: number };
  sizes: number[];
  default_data_gb: number;
  unlimited_line: string;
  default_plan: string;
  default_unlimited_plan: string;
  plans: Plan[];
  from_amount: number;
  top_ups: TopUp[];
  /** switches for the app, see store/flags.ts */
  app_flags?: { google_signin?: boolean };
  /** every destination the site sells */
  destinations: { id: string; label: string; kind: string; countries?: number; iso?: string | null; region?: string | null }[];
}

export interface TravelBadge {
  destination: string;
  label: string;
  kind: 'region' | 'country';
  iso: string | null;
  flag: string | null;
  region: string | null;
  countries: number;
  first_at: string | null;
  last_at: string | null;
  plans: number;
  active: boolean;
}
export interface LoyaltyTier { id: string; name: string; min: number; perk: string }
export interface Profile {
  email: string;
  member_since: string | null;
  badges: TravelBadge[];
  stats: { destinations: number; plans: number; countries_reachable: number; paid_months: number };
  loyalty: { paid_months: number; tier: LoyaltyTier & { next: { id: string; name: string; min: number; to_go: number } | null }; tiers: LoyaltyTier[] };
}

export interface Summary {
  from: Record<string, number>;
  currency: Currency;
  /** Per destination, the App Store product ids of its cheapest offer on each term (absent on an older site). */
  from_lines?: Record<string, string[]>;
}

export interface PurchaseRecord {
  ok: boolean;
  environment: 'Production' | 'Sandbox';
  transaction_id: string;
  subscription_id: string | null;
  delivered: boolean;
  replay?: boolean;
  user_id?: string;
  t?: string;
  /** The buyer's email, so a restored phone can top up without a sign-in. */
  email?: string;
}

export interface Subscription {
  plan: string;
  plan_label: string;
  status: string;
  cycles_used: number;
  cycles_total: number;
  cycles_remaining: number;
  current_cycle_started_at: string | null;
  current_cycle_ends_at: string | null;
  esim_attached: boolean;
  provisioned: boolean;
}

export interface SubscriptionRead {
  subscription: Subscription | null;
  destination?: { id: string; label: string; kind: string };
  top_ups?: TopUp[];
  usage?: { data_remaining_mb: number | null; unlimited: boolean; package_status: string | null; expires_at: string | null } | { unavailable: true };
  install?: { apple_url: string; lpa: string };
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// No timeout and a network that accepts the connection then answers nothing
// leaves every button spinning for ever, which is what a proxied review
// network looks like. WKWebView also throws the bare string "Load failed"
// offline, which callers were showing to people verbatim.
const TIMEOUT_MS = 20000;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers || {}) },
    });
  } catch (err) {
    const timedOut = (err as Error)?.name === 'TimeoutError';
    log.warn('api', `${path} -> ${timedOut ? 'timed out' : 'no connection'}`);
    throw new ApiError(
      timedOut ? 'Ringo took too long to answer. Try again in a moment.' : 'No connection to Ringo. Check your internet and try again.',
      0,
    );
  }
  const body = (await res.json().catch(() => null)) as (T & { error?: string; message?: string }) | null;
  if (!res.ok) {
    const msg = (body && (body.message || body.error)) || `Request failed (${res.status})`;
    log.warn('api', `${path} -> ${res.status} ${msg}`);
    throw new ApiError(msg, res.status);
  }
  return body as T;
}

export const light = {
  summary: () => request<Summary>('/esim-plans?summary=1'),
  catalog: (destination: string) => request<Catalog>(`/esim-plans?destination=${encodeURIComponent(destination)}`),

  /** Report an App Store purchase; the site verifies Apple's signature and issues the eSIM. */
  appPurchase: (body: { signedTransaction: string; plan: string; destination: string; data_gb?: number | null; email: string }) =>
    request<PurchaseRecord>('/app-purchase', { method: 'POST', body: JSON.stringify(body) }),

  /** "Restore purchases": the owner of a purchase the site already knows (404 otherwise). */
  restorePurchase: (signedTransaction: string) =>
    request<PurchaseRecord>('/app-purchase', { method: 'POST', body: JSON.stringify({ signedTransaction, restore: true }) }),

  subscription: (userId: string, t: string, opts: { usage?: boolean; install?: string | null } = {}) => {
    const q = new URLSearchParams({ user: userId, t });
    if (opts.usage) q.set('usage', '1');
    if (opts.install) q.set('install', opts.install);
    return request<SubscriptionRead>(`/esim-subscription?${q.toString()}`);
  },

  resendInstall: (userId: string, t: string) =>
    request<{ ok: boolean; throttled?: boolean; retry_after_seconds?: number; sent_to?: string }>(
      `/esim-subscription?${new URLSearchParams({ user: userId, t }).toString()}`,
      { method: 'POST', body: JSON.stringify({ action: 'resend_install' }) },
    ),

  reportProblem: (userId: string, t: string, body: { reason: string; message: string; device?: string }) =>
    request<{ ok: boolean; case_opened?: boolean; throttled?: boolean }>(
      `/esim-subscription?${new URLSearchParams({ user: userId, t }).toString()}`,
      { method: 'POST', body: JSON.stringify({ action: 'report_problem', ...body }) },
    ),

  /** The signup row for an email (created if new): its id rides on a purchase as Apple's appAccountToken. */
  lead: (email: string) =>
    request<{ ok: boolean; id: string; t?: string }>('/lead', {
      method: 'POST',
      body: JSON.stringify({ email, attribution: { utm_source: 'ios_app' } }),
    }),

  /** Sign in, step one: a six-digit code is emailed. */
  loginStart: (email: string) =>
    request<{ ok: boolean; sent: boolean; retry_after?: number }>('/app-login', { method: 'POST', body: JSON.stringify({ email }) }),
  /** Delete the account: identifiers wiped on the site, purchases kept. */
  deleteAccount: (userId: string, t: string) =>
    request<{ ok: boolean; deleted: boolean }>(`/app-account-delete?${new URLSearchParams({ user: userId, t }).toString()}`, { method: 'POST', body: '{}' }),
  /** Sign in, step two: the code opens the account. */
  /** Sign in with Apple or Google: the provider's identity token opens the same account. */
  loginProvider: (provider: 'apple' | 'google' | 'supabase', idToken: string, nonce: string) =>
    request<{ ok: boolean; user_id: string; t: string; email: string; provider: string }>('/app-login', { method: 'POST', body: JSON.stringify({ provider, id_token: idToken, nonce }) }),

  /** The profile: who is logged in and the badges of where their eSIMs have taken them. */
  profile: (userId: string, t: string) =>
    request<Profile>(`/app-profile?${new URLSearchParams({ user: userId, t }).toString()}`),

  loginVerify: (email: string, code: string) =>
    request<{ ok: boolean; user_id: string; t: string; email: string }>('/app-login', { method: 'POST', body: JSON.stringify({ email, code }) }),
};

// Mirrors REASONS in the site's api/_cy-support.js: the ids are what the
// endpoint accepts.
export const PROBLEM_REASONS: { id: string; label: string }[] = [
  { id: 'no_service', label: 'Installed, but no data connection' },
  { id: 'install_failed', label: 'The eSIM will not install' },
  { id: 'slow', label: 'Data works but is very slow' },
  { id: 'data_missing', label: 'Data bought is not showing or has stopped' },
  { id: 'other', label: 'Something else' },
];

/** "€12.99" / "$14.99" from minor units. */
export function money(minor: number, currency: Currency | string = 'eur'): string {
  const cur = String(currency || 'eur').toUpperCase();
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(minor / 100);
  } catch {
    return `${cur} ${(minor / 100).toFixed(2)}`;
  }
}
