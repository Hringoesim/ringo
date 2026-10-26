// light.ts — the app's client for ringoesim.com. The website's backend is the
// only backend: it holds the catalogue, records App Store purchases, fulfils
// the eSIM with the supplier and answers what a buyer owns. The app never
// computes a price or decides a payment is done on its own; it asks.
//
// Endpoints (all on ringoesim.com/api, CORS allows capacitor://localhost):
//   GET  esim-plans?summary=1              from-prices per destination
//   GET  esim-plans?destination=<id>&app=1 the plans of one destination (+ app_plans)
//   POST app-purchase                      a StoreKit signed transaction -> eSIM
//   GET  esim-subscription?user&t[&usage=1][&install=apple:…]
//   POST esim-subscription                 resend_install | report_problem
//   POST app-login                         email -> code by email -> { user_id, t }
//   GET  app-profile?user&t                badges + Ringo status (the loyalty ladder)
//   GET  app-usage?user&t                  data used per eSIM and per day
//   POST app-push-register?user&t          this phone's APNs token and the two push switches
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
  /** Ringo Rewards: present when this is a member price (the usual one, and the level's percentage). */
  list_monthly_amount?: number;
  member_pct?: number;
  /** App Store only day passes (app_plans): the family, the GB a day at full speed, and the flag. */
  group?: 'day' | 'power' | 'super';
  daily_gb?: number;
  /** The speed once the day's allowance is used ("1 Mbps"), when the supplier states it. */
  after_speed?: string | null;
  /** The line in its list that keeps Ringo the most per sale (app catalogue only). */
  best_margin?: boolean;
  app_only?: boolean;
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
  /** Every country a regional plan works in (flag and name). */
  coverage?: { countries: number; list: { iso: string; name: string; flag: string }[] };
  sizes: number[];
  default_data_gb: number;
  unlimited_line: string;
  default_plan: string;
  default_unlimited_plan: string;
  plans: Plan[];
  /** App Store only day passes, where the supplier sells them (asked with app=1). */
  app_plans?: Plan[];
  from_amount: number;
  top_ups: TopUp[];
  /** Global's meter (the website tops it up at 90%); its presence makes the plan read as unlimited. */
  meter_topups?: { at_percent: number; data_gb: number; annual: number; monthly: number; currency: Currency } | null;
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
export interface RewardLevel { id: string; name: string; min: number; credit_pct?: number; discount_pct: number; topup_pct?: number; free_esims_per_year: number; perks: string[] }
/** An earnable badge: earned, or how far along (have of need). Recognition only. */
export interface Achievement { id: string; group: string; name: string; how: string; have: number; need: number; earned: boolean; /** Ringo coins (owner 2026-10-26): paid once when earned, 100 coins = EUR 1 credit. */ rarity?: 'common' | 'rare' | 'epic' | 'super'; coins?: number }
export interface Profile {
  email: string;
  member_since: string | null;
  badges: TravelBadge[];
  stats: { destinations: number; plans: number; countries_reachable: number; paid_months: number };
  /** Ringo Rewards, by destinations booked (absent on an older site). */
  rewards?: { destinations: number; /** Progress counts this many months back (12 since 2026-10-25). */ window_months?: number; booked?: number; global_months?: number; global_pct?: number; global_tenure?: { months: number; pct: number }[]; level: RewardLevel | null; next: { id: string; name: string; min: number; to_go: number } | null; levels: RewardLevel[] };
  /** Ringo credit in EUR cents, earned back on every plan by level (absent on an older site). */
  credit?: { balance_cents: number; earned_cents: number; spent_cents: number; pct: number; currency: 'eur' };
  /** Ringo Pioneer (absent or null when not one): how they became one and the rung's name. Never the Pioneer number. */
  pioneer?: { kind: 'backer' | 'promoter' | 'global'; tier: string; credit_eur?: number } | null;
  /** The badges to earn (absent on an older site). */
  achievements?: Achievement[];
  /** Share with 3 friends: EUR credit for every `per` friends who bought through the link (absent on an older site). */
  referral?: { code: string | null; link: string | null; friends_bought: number; per: number; credit_cents: number; earned: number };
  loyalty: { paid_months: number; tier: LoyaltyTier & { next: { id: string; name: string; min: number; to_go: number } | null }; tiers: LoyaltyTier[] };
}

