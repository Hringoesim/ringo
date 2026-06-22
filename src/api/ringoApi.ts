// ringoApi.ts
// ─────────────────────────────────────────────────────────────────────────────
// Ringo backend integration layer.
//
// This is the SINGLE seam between the Ringo UI and a real backend. Every screen
// and flow talks to `RingoAPI.*` — never to fetch() or mock data directly.
//
// Today it runs in MOCK mode (in-memory fixtures, simulated latency) so the app
// is fully clickable with no server. To go live against a real API, make ONE
// call at boot:
//
//     RingoAPI.configure({
//       mode: 'live',
//       baseUrl: 'https://api.ringoesim.com/v1',
//       getToken: () => localStorage.getItem('ringo_jwt'),  // bearer auth
//       onUnauthorized: () => location.assign('/login'),     // optional
//     });
//
// Every method documents the HTTP endpoint it maps to in live mode. The
// request/response SHAPES are identical in mock and live mode, so screens never
// change. Swap the backend, keep the UI.
// ─────────────────────────────────────────────────────────────────────────────

import type { Country, KycStatus, PhoneNumber, Plan, Tier } from '../data/types';

interface ApiConfig {
  mode: 'mock' | 'live';
  baseUrl: string;
  getToken: () => string | null;
  onUnauthorized: (() => void) | null;
  mockLatency: number;
}

const config: ApiConfig = {
  mode: 'mock',
  baseUrl: '',
  getToken: () => null,
  onUnauthorized: null,
  mockLatency: 450,
};

interface ApiError extends Error {
  status?: number;
  detail?: unknown;
}

// ── HTTP core (live mode) ─────────────────────────────────────────────────────
async function http<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = config.baseUrl.replace(/\/$/, '') + path;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = config.getToken && config.getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && config.onUnauthorized) config.onUnauthorized();
  if (!res.ok) {
    let detail: unknown = null;
    try {
      detail = await res.json();
    } catch {
      /* ignore non-JSON error bodies */
    }
    const message =
      (detail as { message?: string })?.message || 'HTTP ' + res.status;
    const err: ApiError = new Error(message);
    err.status = res.status;
    err.detail = detail;
    throw err;
  }
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

// ── Mock helpers ──────────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function mock<T>(value: T): Promise<T> {
  await delay(config.mockLatency);
  // deep clone so callers can't mutate fixtures
  return value == null ? value : (JSON.parse(JSON.stringify(value)) as T);
}

// ── Mock fixtures (the single source of seed data) ────────────────────────────
interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  tier: Tier['id'];
  score: number;
  kycStatus: 'none' | KycStatus;
  kycStepsLeft: number;
  currentCountry: string;
  planId: string;
  paymentMethod: { brand: string; last4: string };
}

interface Usage {
  planId: string;
  fairUsePct: number;
  renewsOn: string;
  country: string;
  connected: boolean;
  invoices: { date: string; label: string; amount: string }[];
}

