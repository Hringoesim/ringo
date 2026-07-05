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
import { USER, tierFor } from '../data/tiers';
import { getSession } from '../auth/auth';
import { isSupabaseConfigured, sbData } from '../lib/ringoSupabase';
import { planRank, planMaxNumbers, proratedUpgradeCharge, planPrice, BILLING_DAYS } from '../data/plans';
import type { KycStatus, PhoneNumber } from '../data/types';

const sb = isSupabaseConfigured();

export interface RingoState {
  numbers: PhoneNumber[];
  activeNumberId: string; // the MAIN number
  planId: string;
  /** True once a plan has been paid for. Gates eSIM activation. */
  subscribed: boolean;
  /** ISO date the current paid month renews (proration + downgrade timing). */
  periodEnd: string;
  /** A downgrade scheduled to take effect at `periodEnd` (null = none). The
   *  account keeps its current, higher plan and full data until then. */
  pendingPlanId: string | null;
  currentCountry: string;
  kycStatus: KycStatus;
  score: number;
  countries: number;
  dataPct: number;
  name: string;
  email: string | null;
  /** Profile photo as a data URL (demo: local; live: Supabase storage). */
  avatar: string | null;
  /** Tier id just unlocked (for the celebration), cleared once shown. */
  tierUp: string | null;
  /** Early adopter who downloaded the app — a special founding membership. */
  pioneer: boolean;
}

/** Whether the identity check is done enough to buy/port a number (L2 gate). */
export function kycCleared(s: RingoState): boolean {
  return s.kycStatus === 'in_review' || s.kycStatus === 'verified';
}

