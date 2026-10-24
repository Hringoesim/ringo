// abtest.ts — the plan screen's default test (owner 2026-10-24): half of the
// phones open the plan list with the cheapest plan chosen, half with the plan
// that keeps Ringo the most (the site's best_margin). Each phone keeps its arm
// for good, and the views and purchases go to ringoesim.com (/api/app-ab) so
// profit per visitor can be compared after two weeks.
import { SITE } from '../api/light';

export type DefaultArm = 'cheapest' | 'recommended';
const KEY = 'ringo_ab_default_v1';
const INSTALL = 'ringo_install_id_v1';

function installId(): string {
  try {
    let id = localStorage.getItem(INSTALL);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(INSTALL, id); }
    return id;
  } catch { return 'unknown'; }
}

export function defaultArm(): DefaultArm {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'cheapest' || v === 'recommended') return v;
    const arm: DefaultArm = Math.random() < 0.5 ? 'cheapest' : 'recommended';
    localStorage.setItem(KEY, arm);
    return arm;
  } catch { return 'cheapest'; }
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
