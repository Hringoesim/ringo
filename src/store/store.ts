// store.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single reactive store. UI reads live state from here; every mutation routes
// through an action that (a) updates local state optimistically and (b) calls the
// matching RingoAPI layer so the same code works against the real orchestration
// backend (Identity → Number Management → Connectivity/RSP → BSS).
//
//   const { state, actions } = useRingoState();
//   actions.switchPlan('pro');     // updates UI + RingoAPI.billing.switchPlan
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useReducer } from 'react';
import { RingoAPI, type KycPayload } from '../api/ringoApi';
import { CO_BY_CODE } from '../data/countries';
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

/** Payload collected by the port (MNP) flow. */
export interface PortFormPayload {
  number: string;
  country: string; // number-market country code
  currentProvider: string;
  pac?: string;
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

let state: RingoState | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((fn) => fn());

function seed() {
  if (state) return;
  state = {
    numbers: clone(NUMBERS),
    activeNumberId: 'gb',
    planId: 'essentials',
    currentCountry: USER.currentCountry || 'GB',
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

export const actions = {
  setActiveNumber(id: string) {
    set({ activeNumberId: id });
    void RingoAPI.numbers.setMain(id).catch(() => {});
  },

  async switchPlan(planId: string) {
    set({ planId });
    try {
      await RingoAPI.billing.switchPlan(planId);
    } catch {
      /* keep optimistic state */
    }
  },

  // Allocate a fresh Ringo MSISDN from the DID inventory (Number Management).
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
      await RingoAPI.numbers.allocate(code);
    } catch {
      /* keep optimistic state */
    }
    return n;
  },

  // Port an existing number in via MNP (1GLOBAL). The number lands in a
  // 'porting' state, then flips to 'active' once the donor releases it.
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
      await RingoAPI.numbers.portIn({
        number: n.number,
        country: payload.country,
        currentProvider: payload.currentProvider,
        pac: payload.pac,
      });
    } catch {
      /* keep optimistic state */
    }
    // Simulate the donor releasing the number → port completes.
    setTimeout(() => {
      const cur = get();
      set({
        numbers: cur.numbers.map((x) =>
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
      await RingoAPI.identity.submitKyc(payload || {});
    } catch {
      /* keep optimistic state */
    }
    // Identity Management approval workflow completing.
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
