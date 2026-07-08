// ringoApi.ts
// ─────────────────────────────────────────────────────────────────────────────
// Ringo backend integration seam — organised to mirror the orchestration layers
// in the backend architecture (Workstream A):
//
//   RingoAPI.auth            account creation / OTP
//   RingoAPI.identity        Identity Layer  — KYC + Identity Management approval
//   RingoAPI.numbers         Number Management — DID allocation + MNP port-in
//   RingoAPI.connectivity    Connectivity Layer — CMP + SM-DP+ (SGP.22) eSIM RSP
//   RingoAPI.communication   Communication Layer — voice (VoIP/PSTN) + SMS  [FUTURE]
//   RingoAPI.billing         BSS — Stripe charging
//   RingoAPI.catalog         countries / plans / tiers
//
// Every screen talks ONLY to RingoAPI.* — never to fetch() or fixtures directly.
// Today it runs in MOCK mode. To connect the real orchestration backend, make one
// call at boot — the wholesale partners (1GLOBAL for MNP, the RSP/SM-DP+ vendor,
// Telnyx for voice/SMS) are wired behind these endpoints server-side:
//
//   RingoAPI.configure({
//     mode: 'live',
//     baseUrl: 'https://api.ringoesim.com/v1',
//     getToken: () => localStorage.getItem('ringo_jwt'),
//     partners: { mnp: '1global', rsp: 'kigen', voice: 'telnyx' },
//   });
// ─────────────────────────────────────────────────────────────────────────────

import type { Country, KycStatus, PhoneNumber, Plan, Tier } from '../data/types';

interface PartnerMap {
  /** Mobile Number Portability provider (e.g. 1GLOBAL Connect API). */
  mnp?: string;
  /** Remote SIM Provisioning / SM-DP+ vendor (e.g. Kigen, 1GLOBAL, Trasna). */
  rsp?: string;
  /** Voice/SMS termination (e.g. Telnyx). */
  voice?: string;
  /** Identity / KYC provider (e.g. Onfido). */
  identity?: string;
  /** Billing (e.g. Stripe). */
  billing?: string;
}

interface ApiConfig {
  mode: 'mock' | 'live';
  baseUrl: string;
  getToken: () => string | null;
  onUnauthorized: (() => void) | null;
  mockLatency: number;
  partners: PartnerMap;
}

const config: ApiConfig = {
  mode: 'mock',
  baseUrl: '',
  getToken: () => null,
  onUnauthorized: null,
  mockLatency: 450,
  partners: { mnp: '1global', rsp: 'tbd', voice: 'telnyx', identity: 'onfido', billing: 'stripe' },
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
    const message = (detail as { message?: string })?.message || 'HTTP ' + res.status;
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
  return value == null ? value : (JSON.parse(JSON.stringify(value)) as T);
}

