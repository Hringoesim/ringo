// light.ts — the app's client for ringoesim.com. The website's backend is the
// only backend: it holds the catalogue, mints the Stripe Checkout, fulfils
// the eSIM with the supplier and answers what a buyer owns. The app never
// computes a price or decides a payment is done on its own; it asks.
//
// Endpoints (all on ringoesim.com/api, CORS allows capacitor://localhost):
//   GET  esim-plans?summary=1              from-prices per destination
//   GET  esim-plans?destination=<id>       the plans of one destination
//   POST esim-checkout                     -> { url } hosted Stripe Checkout
//   GET  light-status?session=cs_…         paid? (Stripe's own word) + owner
//   GET  esim-subscription?user&t[&usage=1][&install=cs_…]
//   POST esim-subscription                 resend_install | report_problem
//   POST lead                              email -> { id, t } (find my eSIM)
import { log } from '../lib/log';

export const SITE = 'https://ringoesim.com';
const API = `${SITE}/api`;

export type Currency = 'eur' | 'usd';

export interface Plan {
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
}

export interface Summary {
  from: Record<string, number>;
  currency: Currency;
}

export interface Status {
  kind: string;
  status: string;
  paid: boolean;
  pending: boolean;
  delivered: boolean;
  row_status: string | null;
  user_id?: string;
  t?: string;
  plan?: string;
  destination?: string;
  amount_cents?: number;
  currency?: string;
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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers || {}) },
  });
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

  /** Mint a hosted Checkout for a plan; the app opens the URL in the system sheet. */
  checkout: (body: { plan: string; destination: string; data_gb?: number | null; email: string; device?: string; currency?: Currency }) =>
    request<{ url: string }>('/esim-checkout', {
      method: 'POST',
      body: JSON.stringify({ ...body, client: 'app' }),
    }),

  status: (session: string) => request<Status>(`/light-status?session=${encodeURIComponent(session)}`),

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

  /** The website's own account handle for an email: the signup row and its token. */
  lead: (email: string) =>
    request<{ ok: boolean; id: string; t?: string }>('/lead', {
      method: 'POST',
      body: JSON.stringify({ email, attribution: { utm_source: 'ios_app' } }),
    }),
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