const DB: {
  profile: Profile;
  tiers: Tier[];
  plans: Plan[];
  countries: Country[];
  numbers: PhoneNumber[];
  usage: Usage;
} = {
  profile: {
    id: 'usr_marie',
    firstName: 'Marie',
    lastName: 'Devos',
    email: 'marie@ringoesim.com',
    tier: 'orange',
    score: 4,
    kycStatus: 'pending',
    kycStepsLeft: 1,
    currentCountry: 'JP',
    planId: 'essentials',
    paymentMethod: { brand: 'Visa', last4: '4242' },
  },

  tiers: [
    { id: 'orange',  name: 'Orange',  min: 0,  c1: '#F4A93B', c2: '#F0792E', glow: 'rgba(240,128,56,0.5)',  perk: 'Unlimited data · 180+ countries' },
    { id: 'coral',   name: 'Coral',   min: 6,  c1: '#FF8A6B', c2: '#F8506B', glow: 'rgba(248,80,96,0.5)',   perk: '+1 free local number · faster cap' },
    { id: 'crimson', name: 'Crimson', min: 15, c1: '#F8506B', c2: '#C42B6B', glow: 'rgba(196,43,107,0.5)',  perk: 'Airport lounge passes · priority support' },
    { id: 'aurora',  name: 'Aurora',  min: 30, c1: '#B36BFF', c2: '#F8506B', glow: 'rgba(179,107,255,0.5)', perk: 'Free partner upgrades · 24/7 concierge' },
  ],

  plans: [
    { id: 'essentials', name: 'Essentials', price: 19, highspeed: '15 GB',    tagline: 'For light trips & backups', feats: ['15 GB high-speed, then unlimited standard', '180+ countries', '1 number included'] },
    { id: 'plus',       name: 'Plus',       price: 35, highspeed: '50 GB',    tagline: 'For regular travelers',     feats: ['50 GB high-speed', '180+ countries', '2 numbers included', 'Personal hotspot'] },
    { id: 'pro',        name: 'Pro',        price: 59, highspeed: '150 GB',   tagline: 'For digital nomads', popular: true, feats: ['150 GB high-speed', '180+ countries', '3 numbers included', 'Priority 5G/4G+'] },
    { id: 'unlimited',  name: 'Unlimited',  price: 89, highspeed: 'Unlimited', tagline: 'No caps, ever',            feats: ['Truly unlimited 5G — no throttle', '180+ countries', '5 numbers included', 'Always-on hotspot'] },
  ],

  countries: [
    { code: 'JP', name: 'Japan',     capital: 'Tokyo',       flag: '🇯🇵', region: 'Asia',        tier: 'A', popular: true, dial: 81 },
    { code: 'PT', name: 'Portugal',  capital: 'Lisbon',      flag: '🇵🇹', region: 'Europe',      tier: 'A', popular: true, dial: 351 },
    { code: 'AE', name: 'UAE',       capital: 'Abu Dhabi',   flag: '🇦🇪', region: 'Middle East', tier: 'A', popular: true, dial: 971 },
    { code: 'MX', name: 'Mexico',    capital: 'Mexico City', flag: '🇲🇽', region: 'Americas',    tier: 'B', popular: true, dial: 52 },
    { code: 'TH', name: 'Thailand',  capital: 'Bangkok',     flag: '🇹🇭', region: 'Asia',        tier: 'B', popular: true, dial: 66 },
    { code: 'BE', name: 'Belgium',   capital: 'Brussels',    flag: '🇧🇪', region: 'Europe',      tier: 'A', dial: 32 },
    { code: 'US', name: 'USA',       capital: 'Washington',  flag: '🇺🇸', region: 'Americas',    tier: 'A', popular: true, dial: 1 },
    { code: 'SG', name: 'Singapore', capital: 'Singapore',   flag: '🇸🇬', region: 'Asia',        tier: 'A', dial: 65 },
  ],

  numbers: [
    { id: 'be', flag: '🇧🇪', country: 'Belgium', number: '+32 471 23 45 67', tag: 'Primary', active: true },
    { id: 'jp', flag: '🇯🇵', country: 'Japan',   number: '+81 80 1234 5678', tag: 'Active',  active: true },
    { id: 'us', flag: '🇺🇸', country: 'USA',     number: '+1 415 555 0123',  tag: 'Standby', active: false },
  ],

  usage: {
    planId: 'essentials',
    fairUsePct: 0.34,
    renewsOn: 'May 28',
    country: 'JP',
    connected: true,
    invoices: [
      { date: 'Apr 28', label: 'Ringo Essentials', amount: '$19.00' },
      { date: 'Apr 12', label: 'Belgium number',   amount: '$3.00' },
      { date: 'Mar 28', label: 'Ringo Essentials', amount: '$19.00' },
    ],
  },
};

export interface KycPayload {
  firstName?: string;
  lastName?: string;
  dob?: string;
  docType?: string;
  documentRef?: string;
}

