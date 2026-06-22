// store.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single reactive store for the Ringo app. The UI reads live state from here and
// every mutation routes through an action that (a) updates local state for an
// instant, optimistic UI and (b) calls the matching RingoAPI endpoint so the
// same code works against a real backend.
//
//   const { state, actions } = useRingoState();
//   actions.switchPlan('pro');     // updates UI + PUT /me/plan
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useReducer } from 'react';
import { RingoAPI, type KycPayload, type PortPayload } from '../api/ringoApi';
import { CO_BY_CODE, COUNTRIES } from '../data/countries';
import { NUMBERS } from '../data/numbers';
import { USER } from '../data/tiers';
import type { KycStatus, PhoneNumber } from '../data/types';

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
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

let state: RingoState | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((fn) => fn());

function seed() {
  if (state) return;
  state = {
    numbers: clone(NUMBERS),
    activeNumberId: 'jp',
    planId: 'essentials',
    currentCountry: USER.currentCountry || 'JP',
    kycStatus: 'pending',
    score: USER.score ?? 4,
    countries: USER.countries ?? 4,
    dataPct: USER.dataPct ?? 0.34,
    name: USER.name || 'Marie',
  };
}

function get(): RingoState {
  seed();
  return state as RingoState;
}

function set(patch: Partial<RingoState>) {
  seed();
  state = { ...(state as RingoState), ...patch };
  emit();
}

const dialToCountry = (number: string) =>
  COUNTRIES.find((c) =>
    number.replace(/[^\d]/g, '').startsWith(String(c.dial || '')),
  ) || null;

export const actions = {
  setActiveNumber(id: string) {
    set({ activeNumberId: id });
  },

  async switchPlan(planId: string) {
    set({ planId });
    try {
      await RingoAPI.switchPlan(planId);
    } catch {
      /* keep optimistic state */
    }
  },

  async addNumber(code: string) {
    const s = get();
    const co = CO_BY_CODE[code];
    const n: PhoneNumber = {
      id: code.toLowerCase() + '_' + Date.now().toString(36),
      flag: co ? co.flag : '🌐',
      country: co ? co.name : 'New',
      number: co ? `+${co.dial} ··· ··· ···` : '+·· ··· ··· ···',
      tag: 'Background',
      active: true,
    };
    set({ numbers: [...s.numbers, n] });
    try {
      await RingoAPI.addNumber(code);
    } catch {
      /* keep optimistic state */
    }
    return n;
  },

  async portNumber(payload: Partial<PortPayload>) {
    const s = get();
    const num = (payload && payload.number) || '+00 000 000 000';
    const co = dialToCountry(num);
    const n: PhoneNumber = {
      id: 'port_' + Date.now().toString(36),
      flag: co ? co.flag : '📲',
      country: co ? co.name : 'Ported',
      number: num,
      tag: 'Background',
      active: true,
      porting: true,
    };
    set({ numbers: [...s.numbers, n] });
    try {
      await RingoAPI.portNumber({
        number: num,
        carrier: payload.carrier || '',
        transferPin: payload.transferPin || '',
      });
    } catch {
      /* keep optimistic state */
    }
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
      await RingoAPI.enableCountry(code);
    } catch {
      /* keep optimistic state */
    }
  },

  async submitKyc(payload: KycPayload) {
    set({ kycStatus: 'in_review' });
    try {
      await RingoAPI.submitKyc(payload || {});
    } catch {
      /* keep optimistic state */
    }
    // simulate review completing
    setTimeout(() => set({ kycStatus: 'verified' }), 2600);
  },

  reset() {
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
