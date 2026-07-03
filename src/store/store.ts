// store.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single reactive store. UI reads live state from here; every mutation routes
// through an action that (a) updates local state optimistically + persists it and
// (b) calls the matching RingoAPI layer so the same code works against the real
// orchestration backend (Identity → Number Management → Connectivity/RSP → BSS).
//
// State is persisted to localStorage (survives reloads) and seeded with the
// signed-in user's identity. In `live` mode, hydrate() pulls real data from the API.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useReducer } from 'react';
import { RingoAPI, type KycPayload } from '../api/ringoApi';
import { CO_BY_CODE } from '../data/countries';
import { NUMBERS } from '../data/numbers';
import { USER } from '../data/tiers';
import { getSession } from '../auth/auth';
import { isSupabaseConfigured, sbData } from '../lib/ringoSupabase';
import type { KycStatus, PhoneNumber } from '../data/types';

const sb = isSupabaseConfigured();

export interface RingoState {
  numbers: PhoneNumber[];
  activeNumberId: string; // the MAIN number
  planId: string;
  currentCountry: string;
  kycStatus: KycStatus;
  score: number;
  countries: number;
  dataPct: number;
  name: string;
  email: string | null;
}

export interface PortFormPayload {
  number: string;
  country: string;
  currentProvider: string;
  pac?: string;
}

const STATE_KEY = 'ringo_state_v1';
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

let state: RingoState | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((fn) => fn());

function defaults(): RingoState {
  const session = getSession();
  return {
    numbers: clone(NUMBERS),
    activeNumberId: 'be',
    planId: 'essentials',
    currentCountry: USER.currentCountry || 'GB',
    kycStatus: 'pending',
    score: USER.score ?? 4,
    countries: USER.countries ?? 4,
    dataPct: USER.dataPct ?? 0.34,
    name: session?.name || USER.name || 'there',
    email: session?.email ?? null,
  };
}

function persist() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* storage full / unavailable — keep in memory */
  }
}

function seed() {
  if (state) return;
  let loaded: Partial<RingoState> | null = null;
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) loaded = JSON.parse(raw);
  } catch {
    loaded = null;
  }
  const base = defaults();
  // Merge persisted state forward-compatibly; always refresh identity from session.
  state = loaded ? { ...base, ...loaded, name: base.name, email: base.email } : base;
}

function get(): RingoState {
  seed();
  return state as RingoState;
}

function set(patch: Partial<RingoState>) {
  seed();
  state = { ...(state as RingoState), ...patch };
  persist();
  emit();
}

export const actions = {
  setActiveNumber(id: string) {
    set({ activeNumberId: id });
    void RingoAPI.numbers.setMain(id).catch(() => {});
  },

  async switchPlan(planId: string) {
    set({ planId });
    try {
      if (sb) await sbData.switchPlan(planId);
      else await RingoAPI.billing.switchPlan(planId);
    } catch {
      /* keep optimistic state */
    }
  },

  async allocateNumber(code: string) {
    const s = get();
    const co = CO_BY_CODE[code];
    const n: PhoneNumber = {
      id: code.toLowerCase() + '_' + Date.now().toString(36),
      flag: co ? co.flag : '🌐',
      country: co ? co.name : 'New',
      number: co ? `+${co.dial} ···· ······` : '+·· ··· ··· ···',
      tag: 'Background',
      active: true,
      source: 'ringo',
      status: 'active',
    };
    set({ numbers: [...s.numbers, n] });
    try {
      if (sb) {
        await sbData.allocateNumber(code, n.number);
      } else {
        const created = await RingoAPI.numbers.allocate(code);
        if (created && (created as PhoneNumber).number) {
          const real = created as PhoneNumber;
          set({ numbers: get().numbers.map((x) => (x.id === n.id ? { ...x, number: real.number } : x)) });
        }
      }
    } catch {
      /* keep optimistic state */
    }
    return n;
  },

  async portNumber(payload: PortFormPayload) {
    const s = get();
    const co = CO_BY_CODE[payload.country];
    const eta = co?.mnp?.sla || 'Within 1 business day';
    const id = 'port_' + Date.now().toString(36);
    const n: PhoneNumber = {
      id,
      flag: co ? co.flag : '📲',
      country: co ? co.name : 'Ported',
      number: payload.number || '+00 000 000 000',
      tag: 'Background',
      active: true,
      source: 'ported',
      status: 'porting',
      porting: true,
      portEta: eta,
    };
    set({ numbers: [...s.numbers, n] });
    try {
      if (sb) {
        await sbData.portIn(payload);
      } else {
        await RingoAPI.numbers.portIn({
          number: n.number,
          country: payload.country,
          currentProvider: payload.currentProvider,
          pac: payload.pac,
        });
      }
    } catch {
      /* keep optimistic state */
    }
    setTimeout(() => {
      set({
        numbers: get().numbers.map((x) =>
          x.id === id ? { ...x, status: 'active', porting: false, portEta: undefined } : x,
        ),
      });
    }, 3200);
    return n;
  },

  async enableCountry(code: string) {
    const s = get();
    const already = s.currentCountry === code;
    set({
      currentCountry: code,
      countries: already ? s.countries : s.countries + 1,
      score: already ? s.score : s.score + 1,
    });
    try {
      await RingoAPI.connectivity.enableCountry(code);
    } catch {
      /* keep optimistic state */
    }
  },

  async submitKyc(payload: KycPayload) {
    set({ kycStatus: 'in_review' });
    try {
      if (sb) await sbData.submitKyc((payload || {}) as Record<string, unknown>);
      else await RingoAPI.identity.submitKyc(payload || {});
    } catch {
      /* keep optimistic state */
    }
    if (!sb) setTimeout(() => set({ kycStatus: 'verified' }), 2600);
  },

  // Pull real data from the backend (Supabase or live API).
  async hydrate() {
    try {
      if (sb) {
        const [numbers, profile] = await Promise.all([sbData.getNumbers(), sbData.getProfile()]);
        const patch: Partial<RingoState> = {};
        if (numbers.length) patch.numbers = numbers;
        if (profile) {
          if (profile.plan_id) patch.planId = String(profile.plan_id);
          if (profile.kyc_status) patch.kycStatus = profile.kyc_status as KycStatus;
          if (profile.current_country) patch.currentCountry = String(profile.current_country);
          if (typeof profile.score === 'number') patch.score = profile.score as number;
        }
        if (Object.keys(patch).length) set(patch);
        return;
      }
      if (RingoAPI.mode !== 'live') return;
      const [numbers, usage] = await Promise.all([
        RingoAPI.numbers.list() as Promise<PhoneNumber[]>,
        RingoAPI.billing.getUsage() as Promise<{ planId: string; fairUsePct: number; country: string }>,
      ]);
      set({ numbers, planId: usage.planId, dataPct: usage.fairUsePct, currentCountry: usage.country });
    } catch {
      /* offline / not reachable — keep local state */
    }
  },

  // Refresh identity from the current session (after sign-in).
  syncIdentity() {
    const session = getSession();
    if (session) set({ name: session.name, email: session.email });
  },

  reset() {
    try {
      localStorage.removeItem(STATE_KEY);
    } catch {
      /* ignore */
    }
    state = null;
    seed();
    emit();
  },
};

export const RingoStore = {
  get,
  set,
  subscribe(fn: () => void) {
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  },
  actions,
};

// React hook — re-renders the caller on any state change.
export function useRingoState() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => RingoStore.subscribe(force), []);
  return { state: RingoStore.get(), actions: RingoStore.actions };
}