export interface UsageEsim {
  id: string;
  destination: string;
  label: string;
  flag: string | null;
  unlimited: boolean;
  status: string;
  bought_at: string | null;
  ends_at: string | null;
  allowance_mb: number | null;
  remaining_mb: number | null;
  used_mb: number | null;
  checked_at: string | null;
}
export interface Usage {
  esims: UsageEsim[];
  /** the last 30 days with data, oldest first */
  daily: { day: string; used_mb: number }[];
  totals: { used_mb: number; days_online: number };
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
  /** The row's id (owner's view): names the eSIM a top-up is for. */
  id?: string | null;
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
  /** Who bills the renewal: a card (turned off here, setRenewal) or Apple (iOS Settings). */
  billing?: 'card' | 'apple' | null;
  renewal_off?: boolean;
}

export interface SubscriptionRead {
  subscription: Subscription | null;
  destination?: { id: string; label: string; kind: string };
  top_ups?: TopUp[];
  usage?: { data_remaining_mb: number | null; unlimited: boolean; package_status: string | null; expires_at: string | null } | { unavailable: true };
  install?: { apple_url: string; lpa: string };
  /** Ringo Rewards: Global kept long enough to earn a cheaper month. */
  rewards_global?: { pct: number; months: number; product_id: string | null };
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
    // cache: 'no-store': every answer comes from the site, never from a
    // copy WKWebView kept (the catalogue says max-age=60 to browsers). What
    // is sold and for how much must be what the site says right now.
    res = await fetch(`${API}${path}`, {
      cache: 'no-store',
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

/** /api/light-status for a hosted Checkout session. */
export interface CardStatus { status: string; paid: boolean; pending: boolean; delivered?: boolean; user_id?: string; t?: string }

export const light = {
  summary: () => request<Summary>('/esim-plans?summary=1'),
  /** With the member's account, plans carry their Ringo Rewards price and its App Store product. */
  catalog: (destination: string, member?: { userId: string; t: string } | null) =>
    request<Catalog>(`/esim-plans?${new URLSearchParams({ destination, app: '1', ...(member ? { user: member.userId, t: member.t } : {}) }).toString()}`),

  /** Report an App Store purchase; the site verifies Apple's signature and issues the eSIM. */
  appPurchase: (body: { signedTransaction: string; plan: string; destination: string; data_gb?: number | null; email: string }) =>
    request<PurchaseRecord>('/app-purchase', { method: 'POST', body: JSON.stringify(body) }),

  /** Hosted Stripe Checkout (the app's old card path; the app now pays in its own sheet, appPay). */
  cardCheckout: (body: { plan: string; destination: string; data_gb?: number | null; email: string; currency?: string; user?: string; t?: string }) =>
    request<{ url: string; id?: string }>('/esim-checkout', { method: 'POST', body: JSON.stringify({ ...body, client: 'app', device: 'iPhone app' }) }),
  /** Stripe's own word on that session: paid, and once the site has the row, whose account it is. */
  cardStatus: (ref: { pi: string } | { sub: string }) => request<CardStatus>(`/light-status?${new URLSearchParams(ref as Record<string, string>).toString()}`),
  /** The app's own payment sheet (api/app-pay.js): the intent for the line the app showed. */
  appPay: (body: { plan: string; destination: string; data_gb?: number | null; email: string; currency?: string; user?: string; t?: string; topUp?: boolean; subscription?: string; use_credit?: boolean }) =>
    request<{ client_secret: string; mode: 'payment' | 'subscription'; amount: number; currency: string; label: string; payment_intent_id?: string; subscription_id?: string; publishable_key: string | null; credit_off?: number; list_amount?: number }>('/app-pay', { method: 'POST', body: JSON.stringify({ ...body, client: 'app' }) }),

  /** "Restore purchases": the owner of a purchase the site already knows (404 otherwise). */
  restorePurchase: (signedTransaction: string) =>
    request<PurchaseRecord>('/app-purchase', { method: 'POST', body: JSON.stringify({ signedTransaction, restore: true }) }),

  subscription: (userId: string, t: string, opts: { usage?: boolean; install?: string | null } = {}) => {
    const q = new URLSearchParams({ user: userId, t });
    if (opts.usage) q.set('usage', '1');
    if (opts.install) q.set('install', opts.install);
    return request<SubscriptionRead>(`/esim-subscription?${q.toString()}`);
  },

  /** A card subscription's renewal off or back on (Stripe cancel_at_period_end; the paid month runs on). */
  setRenewal: (userId: string, t: string, on: boolean) =>
    request<{ ok: boolean; renewal_off: boolean; ends_at: string | null }>(
      `/esim-subscription?${new URLSearchParams({ user: userId, t }).toString()}`,
      { method: 'POST', body: JSON.stringify({ action: 'renewal', on }) },
    ),
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
  /** While the code screen waits: did the code email bounce (an address that does not exist)? */
  loginCheck: (email: string) =>
    request<{ ok: boolean; bounced: boolean; error?: string }>('/app-login', { method: 'POST', body: JSON.stringify({ email, check: true }) }),
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

  /** Apple's promotional offer for Global's kept-month price, signed for this account. */
  rewardsOffer: (userId: string, t: string, productId: string) =>
    request<{ available: boolean; reason?: string; pct?: number; offer?: { offerId: string; keyId: string; nonce: string; timestamp: number; signature: string } }>(
      `/app-offer?${new URLSearchParams({ user: userId, t }).toString()}`,
      { method: 'POST', body: JSON.stringify({ productId }) },
    ),

  /** Data used per eSIM and per day, from the figures the site already stored. */
  usage: (userId: string, t: string) =>
    request<Usage>(`/app-usage?${new URLSearchParams({ user: userId, t }).toString()}`),

  /** This phone's push token and the member's switches; the site is the sender. */
  pushRegister: (userId: string, t: string, body: { token: string; environment: 'production' | 'sandbox'; service_ok: boolean; offers_ok: boolean; app_version?: string; country?: string }) =>
    request<{ ok: boolean; service_ok: boolean; offers_ok: boolean }>(
      `/app-push-register?${new URLSearchParams({ user: userId, t }).toString()}`,
      { method: 'POST', body: JSON.stringify(body) },
    ),

  loginVerify: (email: string, code: string) =>
    request<{ ok: boolean; user_id: string; t: string; email: string }>('/app-login', { method: 'POST', body: JSON.stringify({ email, code }) }),

  // ── The full Ringo service (not launched): its waitlist and survey ──────
  // The same endpoints the website's dashboard uses. The token rides in the
  // query or body, never a header.
  /** The member's waitlist row (place in line, survey answers) and the live counts. */
  dashboard: (userId: string, t: string) =>
    request<WaitlistDashboard>(`/dashboard?${new URLSearchParams({ user: userId, t }).toString()}`),
  /** Joins the waitlist (lead -> waitlist_active). Idempotent; one welcome email. */
  joinWaitlist: (userId: string, email: string, t: string) =>
    request<{ ok: boolean; activated?: boolean; t?: string }>('/waitlist', { method: 'POST', body: JSON.stringify({ user_id: userId, email, t }) }),
  /**
   * Saves survey answers. The database keeps a stored value only when NULL
   * is sent: an empty array OVERWRITES. Always send the full current state
   * of every field the screen shows, loaded from dashboard() first.
   */
  saveProfile: (body: ProfileAnswers & { user_id: string; t: string }) =>
    request<{ ok: boolean; credited?: boolean }>('/profile', { method: 'POST', body: JSON.stringify(body) }),
};

/** The survey's six answers, as /api/profile stores them (ISO2 codes, English strings). */
export interface ProfileAnswers {
  name: string | null;
  phone_country: string | null;
  extra_phone_countries: string[];
  no_second_number: boolean;
  travel_countries: string[];
  travel_regions: string[];
  top_values: string[];
}

export type SignupStatus = 'lead' | 'waitlist_active' | 'pending_payment' | 'payment_failed' | 'pioneer_active' | 'promoter_pioneer';

export interface WaitlistUser {
  id?: string;
  email?: string | null;
  status?: SignupStatus | string | null;
  name?: string | null;
  phone_country?: string | null;
  extra_phone_countries?: string[] | null;
  no_second_number?: boolean | null;
  travel_countries?: string[] | null;
  travel_regions?: string[] | null;
  top_values?: string[] | null;
  queue_ahead?: number | null;
  queue_behind?: number | null;
  profile_answers?: number | null;
  profile_questions?: number | null;
  free_referrals_count?: number | null;
  pioneer_referrals_count?: number | null;
  referral_code?: string | null;
}

export interface WaitlistDashboard {
  user: WaitlistUser;
  stats?: { waitlisters?: number; pioneers?: number } | null;
}

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