export interface PortPayload {
  number: string;
  carrier: string;
  transferPin: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API — every method works identically in mock + live mode.
// ─────────────────────────────────────────────────────────────────────────────
export const RingoAPI = {
  configure(opts: Partial<ApiConfig> = {}) {
    Object.assign(config, opts);
    return this;
  },
  get mode() {
    return config.mode;
  },

  // ── AUTH ────────────────────────────────────────────────────────────────────
  // POST /auth/apple   { identityToken } → { token, profile }
  async signInWithApple(identityToken: string) {
    if (config.mode === 'live') return http('POST', '/auth/apple', { identityToken });
    return mock({ token: 'mock_jwt', profile: DB.profile });
  },
  // POST /auth/email   { email, phone } → { challengeId }
  async signUpWithEmail(email: string, phone: string | null) {
    if (config.mode === 'live') return http('POST', '/auth/email', { email, phone });
    return mock({ challengeId: 'chl_mock', sentTo: phone || email });
  },
  // POST /auth/otp/verify   { challengeId, code } → { token, profile }
  async verifyOtp(challengeId: string, code: string) {
    if (config.mode === 'live') return http('POST', '/auth/otp/verify', { challengeId, code });
    return mock({ token: 'mock_jwt', profile: DB.profile });
  },

  // ── KYC ─────────────────────────────────────────────────────────────────────
  // POST /kyc/submit   { firstName, lastName, dob, docType, documentRef } → { status }
  async submitKyc(payload: KycPayload) {
    if (config.mode === 'live') return http('POST', '/kyc/submit', payload);
    DB.profile.kycStatus = 'in_review';
    DB.profile.kycStepsLeft = 0;
    return mock({ status: 'in_review', etaMinutes: 5 });
  },
  // GET /kyc/status → { status, stepsLeft }
  async getKycStatus() {
    if (config.mode === 'live') return http('GET', '/kyc/status');
    return mock({ status: DB.profile.kycStatus, stepsLeft: DB.profile.kycStepsLeft });
  },

  // ── PROFILE / TIERS ──────────────────────────────────────────────────────────
  // GET /me → profile
  async getProfile() {
    if (config.mode === 'live') return http('GET', '/me');
    return mock(DB.profile);
  },
  // GET /tiers → tier[]
  async getTiers() {
    if (config.mode === 'live') return http('GET', '/tiers');
    return mock(DB.tiers);
  },

  // ── CATALOG ───────────────────────────────────────────────────────────────────
  // GET /countries?q= → country[]
  async getCountries(query?: string) {
    if (config.mode === 'live')
      return http('GET', '/countries' + (query ? '?q=' + encodeURIComponent(query) : ''));
    const q = (query || '').toLowerCase();
    return mock(
      DB.countries.filter(
        (c) => !q || c.name.toLowerCase().includes(q) || c.capital.toLowerCase().includes(q),
      ),
    );
  },
  // GET /plans → plan[]
  async getPlans() {
    if (config.mode === 'live') return http('GET', '/plans');
    return mock(DB.plans);
  },

  // ── NUMBERS ────────────────────────────────────────────────────────────────────
  // GET /numbers → number[]
  async getNumbers() {
    if (config.mode === 'live') return http('GET', '/numbers');
    return mock(DB.numbers);
  },
  // POST /numbers   { countryCode } → number  (claim a fresh local number)
  async addNumber(countryCode: string) {
    if (config.mode === 'live') return http('POST', '/numbers', { countryCode });
    const c = DB.countries.find((x) => x.code === countryCode) || DB.countries[0];
    const n: PhoneNumber = {
      id: countryCode.toLowerCase(), flag: c.flag, country: c.name,
      number: `+${c.dial} 000 000 000`, tag: 'Active', active: true,
    };
    DB.numbers.push(n);
    return mock(n);
  },
  // POST /numbers/port   { number, carrier, transferPin } → { portId, status, etaHours }
  async portNumber({ number, carrier, transferPin }: PortPayload) {
    if (config.mode === 'live')
      return http('POST', '/numbers/port', { number, carrier, transferPin });
    return mock({ portId: 'prt_mock', status: 'processing', etaHours: 3 });
  },
  // GET /numbers/port/:id → { status }
  async getPortStatus(portId: string) {
    if (config.mode === 'live') return http('GET', '/numbers/port/' + portId);
    return mock({ status: 'processing' });
  },

  // ── PLAN / BILLING ────────────────────────────────────────────────────────────
  // PUT /me/plan   { planId } → { planId }
  async switchPlan(planId: string) {
    if (config.mode === 'live') return http('PUT', '/me/plan', { planId });
    DB.profile.planId = planId;
    DB.usage.planId = planId;
    return mock({ planId });
  },
  // GET /usage → usage
  async getUsage() {
    if (config.mode === 'live') return http('GET', '/usage');
    return mock(DB.usage);
  },

  // ── eSIM PROVISIONING ──────────────────────────────────────────────────────────
  // POST /esim/install → { activationCode, smdpAddress, lpaString, expiresIn }
  async provisionEsim() {
    if (config.mode === 'live') return http('POST', '/esim/install', {});
    return mock({
      activationCode: 'K2-9F4A-RINGO-7Q', smdpAddress: 'smdp.ringoesim.com',
      lpaString: 'LPA:1$smdp.ringoesim.com$K2-9F4A-RINGO-7Q', expiresIn: 82800,
    });
  },
  // POST /esim/activate   { lpaString } → { status, country }
  async activateEsim(lpaString: string) {
    if (config.mode === 'live') return http('POST', '/esim/activate', { lpaString });
    return mock({ status: 'active', country: DB.profile.currentCountry });
  },
  // POST /countries/:code/enable → { enabled }  (use plan in a new country)
  async enableCountry(code: string) {
    if (config.mode === 'live') return http('POST', `/countries/${code}/enable`, {});
    DB.profile.currentCountry = code;
    return mock({ enabled: true, code });
  },
};

export type RingoApiType = typeof RingoAPI;