const DAY_MS = 86_400_000;
/** Whole days remaining in the paid period (0 if already past). */
function daysLeft(periodEnd: string): number {
  const ms = new Date(periodEnd).getTime() - Date.now();
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / DAY_MS)) : 0;
}
/** ISO date `days` from now (default one billing month). */
function isoIn(days = BILLING_DAYS): string {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

/** What switching to `targetId` means right now — used to drive the confirm UI
 *  before anything is charged or scheduled. Pure read of current state. */
export interface PlanChange {
  kind: 'upgrade' | 'downgrade' | 'same';
  fromId: string;
  toId: string;
  /** Prorated amount charged today (upgrades only; 0 otherwise). */
  chargeNow: number;
  /** New plan's normal monthly price (billed from `renewsAt`). */
  monthly: number;
  /** When the new plan takes effect. */
  effective: 'now' | 'renewal';
  renewsAt: string;
  daysLeft: number;
  /** Target plan's number cap and how the account compares to it. */
  maxNumbers: number;
  currentCount: number;
  /** Numbers beyond the target cap that must be released (downgrade only). */
  overBy: number;
  /** Suggested split: keep the primary + up to cap, release the rest. */
  keepIds: string[];
  releaseIds: string[];
}

export interface PortFormPayload {
  number: string;
  country: string;
  currentProvider: string;
  pac?: string;
}

// v2: bumped when the seed fixtures change so returning users don't keep a
// stale persisted snapshot (old demo stats/numbers) shadowing the new defaults.
const STATE_KEY = 'ringo_state_v2';
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

let state: RingoState | null = null;
// Bumped on reset(); deferred timers compare against it and no-op if stale.
let generation = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((fn) => fn());

function defaults(): RingoState {
  const session = getSession();
  // Live accounts (real Supabase backend) start EMPTY — a new person does not
  // inherit the demo's seeded Belgium number or stats. Only the bundled demo
  // (no backend configured) seeds the sample fixtures for a populated preview.
  const live = sb;
  return {
    numbers: live ? [] : clone(NUMBERS),
    activeNumberId: live ? '' : 'be',
    planId: 'essentials',
    subscribed: false,
    periodEnd: isoIn(),
    pendingPlanId: null,
    currentCountry: USER.currentCountry || 'GB',
    kycStatus: 'pending',
    score: live ? 0 : (USER.score ?? 4),
    countries: live ? 0 : (USER.countries ?? 4),
    dataPct: live ? 0 : (USER.dataPct ?? 0.34),
    // Live guest (no session) gets a neutral name; the offline demo keeps USER.
    name: session?.name || (live ? 'Explorer' : USER.name) || 'there',
    email: session?.email ?? null,
    avatar: null,
    tierUp: null,
    // Pioneer is granted by a founding code. The offline demo user (Hippolyte)
    // is a Pioneer; a new live account starts as a normal member until they
    // redeem a Pioneer code.
    pioneer: !live,
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
  // Merge persisted state forward-compatibly. Keep a user-edited name/avatar if
  // present; otherwise take identity from the session.
  state = loaded
    ? { ...base, ...loaded, name: loaded.name || base.name, email: base.email }
    : base;
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

  /** Preview what switching to `targetId` does — kind, prorated charge, renewal
   *  timing, and (for downgrades) which numbers fall outside the new cap. Reads
   *  current state only; changes nothing. Drives the confirm sheet. */
  planChangePreview(targetId: string): PlanChange {
    const s = get();
    const fromId = s.planId;
    const fromR = planRank(fromId);
    const toR = planRank(targetId);
    const kind: PlanChange['kind'] = toR > fromR ? 'upgrade' : toR < fromR ? 'downgrade' : 'same';
    const dLeft = daysLeft(s.periodEnd);
    const cap = planMaxNumbers(targetId);
    // Only numbers that are still live count against the cap (not ones already
    // scheduled for release). Keep the primary first, then the rest in order.
    const live = s.numbers.filter((n) => !n.scheduledRelease);
    const ordered = [...live].sort((a, b) =>
      a.id === s.activeNumberId ? -1 : b.id === s.activeNumberId ? 1 : 0,
    );
    const keep = ordered.slice(0, cap);
    const release = kind === 'downgrade' ? ordered.slice(cap) : [];
    return {
      kind, fromId, toId: targetId,
      chargeNow: kind === 'upgrade' ? proratedUpgradeCharge(fromId, targetId, dLeft) : 0,
      monthly: planPrice(targetId),
      effective: kind === 'upgrade' ? 'now' : 'renewal',
      renewsAt: s.periodEnd,
      daysLeft: dLeft,
      maxNumbers: cap,
      currentCount: live.length,
      overBy: kind === 'downgrade' ? Math.max(0, live.length - cap) : 0,
      keepIds: keep.map((n) => n.id),
      releaseIds: release.map((n) => n.id),
    };
  },

  /** Apply a plan switch.
   *  · Upgrade   → charge the prorated difference now; new plan effective today,
   *               and any previously-scheduled downgrade/number releases are undone.
   *  · Downgrade → nothing charged now; the current higher plan and its full data
   *               are kept until `periodEnd`, then `targetId` takes over. Numbers
   *               outside the new cap (everything not in `keepIds`) are scheduled
   *               for release at renewal.
   *  `keepIds` (downgrade only) is the user's chosen numbers to keep; the primary
   *  is always kept. Falls back to the preview's suggestion. */
  async changePlan(targetId: string, keepIds?: string[]): Promise<{ ok: boolean; error?: string; charged?: number }> {
    const pre = actions.planChangePreview(targetId);
    const s = get();
    if (pre.kind === 'same') {
      set({ pendingPlanId: null }); // re-selecting current plan cancels a pending downgrade
      return { ok: true };
    }
    if (pre.kind === 'upgrade') {
      try {
        if (sb) await sbData.switchPlan(targetId); // FIXME(live): Stripe proration_behavior=always_invoice
        else await RingoAPI.billing.switchPlan(targetId);
      } catch {
        return { ok: false, error: 'Payment could not be completed. Please try again.' };
      }
      set({
        planId: targetId,
        subscribed: true,
        pendingPlanId: null,
        // Upgrading restores the slots — un-schedule any pending releases.
        numbers: s.numbers.map((n) => (n.scheduledRelease ? { ...n, scheduledRelease: false } : n)),
      });
      return { ok: true, charged: pre.chargeNow };
    }
    // downgrade — schedule for renewal, mark the numbers over the cap.
    const keep = new Set(keepIds && keepIds.length ? keepIds : pre.keepIds);
    keep.add(s.activeNumberId); // primary is never released
    set({
      pendingPlanId: targetId,
      numbers: s.numbers.map((n) =>
        n.scheduledRelease === undefined || !n.scheduledRelease
          ? { ...n, scheduledRelease: !keep.has(n.id) }
          : n,
      ),
    });
    // FIXME(live): schedule a Stripe subscription update at period end + queue the
    // number deprovisioning jobs so the change is enforced server-side, not just UI.
    return { ok: true };
  },

  /** Undo a scheduled downgrade before it takes effect (keeps every number). */
  cancelScheduledChange() {
    const s = get();
    if (!s.pendingPlanId && !s.numbers.some((n) => n.scheduledRelease)) return;
    set({
      pendingPlanId: null,
      numbers: s.numbers.map((n) => (n.scheduledRelease ? { ...n, scheduledRelease: false } : n)),
    });
  },

  /** If the paid period has rolled over with a downgrade queued, enforce it:
   *  drop the released numbers, move to the lower plan, open the next period. */
  applyDueScheduledChange() {
    const s = get();
    if (!s.pendingPlanId) return;
    if (daysLeft(s.periodEnd) > 0) return; // not due yet
    set({
      planId: s.pendingPlanId,
      pendingPlanId: null,
      periodEnd: isoIn(),
      numbers: s.numbers.filter((n) => !n.scheduledRelease),
    });
  },

  /** Pay for a plan. Demo simulates an instant successful charge; live mode
   *  routes through the billing seam (Stripe Checkout/subscription) — the app
   *  never sees card details. On success the account becomes `subscribed`,
   *  which unlocks eSIM activation and opens a fresh billing period. */
  async checkout(planId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      if (sb) await sbData.switchPlan(planId); // FIXME(live): create Stripe subscription server-side
      else await RingoAPI.billing.switchPlan(planId);
    } catch {
      return { ok: false, error: 'Payment could not be completed. Please try again.' };
    }
    set({ subscribed: true, planId, pendingPlanId: null, periodEnd: isoIn() });
    return { ok: true };
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
        // FIXME(live): n.number is a masked display string; real allocation must
        // come from the orchestrator edge function (returns the true MSISDN).
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
    const gen = generation;
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
      if (gen !== generation) return; // reset/sign-out happened — don't resurrect state
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
    const newScore = already ? s.score : s.score + 1;
    // Membership climbs with each genuinely-new country connected this year.
    const leveledUp = tierFor(newScore).id !== tierFor(s.score).id;
    set({
      currentCountry: code,
      countries: already ? s.countries : s.countries + 1,
      score: newScore,
      tierUp: leveledUp ? tierFor(newScore).id : s.tierUp,
    });
    try {
      await RingoAPI.connectivity.enableCountry(code);
    } catch {
      /* keep optimistic state */
    }
  },

  clearTierUp() {
    if (get().tierUp) set({ tierUp: null });
  },

  /** Redeem a valid Pioneer code → founding membership (ranks still climb). */
  grantPioneer() {
    if (!get().pioneer) set({ pioneer: true });
  },

  /** Pre-select a plan (e.g. the onboarding recommendation) without charging. */
  selectPlan(planId: string) {
    set({ planId });
  },

  async submitKyc(payload: KycPayload) {
    set({ kycStatus: 'in_review' });
    try {
      if (sb) await sbData.submitKyc((payload || {}) as Record<string, unknown>);
      else await RingoAPI.identity.submitKyc(payload || {});
    } catch {
      /* keep optimistic state */
    }
    if (!sb) {
      const gen = generation;
      setTimeout(() => {
        if (gen !== generation) return; // reset/sign-out happened
        set({ kycStatus: 'verified' });
      }, 2600);
    }
  },

  // Pull real data from the backend (Supabase or live API).
  async hydrate() {
    // Enforce any downgrade whose renewal has passed before showing state.
    actions.applyDueScheduledChange();
    try {
      if (sb) {
        const [numbers, profile] = await Promise.all([sbData.getNumbers(), sbData.getProfile()]);
        const patch: Partial<RingoState> = {};
        if (numbers.length) {
          patch.numbers = numbers;
          // Point the MAIN number at the real primary row (ids differ from the
          // 'be' fixture id, so NumbersScreen would otherwise show no Main).
          patch.activeNumberId = (numbers.find((n) => n.tag === 'Primary') || numbers[0]).id;
        }
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
      const patch: Partial<RingoState> = { planId: usage.planId, dataPct: usage.fairUsePct, currentCountry: usage.country };
      if (numbers.length) {
        patch.numbers = numbers;
        patch.activeNumberId = (numbers.find((n) => n.tag === 'Primary') || numbers[0]).id;
      }
      set(patch);
    } catch {
      /* offline / not reachable — keep local state */
    }
  },

  // Profile customization.
  setName(name: string) {
    const n = name.trim();
    if (n) set({ name: n });
  },
  setAvatar(dataUrl: string | null) {
    set({ avatar: dataUrl });
  },

  // Refresh identity from the current session (after sign-in).
  syncIdentity() {
    const session = getSession();
    if (session) set({ name: session.name, email: session.email });
  },

  reset() {
    generation++; // invalidate any in-flight deferred timers
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
