// abtest.ts — the plan screen's default test (owner 2026-10-24): half of the
// phones open the plan list with the cheapest plan chosen, half with the plan
// that keeps Ringo the most (the site's best_margin). Each phone keeps its arm
// for good, and the views and purchases go to ringoesim.com (/api/app-ab) so
// profit per visitor can be compared after two weeks.
import { SITE } from '../api/light';
import { storage } from './storage';

export type DefaultArm = 'cheapest' | 'recommended';
const KEY = 'ringo_ab_default_v1';
const INSTALL = 'ringo_install_id_v1';

// What was drawn is also kept in memory for the life of the app. When the
// write does not land (storage full or unavailable), every call used to draw
// again: a phone could show one arm, log its view under another and its
// purchase under a third, each event under a new install id, and a phone
// with no storage at all always fell in 'cheapest'.
let arm: DefaultArm | null = null;
let install: string | null = null;

function installId(): string {
  if (install) return install;
  let id = storage.get(INSTALL);
  if (!id) {
    try { id = crypto.randomUUID(); } catch { return 'unknown'; }
    storage.set(INSTALL, id);
  }
  install = id;
  return id;
}

export function defaultArm(): DefaultArm {
  if (arm) return arm;
  const v = storage.get(KEY);
  if (v === 'cheapest' || v === 'recommended') { arm = v; return v; }
  arm = Math.random() < 0.5 ? 'cheapest' : 'recommended';
  storage.set(KEY, arm);
  return arm;
}

/** One event of the test; never blocks the screen, a failure is dropped. */
export function logAb(event: 'view' | 'purchase', fields: { destination: string; plan?: string; product?: string | null }): void {
  try {
    void fetch(`${SITE}/api/app-ab`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ test: 'plan_default_v1', arm: defaultArm(), event, install: installId(), ...fields }),
    }).catch(() => {});
  } catch { /* offline: dropped */ }
}