// ── Mock fixtures (single source of seed data) ────────────────────────────────
interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  tier: Tier['id'];
  score: number;
  kycStatus: KycStatus;
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
    firstName: 'Hippolyte',
    lastName: 'Van Marcke',
    email: 'marie@ringoesim.com',
    tier: 'orange',
    score: 4,
    kycStatus: 'pending',
    kycStepsLeft: 1,
    currentCountry: 'GB',
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
    { id: 'essentials', name: 'Essentials', price: 19, highspeed: '15 GB',    tagline: 'For light trips & backups', maxNumbers: 1, feats: ['15 GB high-speed, then unlimited standard', '180+ countries', '1 number included'] },
    { id: 'plus',       name: 'Plus',       price: 35, highspeed: '50 GB',    tagline: 'For regular travelers',     maxNumbers: 2, feats: ['50 GB high-speed', '180+ countries', '2 numbers included', 'Personal hotspot'] },
    { id: 'pro',        name: 'Pro',        price: 59, highspeed: '150 GB',   tagline: 'For digital nomads', popular: true, maxNumbers: 3, feats: ['150 GB high-speed', '180+ countries', '3 numbers included', 'Priority 5G/4G+'] },
    { id: 'unlimited',  name: 'Unlimited',  price: 89, highspeed: 'Unlimited', tagline: 'No caps, ever',            maxNumbers: 5, feats: ['Truly unlimited 5G — no throttle', '180+ countries', '5 numbers included', 'Always-on hotspot'] },
  ],

  countries: [
    { code: 'GB', name: 'United Kingdom', capital: 'London', flag: '🇬🇧', region: 'Europe', tier: 'A', popular: true, dial: 44, numberMarket: true,
      mnp: { regulator: 'Ofcom', flow: 'donor-led', needsPac: true, sla: 'Within 1 business day (PAC before 4pm)' } },
    { code: 'IE', name: 'Ireland', capital: 'Dublin', flag: '🇮🇪', region: 'Europe', tier: 'A', popular: true, dial: 353, numberMarket: true,
      mnp: { regulator: 'ComReg', flow: 'recipient-led', needsPac: false, sla: 'Completes within ~2 hours' } },
    { code: 'ES', name: 'Spain', capital: 'Madrid', flag: '🇪🇸', region: 'Europe', tier: 'A', popular: true, dial: 34, numberMarket: true,
      mnp: { regulator: 'AOPM', flow: 'recipient-led', needsPac: false, sla: 'Within 1 business day (before 2pm)' } },
    { code: 'DE', name: 'Germany', capital: 'Berlin', flag: '🇩🇪', region: 'Europe', tier: 'A', popular: true, dial: 49, numberMarket: true,
      mnp: { regulator: 'Bundesnetzagentur', flow: 'recipient-led', needsPac: false, sla: 'Up to 6 business days' } },
    { code: 'NL', name: 'Netherlands', capital: 'Amsterdam', flag: '🇳🇱', region: 'Europe', tier: 'A', popular: true, dial: 31, numberMarket: true,
      mnp: { regulator: 'ACM', flow: 'recipient-led', needsPac: false, sla: 'Completes almost immediately' } },
    { code: 'US', name: 'United States', capital: 'Washington', flag: '🇺🇸', region: 'Americas', tier: 'A', popular: true, dial: 1 },
    { code: 'JP', name: 'Japan', capital: 'Tokyo', flag: '🇯🇵', region: 'Asia', tier: 'A', popular: true, dial: 81 },
    { code: 'PT', name: 'Portugal', capital: 'Lisbon', flag: '🇵🇹', region: 'Europe', tier: 'A', dial: 351 },
    { code: 'AE', name: 'UAE', capital: 'Abu Dhabi', flag: '🇦🇪', region: 'Middle East', tier: 'A', dial: 971 },
    { code: 'SG', name: 'Singapore', capital: 'Singapore', flag: '🇸🇬', region: 'Asia', tier: 'A', dial: 65 },
  ],

  numbers: [
    { id: 'gb', flag: '🇬🇧', country: 'United Kingdom', number: '+44 7700 900123', tag: 'Primary', active: true, source: 'ringo', status: 'active' },
    { id: 'ie', flag: '🇮🇪', country: 'Ireland', number: '+353 83 123 4567', tag: 'Active', active: true, source: 'ringo', status: 'active' },
    { id: 'es', flag: '🇪🇸', country: 'Spain', number: '+34 612 34 56 78', tag: 'Standby', active: false, source: 'ported', status: 'active' },
  ],

  usage: {
    planId: 'essentials',
    fairUsePct: 0.34,
    renewsOn: 'May 28',
    country: 'GB',
    connected: true,
    invoices: [
      { date: 'Apr 28', label: 'Ringo Essentials', amount: '£19.00' },
      { date: 'Apr 12', label: 'Ireland number', amount: '£3.00' },
      { date: 'Mar 28', label: 'Ringo Essentials', amount: '£19.00' },
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

export interface PortInPayload {
  number: string;
  /** Country code of the number market (drives the MNP flow + SLA). */
  country: string;
  currentProvider: string;
  /** PAC code — required only for donor-led markets (UK). */
  pac?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API — layered to mirror the orchestration backend.
// ─────────────────────────────────────────────────────────────────────────────
export const RingoAPI = {
  configure(opts: Partial<ApiConfig> = {}) {
    Object.assign(config, opts);
    if (opts.partners) config.partners = { ...config.partners, ...opts.partners };
    return this;
  },
  get mode() {
    return config.mode;
  },
  get partners() {
    return config.partners;
  },

  // ── AUTH ──────────────────────────────────────────────────────────────────
  auth: {
    // POST /auth/apple   { identityToken } → { token, profile }
    async appleSignIn(identityToken: string) {
      if (config.mode === 'live') return http('POST', '/auth/apple', { identityToken });
      return mock({ token: 'mock_jwt', profile: DB.profile });
    },
    // POST /auth/email   { email, phone } → { challengeId }
    async emailSignUp(email: string, phone: string | null) {
      if (config.mode === 'live') return http('POST', '/auth/email', { email, phone });
      return mock({ challengeId: 'chl_mock', sentTo: phone || email });
    },
    // POST /auth/otp/verify   { challengeId, code } → { token, profile }
    async verifyOtp(challengeId: string, code: string) {
      if (config.mode === 'live') return http('POST', '/auth/otp/verify', { challengeId, code });
      return mock({ token: 'mock_jwt', profile: DB.profile });
    },
  },

  // ── IDENTITY LAYER — KYC + Identity Management approval workflow ─────────────
  identity: {
    // POST /identity/kyc   { ...docs } → { status }   (provider: Onfido)
    async submitKyc(payload: KycPayload) {
      if (config.mode === 'live') return http('POST', '/identity/kyc', payload);
      DB.profile.kycStatus = 'in_review';
      DB.profile.kycStepsLeft = 0;
      return mock({ status: 'in_review' as KycStatus, etaMinutes: 5 });
    },
    // GET /identity/status → { status, stepsLeft }  (Identity Management approval)
    async getStatus() {
      if (config.mode === 'live') return http('GET', '/identity/status');
      return mock({ status: DB.profile.kycStatus, stepsLeft: DB.profile.kycStepsLeft });
    },
  },

  // ── NUMBER MANAGEMENT — DID allocation + MNP port-in ───────────────────────
  numbers: {
    // GET /numbers → number[]
    async list() {
      if (config.mode === 'live') return http('GET', '/numbers');
      return mock(DB.numbers);
    },
    // POST /numbers/allocate   { countryCode } → number  (Ringo MSISDN from DID inventory)
    async allocate(countryCode: string) {
      if (config.mode === 'live') return http('POST', '/numbers/allocate', { countryCode });
      const c = DB.countries.find((x) => x.code === countryCode) || DB.countries[0];
      const n: PhoneNumber = {
        id: countryCode.toLowerCase() + '_' + Date.now().toString(36),
        flag: c.flag, country: c.name, number: `+${c.dial} 0000 000000`,
        tag: 'Active', active: true, source: 'ringo', status: 'active',
      };
      DB.numbers.push(n);
      return mock(n);
    },
    // POST /numbers/port   { number, country, currentProvider, pac } → { portId, status, eta }
    // Routed server-side through the MNP partner (1GLOBAL Connect API).
    async portIn(payload: PortInPayload) {
      if (config.mode === 'live') return http('POST', '/numbers/port', payload);
      const c = DB.countries.find((x) => x.code === payload.country);
      return mock({
        portId: 'prt_mock', status: 'processing' as const,
        eta: c?.mnp?.sla || 'Within 1 business day', provider: config.partners.mnp,
      });
    },
    // GET /numbers/port/:id → { status }
    async portStatus(portId: string) {
      if (config.mode === 'live') return http('GET', '/numbers/port/' + portId);
      return mock({ status: 'processing' as const });
    },
    // POST /numbers/:id/main → { mainId }   (promote to Main, rest to Background)
    async setMain(id: string) {
      if (config.mode === 'live') return http('POST', `/numbers/${id}/main`, {});
      return mock({ mainId: id });
    },
    // DELETE /numbers/:id → 204   (Release MSISDN)
    async release(id: string) {
      if (config.mode === 'live') return http('DELETE', `/numbers/${id}`);
      DB.numbers = DB.numbers.filter((n) => n.id !== id);
      return mock({ released: id });
    },
  },

  // ── CONNECTIVITY LAYER — CMP + SM-DP+ (SGP.22) eSIM RSP ─────────────────────
  connectivity: {
    // POST /esim/provision → { activationCode, smdpAddress, lpaString, expiresIn }
    // SM-DP+ prepares the profile; the device's LPAd downloads it.
    async provisionEsim() {
      if (config.mode === 'live') return http('POST', '/esim/provision', {});
      return mock({
        activationCode: 'K2-9F4A-RINGO-7Q', smdpAddress: 'smdp.ringoesim.com',
        lpaString: 'LPA:1$smdp.ringoesim.com$K2-9F4A-RINGO-7Q', expiresIn: 82800,
        rsp: config.partners.rsp,
      });
    },
    // POST /esim/activate   { lpaString } → { status, country }  (LPAd download+install+enable)
    async activateEsim(lpaString: string) {
      if (config.mode === 'live') return http('POST', '/esim/activate', { lpaString });
      return mock({ status: 'active', country: DB.profile.currentCountry });
    },
    // POST /countries/:code/enable → { enabled }   (use data plan in a new country, via CMP)
    async enableCountry(code: string) {
      if (config.mode === 'live') return http('POST', `/countries/${code}/enable`, {});
      DB.profile.currentCountry = code;
      return mock({ enabled: true, code });
    },
  },

  // ── COMMUNICATION LAYER — voice (VoIP/PSTN) + SMS  [FUTURE] ──────────────────
  communication: {
    // GET /voice/routing → routing rules (presence-aware multi-device)
    async getVoiceRouting() {
      if (config.mode === 'live') return http('GET', '/voice/routing');
      return mock({ mainNumberId: DB.numbers.find((n) => n.active)?.id, fallback: 'voicemail' });
    },
    // GET /sms/threads → inbox  [FUTURE]
    async getSmsThreads() {
      if (config.mode === 'live') return http('GET', '/sms/threads');
      return mock([]);
    },
  },

  // ── BSS — billing (Stripe) ──────────────────────────────────────────────────
  billing: {
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
  },

  // ── CATALOG / PROFILE ───────────────────────────────────────────────────────
  catalog: {
    async getProfile() {
      if (config.mode === 'live') return http('GET', '/me');
      return mock(DB.profile);
    },
    async getTiers() {
      if (config.mode === 'live') return http('GET', '/tiers');
      return mock(DB.tiers);
    },
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
    async getPlans() {
      if (config.mode === 'live') return http('GET', '/plans');
      return mock(DB.plans);
    },
  },
};

export type RingoApiType = typeof RingoAPI;
